import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus, Invoice as PrismaInvoice, Subscription as PrismaSubscription } from '@prisma/client';


@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY')!, {
      //apiVersion: '2024-06-20',
    });
  }

  private async getLatestSubscription(userId: number) {
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { id: 'desc' },
      include: { plan: true },
    });
  }

  async mySubscription(userId: number) {
    const sub = await this.getLatestSubscription(userId);
    if (!sub) return { exists: false };

    return {
      exists: true,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
      planName: sub.plan?.name,
    };
  }

  async cancelAtPeriodEnd(userId: number) {
    const sub = await this.getLatestSubscription(userId);
    if (!sub) throw new NotFoundException('Subscription not found');
    if (!sub.stripeSubscriptionId) throw new BadRequestException('Missing stripeSubscriptionId');

   const updated = (await this.stripe.subscriptions.update(
  sub.stripeSubscriptionId,
  { cancel_at_period_end: true },
)) as any;

const cpe = updated.current_period_end ? new Date(updated.current_period_end * 1000) : null;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: (updated as any).current_period_end
          ? new Date((updated as any).current_period_end * 1000)
          : sub.currentPeriodEnd,
      },
    });

    return { ok: true, cancelAtPeriodEnd: true };
  }

  async resume(userId: number) {
    const sub = await this.getLatestSubscription(userId);
    if (!sub) throw new NotFoundException('Subscription not found');
    if (!sub.stripeSubscriptionId) throw new BadRequestException('Missing stripeSubscriptionId');

    const updated = (await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })) as Stripe.Subscription; // ✅ CAST

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: (updated as any).current_period_end
          ? new Date((updated as any).current_period_end * 1000)
          : sub.currentPeriodEnd,
      },
    });

    return { ok: true, cancelAtPeriodEnd: false };
  }

  async createCustomerPortal(userId: number, returnUrl: string) {
    const sub = await this.getLatestSubscription(userId);
    if (!sub?.stripeCustomerId) throw new BadRequestException('Missing stripeCustomerId');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Helper: όταν θες να “ρίξεις” τον user σε unpaid limits
   * (το Stripe θα το κάνει μόνο του via webhook, αλλά το κρατάμε εδώ αν θες manual).
   */
  async markUnpaidByStripeSubscriptionId(stripeSubscriptionId: string) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId },
      data: { status: SubscriptionStatus.unpaid },
    });
  }

async handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'invoice.payment_failed': {
const inv = event.data.object as any;

const stripeSubId =
  typeof inv.subscription === 'string'
    ? inv.subscription
    : inv.subscription?.id;

      if (!stripeSubId) return;

      const attemptCount = inv.attempt_count ?? 1;

      await this.prisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: {
          status:
            attemptCount >= 3
              ? SubscriptionStatus.unpaid
              : SubscriptionStatus.past_due,
        },
      });

      return;
    }

 case 'invoice.payment_succeeded': {
  const inv = event.data.object as any; // ✅

  const stripeSubId =
    typeof inv.subscription === 'string'
      ? inv.subscription
      : inv.subscription?.id;

  if (!stripeSubId) return;

  await this.prisma.subscription.updateMany({
    where: { stripeSubscriptionId: stripeSubId },
    data: { status: SubscriptionStatus.active },
  });

  return;
}

   case 'customer.subscription.updated':
case 'customer.subscription.deleted': {
  const sub = event.data.object as any; // ✅

  const mappedStatus =
    sub.status === 'active'
      ? SubscriptionStatus.active
      : sub.status === 'past_due'
      ? SubscriptionStatus.past_due
      : sub.status === 'unpaid'
      ? SubscriptionStatus.unpaid
      : SubscriptionStatus.canceled;

  await this.prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: mappedStatus,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
    },
  });

  return;
}
  }
}
  
}

