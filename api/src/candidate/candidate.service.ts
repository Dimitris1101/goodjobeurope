import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, JobStatus, JobSector } from '@prisma/client';

@Injectable()
export class CandidateService {
  constructor(private prisma: PrismaService) {}

  async getMatchupsByUserId(
    userId: number,
    limit = 30,
    filters?: {
      placeIdsCsv?: string;
      locationsCsv?: string;
      sectorsCsv?: string;
      sectorOtherText?: string;
    },
  ) {
    const me = await this.prisma.candidate.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('Candidate profile not found');

    // Αποκλείουμε ό,τι έχει κάνει ήδη swipe
    const swiped = await this.prisma.jobSwipe.findMany({
      where: { candidateId: me.id },
      select: { jobId: true },
    });
    const excludeIds = swiped.map((r) => r.jobId);

    const and: Prisma.JobWhereInput[] = [{ status: JobStatus.PUBLISHED }];
    if (excludeIds.length) and.push({ id: { notIn: excludeIds } });

    // --- Τομείς (required από controller) ---
    const sectors = (filters?.sectorsCsv ?? '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean) as JobSector[];

    if (sectors.length) {
      // Αν υπάρχει OTHER, κάνουμε ειδικό χειρισμό
      const hasOther = sectors.includes('OTHER' as JobSector);
      const normalSectors = sectors.filter((s) => s !== ('OTHER' as JobSector));
      const sectorOr: Prisma.JobWhereInput[] = [];

      if (normalSectors.length) {
        sectorOr.push({ sector: { in: normalSectors } as any });
      }
      if (hasOther) {
        if (filters?.sectorOtherText?.trim()) {
          sectorOr.push({
            AND: [
              { sector: 'OTHER' as any },
              {
                sectorOtherText: {
                  contains: filters.sectorOtherText.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          });
        } else {
          sectorOr.push({ sector: 'OTHER' as any });
        }
      }

      if (sectorOr.length) and.push({ OR: sectorOr });
    }

    // --- Τοποθεσία (required από controller) ---
    const placeIds = (filters?.placeIdsCsv ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const locTexts = (filters?.locationsCsv ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const locOr: Prisma.JobWhereInput[] = [];

    // 1) match με normalized placeId
    if (placeIds.length) {
      locOr.push({ locationPlaceId: { in: placeIds } });
    }

    // 2) fallback: text contains
    for (const t of locTexts) {
      locOr.push({ locationText: { contains: t, mode: 'insensitive' } });
      locOr.push({ location: { contains: t, mode: 'insensitive' } }); // legacy
    }

    if (locOr.length) {
      and.push({ OR: locOr });
    }

    const jobs = await this.prisma.job.findMany({
      where: { AND: and },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { company: { select: { name: true, logoUrl: true } } },
    });

    return jobs.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      location: j.locationText || j.location || null,
      workMode: j.workMode,
      requireLicenseA: j.requireLicenseA,
      requireLicenseM: j.requireLicenseM,
      skills: j.skills, // κρατάμε για εμφάνιση μόνο
      company: { name: j.company?.name, logoUrl: j.company?.logoUrl },
      createdAt: j.createdAt,
    }));
  }

  /* ✅ Κρατάω ΚΑΙ την παλιά σου (αν τη χρειάζεσαι κάπου)
  async getMatchupsByUserId(userId: number, limit = 30) {
    const me = await this.prisma.candidate.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('Candidate profile not found');

    // απλό fallback: δημοσιευμένες αγγελίες
    return this.prisma.job.findMany({
      where: { status: JobStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, title: true, description: true, skills: true, workMode: true,
        location: true, locationText: true, locationCity: true, locationCountryCode: true,
        company: { select: { name: true, logoUrl: true } },
        createdAt: true,
      },
    });
  }*/

  async swipeJob(userId: number, dto: { jobId: number; decision: 'LIKE' | 'PASS' }) {
    const me = await this.prisma.candidate.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('Candidate profile not found');

    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Job not found');

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { id: 'desc' },
      include: { plan: true },
    });
    const rawName = sub?.plan?.name ?? 'FREE_MEMBER';
    const isVip = typeof rawName === 'string' && rawName.toUpperCase().includes('VIP');

    if (!isVip && dto.decision === 'LIKE') {
      const used = await this.prisma.jobSwipe.count({
        where: { candidateId: me.id, decision: 'LIKE' },
      });
      if (used >= 10) {
        throw new ForbiddenException('Έχεις φτάσει το όριο των 10 Likes στο δωρεάν πλάνο.');
      }
    }

    await this.prisma.jobSwipe.upsert({
      where: { candidateId_jobId: { candidateId: me.id, jobId: dto.jobId } },
      update: { decision: dto.decision },
      create: { candidateId: me.id, jobId: dto.jobId, decision: dto.decision },
    });

    return { ok: true };
  }

  async getMyLikesByUserId(userId: number) {
    const me = await this.prisma.candidate.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('Candidate profile not found');

    const rows = await this.prisma.jobSwipe.findMany({
      where: { candidateId: me.id, decision: 'LIKE' },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            createdAt: true,
            company: { select: { name: true, logoUrl: true } },
          },
        },
      },
    });

    return rows.map((r) => ({
      jobId: r.job.id,
      title: r.job.title,
      companyName: r.job.company?.name ?? '',
      companyLogoUrl: r.job.company?.logoUrl ?? null,
      location: r.job.location ?? '',
      createdAt: r.createdAt,
    }));
  }

  /** 🔹 ΝΕΟ: Επιστρέφει τα ratings που έχουν βάλει οι εταιρείες στον υποψήφιο */
  async listCompanyRatingsByUserId(userId: number) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!candidate) {
      throw new ForbiddenException('Candidate profile not found');
    }

    const rows = await this.prisma.jobSwipe.findMany({
      where: {
        candidateId: candidate.id,
        companyRating: { not: null },
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      jobId: r.job.id,
      jobTitle: r.job.title,
      companyName: r.job.company?.name ?? '',
      rating: r.companyRating!, // πάντα όχι null εδώ
      ratedAt: r.createdAt,
    }));
  }
}
