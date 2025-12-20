import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CompanyPlan, JobStatus, JobWorkMode, SwipeDecision } from '@prisma/client';
import { LocationService } from '../location/location.service';

/*const normSkill = (s: string) =>
  (s ?? '')
    .normalize('NFKC')      // λύνει unicode edge-cases
    .toLowerCase()          // case-insensitive
    .replace(/\s+/g, ' ')   // συμπύκνωση κενών
    .trim();*/

const normSkill = (s: any): string => {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFD')                // διαχωρισμός διακριτικών
    .replace(/\p{Diacritic}/gu, '')  // αφαίρεση διακριτικών (τόνοι κ.λπ.)
    .toLowerCase()                   // lower
    .replace(/\s+/g, ' ')            // συμπίεση κενών
    .replace(/[^\p{L}\p{N}\s#+.+-]/gu, '') // καθάρισμα περίεργων συμβόλων
    .trim();
};

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  private planDefaultLimit(plan: CompanyPlan): number | 'UNLIMITED' {
    switch (plan) {
      case CompanyPlan.SIMPLE:
        return 5;
      case CompanyPlan.SILVER:
        return 10;
      case CompanyPlan.GOLDEN:
        return 'UNLIMITED';
    }
  }

  private async getCompanyIdByUserId(userId: number): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!company) throw new ForbiddenException('Company profile not found');
    return company.id;
  }

  async getMyJobsLite(userId: number) {
    const company = await this.prisma.company.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!company) throw new ForbiddenException('Company profile not found');

    return this.prisma.job.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });
  }

  async setJobLocationById(userId: number, jobId: number, placeId: string) {
    const companyId = await this.getCompanyIdByUserId(userId);
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { companyId: true },
    });
    if (!job || job.companyId !== companyId) throw new ForbiddenException('Not your job');

    const p = await this.locationService.resolvePlaceId(placeId);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        // κρατάμε ΚΑΙ το legacy location για ορατότητα όπου χρειάζεται
        location: p.fullText,
        locationPlaceId: p.placeId,
        locationLat: p.lat,
        locationLng: p.lng,
        locationCity: p.city,
        locationAdmin: p.adminArea,
        locationCountryCode: p.countryCode,
        locationCountryName: p.countryName,
        locationText: p.fullText,
      },
      select: {
        id: true,
        title: true,
        location: true,
        locationText: true,
        locationCity: true,
        locationCountryCode: true,
      },
    });

    return updated;
  }

  /** Υποψήφιοι που έκαναν LIKE σε συγκεκριμένη αγγελία (με βασικά πεδία) */
  async getLikesForJob(userId: number, jobId: number) {
    const company = await this.prisma.company.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!company) throw new ForbiddenException('Company profile not found');

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, companyId: true, title: true },
    });
    if (!job || job.companyId !== company.id) {
      throw new ForbiddenException('This job does not belong to your company.');
    }

    const rows = await this.prisma.jobSwipe.findMany({
      where: { jobId, decision: SwipeDecision.LIKE },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            location: true, // legacy display
            headline: true,
            about: true,
            avatarUrl: true,
            cvUrl: true,
            skillsText: true,
            languages: { select: { name: true, level: true } },
            // ⬇️ ΝΕΟ: προτιμήσεις τοποθεσίας (μόνο κείμενο εμφάνισης)
            locationPrefs: {
              select: { text: true, priority: true, createdAt: true },
              orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
            },
          },
        },
      },
    });

    return rows.map((r) => {
      const c = r.candidate;
      const skills = (c.skillsText ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const searchAreas = (c.locationPrefs ?? [])
        .map((p) => p.text)
        .filter(Boolean);

      return {
        createdAt: r.createdAt,
        candidateId: c.id,
        name: c.name ?? '',
        location: c.location ?? '',
        headline: c.headline ?? '',
        about: c.about ?? '',
        avatarUrl: c.avatarUrl ?? null,
        cvUrl: c.cvUrl ?? null,
        skills,
        languages: (c.languages ?? []).map((l) => ({ name: l.name, level: l.level })),
        searchAreas,
        companyRating: r.companyRating ?? null, // 🆕 rating αν υπάρχει
      };
    });
  }

  async getJobCountersByUserId(userId: number) {
    const companyId = await this.getCompanyIdByUserId(userId);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true, jobLimitOverride: true },
    });
    if (!company) throw new ForbiddenException('Company not found');

    const activeCount = await this.prisma.job.count({
      where: {
        companyId,
        status: { in: [JobStatus.PUBLISHED, JobStatus.DRAFT] },
      },
    });

    const baseLimit = company.jobLimitOverride ?? this.planDefaultLimit(company.plan);
    const total = baseLimit === 'UNLIMITED' ? Number.POSITIVE_INFINITY : baseLimit;
    const remaining =
      baseLimit === 'UNLIMITED' ? Number.POSITIVE_INFINITY : Math.max(total - activeCount, 0);

    return {
      plan: company.plan,
      totalAllowed: baseLimit,
      activeCount,
      remaining,
    };
  }

  async setJobLocationByUserId(
    userId: number,
    jobId: number,
    p: {
      placeId: string;
      lat: number;
      lng: number;
      city?: string | null;
      adminArea?: string | null;
      countryCode?: string | null;
      countryName?: string | null;
      fullText?: string | null;
    },
  ) {
    const companyId = await this.getCompanyIdByUserId(userId);
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { companyId: true },
    });
    if (!job || job.companyId !== companyId) {
      throw new ForbiddenException('This job does not belong to your company.');
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        // legacy text το αφήνουμε null (ή κράτα ό,τι θες)
        location: null,
        locationPlaceId: p.placeId,
        locationLat: p.lat,
        locationLng: p.lng,
        locationCity: p.city ?? null,
        locationAdmin: p.adminArea ?? null,
        locationCountryCode: p.countryCode ?? null,
        locationCountryName: p.countryName ?? null,
        locationText: p.fullText ?? null,
      },
      select: {
        id: true,
        locationText: true,
        locationCity: true,
        locationCountryCode: true,
      },
    });
  }

  async listJobsByUserId(userId: number, status?: JobStatus) {
    const companyId = await this.getCompanyIdByUserId(userId);
    return this.prisma.job.findMany({
      where: {
        companyId,
        ...(status ? { status } : { status: { not: JobStatus.ARCHIVED } }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        location: true,
        locationText: true,
        locationCity: true,
        locationCountryCode: true,
        status: true,
        createdAt: true,
        workMode: true,
        requireLicenseA: true,
        requireLicenseM: true,
        skills: true,
        sector: true,
        sectorOtherText: true,
        preferredLanguage: true,
        preferredLangLevel: true,
      },
    });
  }

  async createJobByUserId(
    userId: number,
    data: {
      title: string;
      description: string;
      workMode: JobWorkMode;
      requireLicenseA: boolean;
      requireLicenseM: boolean;
      skills: string[];
      status?: JobStatus;
      location?: string;

      // ⬇️ νέα προαιρετικά
      sector?: any; // JobSector | string
      sectorOtherText?: string;
      preferredLanguage?: string;
      preferredLangLevel?: string;
    },
  ) {
    const companyId = await this.getCompanyIdByUserId(userId);

    const c = await this.getJobCountersByUserId(userId);
    if (c.totalAllowed !== 'UNLIMITED' && c.remaining <= 0) {
      throw new ForbiddenException('Έχεις εξαντλήσει τις διαθέσιμες αγγελίες του πλάνου.');
    }

    const normSkills = (data.skills ?? [])
      .map((s) => (s ?? '').trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());

    return this.prisma.job.create({
      data: {
        companyId,
        title: data.title,
        description: data.description,
        location: data.location ?? null, // legacy label
        status: data.status ?? JobStatus.PUBLISHED,
        workMode: data.workMode,
        requireLicenseA: data.requireLicenseA,
        requireLicenseM: data.requireLicenseM,
        skills: normSkills,

        // ⬇️ νέα πεδία
        sector: data.sector ?? null,
        sectorOtherText: data.sector === 'OTHER' ? data.sectorOtherText ?? null : null,
        preferredLanguage: data.preferredLanguage ?? null,
        preferredLangLevel: data.preferredLangLevel ?? null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        location: true,
        locationText: true,
        locationCity: true,
        locationCountryCode: true,
        workMode: true,
        requireLicenseA: true,
        requireLicenseM: true,
        skills: true,

        // ⬇️ useful για UI
        sector: true,
        sectorOtherText: true,
        preferredLanguage: true,
        preferredLangLevel: true,
      },
    });
  }

  async archiveJobByUserId(userId: number, jobId: number) {
    const companyId = await this.getCompanyIdByUserId(userId);
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.companyId !== companyId) throw new ForbiddenException('Not your job');

    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.ARCHIVED },
      select: { id: true, status: true },
    });
  }

  /** (Παραμένει διαθέσιμο αν το χρειαστείς αργότερα) προτεινόμενοι υποψήφιοι για job */
  async getMatchCandidatesByJob(userId: number, jobId: number, limit = 20) {
    const companyId = await this.getCompanyIdByUserId(userId);
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: {
        id: true,
        workMode: true,
        // normalized location
        locationCity: true,
        locationCountryCode: true,
        // requirements
        requireLicenseA: true,
        requireLicenseM: true,
        skills: true, // String[]
      },
    });
    if (!job) throw new ForbiddenException('Job not found');

    const swiped = await this.prisma.jobSwipe.findMany({
      where: { jobId: job.id },
      select: { candidateId: true },
    });

    const where: any = { id: { notIn: swiped.map((s) => s.candidateId) } };

    // φιλτράρουμε τοποθεσία μόνο αν δεν είναι REMOTE
    if (job.workMode !== JobWorkMode.REMOTE) {
      if (job.locationCountryCode) where.locationCountryCode = job.locationCountryCode;
      if (job.locationCity)
        where.locationCity = { equals: job.locationCity, mode: 'insensitive' as any };
    }
    if (job.requireLicenseA) where.driverLicenseA = true;
    if (job.requireLicenseM) where.driverLicenseM = true;

    const candidates = await this.prisma.candidate.findMany({
      where,
      include: { skills: { include: { skill: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    // ✅ job skills normalized
    const req = new Set((job.skills ?? []).map(normSkill).filter(Boolean));

    const good = candidates.filter((c) => {
      const names = new Set<string>();

      // relation skills normalized
      for (const cs of c.skills ?? []) {
        if (cs?.skill?.name) names.add(normSkill(cs.skill.name));
      }

      // free-text normalized
      (c.skillsText ?? '')
        .split(',')
        .map(normSkill)
        .filter(Boolean)
        .forEach((s) => names.add(s));

      // πρέπει να υπάρχουν ΟΛΑ τα req skills
      for (const s of req) if (!names.has(s)) return false;
      return true;
    });

    return good.slice(0, limit).map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      headline: c.headline,
      avatarUrl: c.avatarUrl,
      // επιστρέφουμε όπως πριν (χωρίς forced lower-case για εμφάνιση)
      skills: Array.from(
        new Set([
          ...(c.skills ?? []).map((cs) => cs.skill.name).filter(Boolean),
          ...(c.skillsText ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        ]),
      ),
    }));
  }

  /** Καταγραφή swipe (LIKE ή PASS) για συγκεκριμένο candidate σε συγκεκριμένη αγγελία. */
  async swipeCandidate(
    userId: number,
    jobId: number,
    candidateId: number,
    decision: SwipeDecision,
  ) {
    const companyId = await this.getCompanyIdByUserId(userId);
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true },
    });
    if (!job) throw new ForbiddenException('Job not found');

    await this.prisma.jobSwipe.upsert({
      where: { candidateId_jobId: { candidateId, jobId: job.id } },
      update: { decision },
      create: { jobId: job.id, candidateId, decision },
    });

    return { ok: true };
  }

  /** Λίστα θετικών (LIKE) με βασικές πληροφορίες αγγελίας & υποψηφίου. */
 async listLikedByUserId(userId: number) {
  const companyId = await this.getCompanyIdByUserId(userId);

  const likes = await this.prisma.jobSwipe.findMany({
    where: { decision: SwipeDecision.LIKE, job: { companyId } },
    include: {
      job: { select: { id: true, title: true } },
      candidate: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,

          // ✅ home/base location fields
          locationCity: true,
          locationCountryCode: true,

          // (κρατάμε και το legacy για fallback)
          location: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return likes.map((l) => {
    const c = l.candidate;

    // ✅ ΠΡΩΤΑ home/base από normalized
    const home =
      c.locationCity && c.locationCountryCode
        ? `${c.locationCity}, ${c.locationCountryCode}`
        : c.locationCity
        ? c.locationCity
        : c.locationCountryCode
        ? c.locationCountryCode
        : null;

    return {
      jobId: l.job.id,
      jobTitle: l.job.title,
      candidateId: c.id,
      candidateName: c.name,
      candidateLocation: home ?? c.location ?? null, // fallback
      avatarUrl: c.avatarUrl,
      createdAt: l.createdAt,
      companyRating: l.companyRating ?? null,
    };
  });
}

  /** Αποθήκευση βαθμολογίας 1–5 για συγκεκριμένο job+candidate */
  async rateCandidate(
    userId: number,
    jobId: number,
    candidateId: number,
    rating: number,
  ) {
    const companyId = await this.getCompanyIdByUserId(userId);
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true },
    });
    if (!job) {
      throw new ForbiddenException('Job not found');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5.');
    }

    // Πρέπει να υπάρχει swipe = LIKE
    const swipe = await this.prisma.jobSwipe.findUnique({
      where: { candidateId_jobId: { candidateId, jobId: job.id } },
    });

    if (!swipe || swipe.decision !== SwipeDecision.LIKE) {
      throw new ForbiddenException('You can rate only candidates you have liked.');
    }

    const updated = await this.prisma.jobSwipe.update({
      where: { candidateId_jobId: { candidateId, jobId: job.id } },
      data: { companyRating: rating },
      select: {
        jobId: true,
        candidateId: true,
        companyRating: true,
      },
    });

    return updated;
  }

  async ensureCompany(userId: number): Promise<number> {
    return this.getCompanyIdByUserId(userId); // θα ρίξει Forbidden αν δεν υπάρχει
  }

  /** Δημόσια στοιχεία υποψηφίου για popup (headline, skills, cv) */
  async getCandidatePublic(candidateId: number) {
    const c = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        location: true,
        headline: true,
        avatarUrl: true,
        cvUrl: true,
        skillsText: true,
        skills: { include: { skill: true } }, // relations
      },
    });
    if (!c) throw new NotFoundException('Candidate not found');

    const fromRel = (c.skills ?? []).map((cs) => cs.skill.name).filter(Boolean);
    const fromText = (c.skillsText ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const skills = Array.from(new Set<string>([...fromRel, ...fromText]));

    return {
      id: c.id,
      name: c.name,
      location: c.location,
      headline: c.headline,
      avatarUrl: c.avatarUrl,
      cvUrl: c.cvUrl,
      skills,
    };
  }
}
