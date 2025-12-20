import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SubscriptionStatus, Role } from '@prisma/client';

@Injectable()
export class SubscriptionLockGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { sub?: number; role?: Role } | undefined;

    // Αν δεν υπάρχει logged-in user, δεν ασχολούμαστε εδώ
    if (!user?.sub) return true;

    // Θέλεις lock ΜΟΝΟ για εταιρείες (όπως είπες).
    if (user.role !== Role.COMPANY) return true;

    const path: string = req.route?.path || req.path || '';
    const baseUrl: string = req.baseUrl || '';

    // ✅ Allowlist routes για να μπορεί να πληρώσει / ξεκλειδώσει
    const full = `${baseUrl}${path}`; // πχ /billing/cancel
    const allowedPrefixes = [
      '/billing',       // allow όλα τα billing endpoints
      '/webhooks/stripe' // webhook πρέπει να περνάει
    ];

    if (allowedPrefixes.some(p => full.startsWith(p))) {
      return true;
    }

    // παίρνουμε latest subscription
    const sub = await this.prisma.subscription.findFirst({
      where: { userId: user.sub },
      orderBy: { id: 'desc' },
      select: { status: true },
    });

    // Αν δεν έχει subscription row, άστο (ή κόψτο αν θες)
    if (!sub) return true;

    // ❌ Αν unpaid => lock everything else
    if (sub.status === SubscriptionStatus.unpaid) {
      return false;
    }

    return true;
  }
}
