import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from './chat.gateway';
import { MailerService } from '../mailer.service';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: ChatGateway,
    private mailer: MailerService,
  ) {}

  private async getCompanyIdByUserId(userId: number) {
    const company = await this.prisma.company.findFirst({
      where: { userId: Number(userId) },
      select: { id: true },
    });
    return company?.id ?? null;
  }

  private async getCandidateIdByUserId(userId: number) {
    const cand = await this.prisma.candidate.findFirst({
      where: { userId: Number(userId) },
      select: { id: true },
    });
    return cand?.id ?? null;
  }

  async ensureParticipant(conversationId: number, userId: number) {
    const [companyId, candidateId] = await Promise.all([
      this.getCompanyIdByUserId(userId),
      this.getCandidateIdByUserId(userId),
    ]);

    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');

    const isCompany = !!companyId && conv.companyId === companyId;
    const isCandidate = !!candidateId && conv.candidateId === candidateId;

    if (!isCompany && !isCandidate) {
      throw new ForbiddenException('Not a participant');
    }

    return { conv, isCompany, isCandidate, companyId, candidateId };
  }

  async unreadCount(userId: number) {
    const [companyId, candidateId] = await Promise.all([
      this.getCompanyIdByUserId(userId),
      this.getCandidateIdByUserId(userId),
    ]);
    if (!companyId && !candidateId) return { total: 0, byConversation: {} as Record<number, number> };

    const whereConv = companyId ? { companyId } : { candidateId: candidateId! };
    const convs = await this.prisma.conversation.findMany({ where: whereConv, select: { id: true } });
    if (!convs.length) return { total: 0, byConversation: {} };

    const ids = convs.map(c => c.id);

    const unread = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: ids },
        readAt: null,
        senderUserId: { not: userId },
      },
      _count: { _all: true },
    });

    const byConversation: Record<number, number> = {};
    let total = 0;
    unread.forEach(u => {
      byConversation[u.conversationId] = u._count._all;
      total += u._count._all;
    });

    return { total, byConversation };
  }

  async markRead(conversationId: number, userId: number) {
    await this.ensureParticipant(conversationId, userId);
    await this.prisma.message.updateMany({
      where: { conversationId, readAt: null, senderUserId: { not: userId } },
      data: { readAt: new Date() },
    });

    const agg = await this.unreadCount(userId);
    this.gateway.emitBadgeUpdate(userId, agg);
    return { ok: true };
  }

  async listForUser(userId: number) {
    const [companyId, candidateId] = await Promise.all([
      this.getCompanyIdByUserId(userId),
      this.getCandidateIdByUserId(userId),
    ]);
    if (!companyId && !candidateId) return [];

    const where = companyId ? { companyId } : { candidateId: candidateId! };

    const list = await this.prisma.conversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const companyIds = Array.from(new Set(list.map(c => c.companyId)));
    const candidateIds = Array.from(new Set(list.map(c => c.candidateId)));
    await this.unreadCount(userId); // (αν το χρειάζεσαι στο UI, μπορείς να το επιστρέψεις)

    const [companies, candidates] = await Promise.all([
      companyIds.length
        ? this.prisma.company.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true, logoUrl: true },
          })
        : Promise.resolve([]),
      candidateIds.length
        ? this.prisma.candidate.findMany({
            where: { id: { in: candidateIds } },
            select: { id: true, name: true, avatarUrl: true },
          })
        : Promise.resolve([]),
    ]);

    const companyMap = new Map(companies.map(x => [x.id, x]));
    const candidateMap = new Map(candidates.map(x => [x.id, x]));

    return list.map(c => {
      const last = c.messages[0] ?? null;
      const comp = companyMap.get(c.companyId) ?? null;
      const cand = candidateMap.get(c.candidateId) ?? null;

      return {
        id: c.id,
        lastMessage: last
          ? {
              text: last.text,
              createdAt: (last.createdAt as any),
              senderUserId: last.senderUserId,
            }
          : null,
        company: comp ? { name: comp.name, logoUrl: comp.logoUrl } : null,
        candidate: cand ? { name: cand.name, avatarUrl: cand.avatarUrl } : null,
      };
    });
  }

  async getMessages(conversationId: number, userId: number) {
    await this.ensureParticipant(conversationId, userId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(conversationId: number, senderUserId: number, text: string) {
    if (!text?.trim()) throw new ForbiddenException('Empty text');
    const { conv } = await this.ensureParticipant(conversationId, senderUserId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderUserId, text: text.trim() },
    });

    this.gateway.emitNewMessage(conversationId, message);

    // Βρες recipient και ενημέρωσε badge / email αν offline
    const [companyByUser, candidateByUser] = await Promise.all([
      this.prisma.company.findFirst({ where: { userId: senderUserId }, select: { id: true } }),
      this.prisma.candidate.findFirst({ where: { userId: senderUserId }, select: { id: true } }),
    ]);

    // Προς candidate
    if (companyByUser?.id === conv.companyId) {
      const cand = await this.prisma.candidate.findUnique({
        where: { id: conv.candidateId },
        select: { userId: true, user: { select: { email: true } } },
      });
      const recipientUserId = cand?.userId ?? null;
      if (recipientUserId) {
        const agg = await this.unreadCount(recipientUserId);
        this.gateway.emitBadgeUpdate(recipientUserId, agg);

        const online = this.gateway.isUserOnline(recipientUserId);
        if (!online && cand?.user?.email) await this.sendUnreadEmail(cand.user.email, conversationId);
      }
    }

    // Προς company
    if (candidateByUser?.id === conv.candidateId) {
      const comp = await this.prisma.company.findUnique({
        where: { id: conv.companyId },
        select: { userId: true, user: { select: { email: true } } },
      });
      const recipientUserId = comp?.userId ?? null;
      if (recipientUserId) {
        const agg = await this.unreadCount(recipientUserId);
        this.gateway.emitBadgeUpdate(recipientUserId, agg);

        const online = this.gateway.isUserOnline(recipientUserId);
        if (!online && comp?.user?.email) await this.sendUnreadEmail(comp.user.email, conversationId);
      }
    }

    return message;
  }

  async markAllReadForUser(userId: number) {
  // βρες αν είναι company ή/και candidate (όπως ήδη κάνεις)
  const [companyId, candidateId] = await Promise.all([
    this.getCompanyIdByUserId(userId),
    this.getCandidateIdByUserId(userId),
  ]);

  // αν δεν έχει profile, απλά ok
  if (!companyId && !candidateId) return { ok: true };

  // φέρε όλες τις related conversations
  const whereConv = companyId ? { companyId } : { candidateId: candidateId! };
  const convs = await this.prisma.conversation.findMany({
    where: whereConv,
    select: { id: true },
  });
  if (!convs.length) {
    // ενημέρωσε badge για να σβήσει ο δείκτης παντού
    this.gateway.emitBadgeUpdate(userId, { total: 0, byConversation: {} });
    return { ok: true };
  }

  const ids = convs.map(c => c.id);

  // κάνε όλα τα μηνύματα "διαβασμένα" εκτός από αυτά που έστειλε ο ίδιος
  await this.prisma.message.updateMany({
    where: {
      conversationId: { in: ids },
      readAt: null,
      senderUserId: { not: userId },
    },
    data: { readAt: new Date() },
  });

  // ξαναυπολόγισε και στείλε badge update (θα είναι 0)
  const agg = await this.unreadCount(userId);
  this.gateway.emitBadgeUpdate(userId, agg);

  return { ok: true };
  }


  private async sendUnreadEmail(email: string, conversationId: number) {
    try {
      const appUrl = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000';
      const link = `${appUrl}/auth/login?redirect=${encodeURIComponent('/messenger?c=' + conversationId)}`;
      await this.mailer.sendMail({
        to: email,
        subject: 'You have unread messages',
        html: `<p>You have unread messages on JobMatch.</p><p><a href="${link}">Log in</a> to read and reply.</p>`,
      });
    } catch {
      // μην ρίξεις το request αν αποτύχει το email
    }
  }
}