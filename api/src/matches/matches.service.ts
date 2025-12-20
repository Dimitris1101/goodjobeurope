import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}



  private todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

private async getActivePlan(userId: number) {
  const sub = await this.prisma.subscription.findFirst({
    where: { userId, status: 'active' },
    orderBy: { id: 'desc' },
    include: { plan: true },
  });
  return sub?.plan ?? null;
}

private async enforceCompanyMatchupsLimit(userId: number) {
  const plan = await this.getActivePlan(userId);
  const limit = (plan as any)?.companyMatchupsPerDay as number | null | undefined;

  if (limit === null || limit === undefined) return; // unlimited or not set

  const day = this.todayKey();
  const usage = await this.prisma.dailyUsage.upsert({
    where: { userId_day: { userId, day } },
    update: {},
    create: { userId, day },
  });

  if (usage.companyMatchups >= limit) {
    throw new ForbiddenException(`Daily matchups limit reached (${limit}/day).`);
  }

  await this.prisma.dailyUsage.update({
    where: { userId_day: { userId, day } },
    data: { companyMatchups: { increment: 1 } },
  });
}


  private async getCompanyIdByUserId(userId: number) {
    if (!userId) throw new UnauthorizedException('No user id');
    // ⚠️ findFirst αντί για findUnique, γιατί userId συνήθως ΔΕΝ είναι @unique
    const company = await this.prisma.company.findFirst({
      where: { userId: Number(userId) },
      select: { id: true },
    });
    if (!company) throw new ForbiddenException('Company profile not found');
    return company.id;
  }

  async acceptMatch(matchId: number, userId: number) {
    const companyId = await this.getCompanyIdByUserId(userId);

    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    if (match.companyId !== companyId) throw new ForbiddenException('Not your match');

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'ACCEPTED' },
    });

    let conv = await this.prisma.conversation.findUnique({ where: { matchId: updated.id } });
    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          matchId: updated.id,
          companyId: updated.companyId,
          candidateId: updated.candidateId,
        },
      });
    }
    return { conversationId: conv.id };
  }

  async acceptByPair(jobId: number, candidateId: number, userId: number) {
  const companyId = await this.getCompanyIdByUserId(userId);

  // Βρες ή φτιάξε Match για το συγκεκριμένο ζευγάρι
  let match = await this.prisma.match.findFirst({
    where: { jobId, candidateId, companyId },
  });

  if (!match) {
    match = await this.prisma.match.create({
      data: {
        jobId,
        companyId,
        candidateId,
        status: 'ACCEPTED',
      },
    });
  } else if (match.companyId !== companyId) {
    throw new ForbiddenException('Not your match');
  } else if (match.status !== 'ACCEPTED') {
    match = await this.prisma.match.update({
      where: { id: match.id },
      data: { status: 'ACCEPTED' },
    });
  }

  // ✅ ΜΗΝ ανοίξεις δεύτερη συνομιλία για ίδιο company+candidate
  const existing = await this.prisma.conversation.findFirst({
    where: { companyId, candidateId },
  });
  if (existing) {
    return { conversationId: existing.id };
  }

  // Αλλιώς upsert με βάση matchId (αν υπάρχει)
  const conv = await this.prisma.conversation.upsert({
    where: { matchId: match.id },
    update: {},
    create: {
      matchId: match.id,
      companyId: match.companyId,
      candidateId: match.candidateId,
    },
  });

  return { conversationId: conv.id };
}
}