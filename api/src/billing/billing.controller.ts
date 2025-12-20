import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import Stripe from 'stripe';
import {
  Role,
  InvoiceStatus,
  InvoiceSeries,
  CompanyPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EtimologieraProviderService } from '../provider/etimologiera-provider.service';
import { CreateCheckoutSessionDto } from './create-checkout-session.dto';
import { getStripePriceId, PlanCanonical } from './stripe-plans.util';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MailerService } from '../mailer.service';
import { BillingService } from './billing.service';

function toCompanyPlan(p: PlanCanonical): CompanyPlan | null {
  switch (p) {
    case 'COMPANY_SILVER_YEAR':
      return CompanyPlan.SILVER;

    case 'COMPANY_GOLDEN_MONTH':
    case 'COMPANY_PLATINUM_MONTH':
    case 'COMPANY_GOLDEN_YEAR':
    case 'COMPANY_PLATINUM_YEAR':
      return CompanyPlan.GOLDEN;

    default:
      return null;
  }
}

function planDefaults(name: PlanCanonical): { adsEnabled: boolean; priceCents: number } {
  switch (name) {
    case 'VIP_MEMBER':
      return { adsEnabled: false, priceCents: 0 };
    case 'FREE_MEMBER':
      return { adsEnabled: true, priceCents: 0 };

    case 'COMPANY_BASIC':
      return { adsEnabled: true, priceCents: 0 };

    case 'COMPANY_GOLDEN_MONTH':
      return { adsEnabled: false, priceCents: 2000 };
    case 'COMPANY_PLATINUM_MONTH':
      return { adsEnabled: false, priceCents: 4000 };

    case 'COMPANY_SILVER_YEAR':
      return { adsEnabled: true, priceCents: 50000 };
    case 'COMPANY_GOLDEN_YEAR':
      return { adsEnabled: false, priceCents: 70000 };
    case 'COMPANY_PLATINUM_YEAR':
      return { adsEnabled: false, priceCents: 90000 };

    default:
      return { adsEnabled: true, priceCents: 0 };
  }
}

@Controller('billing')
export class BillingController {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  constructor(
    private prisma: PrismaService,
    private etimologiera: EtimologieraProviderService,
    private mailer: MailerService,
    private billingService: BillingService,
  ) {}

  // ---------------------------
  // ✅ Subscription management
  // ---------------------------

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@CurrentUser() user: { sub: number }) {
    return this.billingService.mySubscription(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@CurrentUser() user: { sub: number }) {
    return this.billingService.cancelAtPeriodEnd(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resume')
  resume(@CurrentUser() user: { sub: number }) {
    return this.billingService.resume(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('portal')
  portal(
    @CurrentUser() user: { sub: number },
    @Body() body: { returnUrl: string },
  ) {
    if (!body?.returnUrl) throw new BadRequestException('returnUrl is required');
    return this.billingService.createCustomerPortal(user.sub, body.returnUrl);
  }

  // ---------------------------
  // 1️⃣ Create Checkout Session
  // ---------------------------

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: { sub: number; email?: string; role?: string },
  ) {
    const userId = user.sub;
    const userEmail = user.email;

    if (!userId) throw new BadRequestException('Missing authenticated user');

    const rawPlan = String(dto.planCode || '').trim();

    const legacyToPaid: Record<string, PlanCanonical> = {
      COMPANY_GOLDEN: 'COMPANY_GOLDEN_MONTH',
      COMPANY_PLATINUM: 'COMPANY_PLATINUM_MONTH',
      COMPANY_SILVER: 'COMPANY_GOLDEN_MONTH',

      GOLDEN: 'COMPANY_GOLDEN_MONTH',
      PLATINUM: 'COMPANY_PLATINUM_MONTH',
      SILVER: 'COMPANY_GOLDEN_MONTH',

      'ΑΠΛΗ': 'COMPANY_GOLDEN_MONTH',
      'SILVER YEAR': 'COMPANY_SILVER_YEAR',
      'GOLDEN YEAR': 'COMPANY_GOLDEN_YEAR',
      'PLATINUM YEAR': 'COMPANY_PLATINUM_YEAR',
    };

    const planCode = (legacyToPaid[rawPlan] ?? rawPlan) as PlanCanonical;

    const allowed = new Set<PlanCanonical>([
      'COMPANY_GOLDEN_MONTH',
      'COMPANY_PLATINUM_MONTH',
      'COMPANY_SILVER_YEAR',
      'COMPANY_GOLDEN_YEAR',
      'COMPANY_PLATINUM_YEAR',
    ]);

    if (!allowed.has(planCode)) {
      throw new BadRequestException(
        `Unsupported planCode for Stripe checkout: "${rawPlan}" → normalized "${planCode}". Allowed: ${Array.from(allowed).join(', ')}`,
      );
    }

    if (dto.invoiceSeries !== 'APY' && dto.invoiceSeries !== 'TPY') {
      throw new BadRequestException('invoiceSeries must be APY or TPY');
    }

    const priceId = getStripePriceId(planCode);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const successUrl = `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/onboarding/plan`;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: dto.invoiceEmail || userEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: String(userId),
        planCode,
        invoiceSeries: dto.invoiceSeries,
        customerName: dto.customerName ?? '',
        customerVat: dto.customerVat ?? '',
        customerCountry: dto.customerCountry ?? '',
        customerCity: dto.customerCity ?? '',
        customerPostalCode: dto.customerPostalCode ?? '',
        invoiceEmail: dto.invoiceEmail ?? '',
      },
    });

    if (!session.url) throw new BadRequestException('Stripe session URL missing');
    return { url: session.url };
  }

  // ---------------------------
  // 2️⃣ Confirm μετά το Stripe
  // ---------------------------

  @Post('confirm')
  async confirm(@Query('session_id') sessionId?: string) {
    if (!sessionId) throw new BadRequestException('Missing session_id');

    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (session.status !== 'complete') {
      throw new BadRequestException('Checkout not completed yet');
    }

    const userIdRaw = session.metadata?.userId;
    if (!userIdRaw) throw new BadRequestException('Missing userId in session metadata');

    const userId = Number(userIdRaw);
    if (!Number.isInteger(userId)) throw new BadRequestException('Invalid userId in metadata');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const planName = (session.metadata?.planCode ?? 'COMPANY_GOLDEN_MONTH') as PlanCanonical;

    const defaults = planDefaults(planName);
    const plan = await this.prisma.plan.upsert({
      where: { name: planName },
      update: defaults,
      create: { name: planName, ...defaults },
    });

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { stripeSessionId: session.id },
    });
    if (existingInvoice && existingInvoice.status === InvoiceStatus.COMPLETED) {
      return { ok: true };
    }

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    let cancelAtPeriodEnd = false;
    let currentPeriodEnd: Date | null = null;

    if (stripeSubscriptionId) {
      // IMPORTANT: κάνουμε cast σε any για να μην σε μπλοκάρουν τα typings
      const stripeSub = (await this.stripe.subscriptions.retrieve(stripeSubscriptionId)) as any;

      cancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;

      currentPeriodEnd = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null;
    }

    await this.prisma.subscription.updateMany({
      where: { userId, status: { not: SubscriptionStatus.canceled } },
      data: { status: SubscriptionStatus.canceled },
    });

    const sub = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.active,
        stripeCustomerId,
        stripeSubscriptionId,
        cancelAtPeriodEnd,
        currentPeriodEnd,
      },
    });

    if (user.role === Role.COMPANY) {
      const cp = toCompanyPlan(planName);
      if (cp) {
        await this.prisma.company.update({
          where: { userId },
          data: { plan: cp },
        });
      }
    }

    const invoiceSeriesRaw =
      (session.metadata?.invoiceSeries as 'APY' | 'TPY' | undefined) ?? 'APY';

    const customerName = session.metadata?.customerName || null;
    const customerVat = session.metadata?.customerVat || null;
    const customerCountry = session.metadata?.customerCountry || null;
    const customerCity = session.metadata?.customerCity || null;
    const customerPostalCode = session.metadata?.customerPostalCode || null;
    const invoiceEmailMeta = session.metadata?.invoiceEmail || null;

    const seriesEnum =
      invoiceSeriesRaw === 'TPY' ? InvoiceSeries.TPY : InvoiceSeries.APY;

    const now = new Date();
    const year = now.getFullYear();

    const nextAa = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.invoiceCounter.upsert({
        where: { series_year: { series: seriesEnum, year } } as any,
        update: { lastAa: { increment: 1 } },
        create: { series: seriesEnum, year, lastAa: 1 },
      });
      return counter.lastAa;
    });

    const amountCents = session.amount_total ?? 0;
    const currency = (session.currency ?? 'eur').toUpperCase();

    const invoice = await this.prisma.invoice.create({
      data: {
        userId,
        stripeSessionId: session.id,
        stripeInvoiceId: typeof session.invoice === 'string' ? session.invoice : null,
        amountCents,
        currency,
        planCode: planName,
        series: seriesEnum,
        aa: nextAa,
        invoiceNumber: nextAa,
        customerName,
        customerVat: customerVat?.trim() ? customerVat.trim() : '000000000',
        customerCountry: customerCountry || 'GR',
        customerCity,
        customerPostalCode,
      },
    });

    try {
      const result = await this.etimologiera.uploadInvoice(invoice);

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.COMPLETED,
          mydataMark: result.mark,
          providerId: result.providerId,
          providerNumber: result.providerNumber,
          pdfUrl: result.pdfUrl,
        },
      });

      const humanAmount = (amountCents / 100).toFixed(2);
      const seriesLabel =
        invoice.series === InvoiceSeries.APY ? 'Receipt (APY)' : 'Invoice (TPY)';

      const customerEmail =
        invoiceEmailMeta ||
        session.customer_details?.email ||
        user.email ||
        null;

      const pdfUrlText = result.pdfUrl
        ? `<p>You can view or download your document here:<br><a href="${result.pdfUrl}">${result.pdfUrl}</a></p>`
        : '';

      const baseHtml = `
        <p>Dear ${customerName || 'customer'},</p>
        <p>Thank you for your purchase on <strong>GoodJobEurope</strong>.</p>
        <p>Your ${seriesLabel} details:</p>
        <ul>
          <li><strong>Plan:</strong> ${planName}</li>
          <li><strong>Amount:</strong> ${humanAmount} ${currency}</li>
          <li><strong>Invoice No (AA):</strong> ${invoice.aa ?? invoice.invoiceNumber}</li>
          <li><strong>myDATA mark:</strong> ${result.mark || '-'}</li>
          <li><strong>Stripe subscription:</strong> ${stripeSubscriptionId ?? '-'}</li>
        </ul>
        ${pdfUrlText}
        <p>Best regards,<br/>GoodJobEurope</p>
      `;

      if (customerEmail) {
        await this.mailer.sendMail({
          to: customerEmail,
          subject: `Your GoodJobEurope ${seriesLabel} for ${planName}`,
          html: baseHtml,
        });
      }

      const ownerEmail = process.env.OWNER_INVOICE_EMAIL;
      if (ownerEmail) {
        await this.mailer.sendMail({
          to: ownerEmail,
          subject: `[Owner copy] GoodJobEurope ${seriesLabel} for ${planName}`,
          html: baseHtml,
        });
      }
    } catch (err) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.FAILED,
          retries: { increment: 1 },
        },
      });
    }

    return { ok: true, subscriptionId: sub.id };
  }
}
