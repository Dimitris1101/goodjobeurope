import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import Stripe from 'stripe';

type PlanCanonical =
  | 'VIP_MEMBER'
  | 'COMPANY_BASIC'
  | 'COMPANY_SILVER'
  | 'COMPANY_GOLDEN';

@Controller('billing')
export class StripeController {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion optional, αλλά καλό είναι:
    // apiVersion: '2024-06-20',
  });

  private resolvePrice(planCode?: string, overridePriceId?: string): {
    priceId: string;
    planCode: PlanCanonical;
  } {
    // αν ο client περάσει manual priceId, το χρησιμοποιούμε όπως είναι
    if (overridePriceId) {
      return {
        priceId: overridePriceId,
        planCode: (planCode as PlanCanonical) || 'VIP_MEMBER',
      };
    }

    const code = (planCode as PlanCanonical) || 'VIP_MEMBER';

    switch (code) {
      case 'VIP_MEMBER': {
        const priceId = process.env.STRIPE_PRICE_VIP_EUR10;
        if (!priceId) {
          throw new BadRequestException('Missing STRIPE_PRICE_VIP_EUR10 in env');
        }
        return { priceId, planCode: 'VIP_MEMBER' };
      }

      case 'COMPANY_SILVER': {
        const priceId = process.env.STRIPE_PRICE_COMPANY_SILVER;
        if (!priceId) {
          throw new BadRequestException('Missing STRIPE_PRICE_COMPANY_SILVER in env');
        }
        return { priceId, planCode: 'COMPANY_SILVER' };
      }

      case 'COMPANY_GOLDEN': {
        const priceId = process.env.STRIPE_PRICE_COMPANY_GOLDEN;
        if (!priceId) {
          throw new BadRequestException('Missing STRIPE_PRICE_COMPANY_GOLDEN in env');
        }
        return { priceId, planCode: 'COMPANY_GOLDEN' };
      }

      // COMPANY_BASIC δεν περνάει από Stripe (0€), αλλά βάζω fallback
      case 'COMPANY_BASIC':
      default: {
        const priceId = process.env.STRIPE_PRICE_VIP_EUR10;
        if (!priceId) {
          throw new BadRequestException('Missing default STRIPE_PRICE_VIP_EUR10 in env');
        }
        return { priceId, planCode: 'VIP_MEMBER' };
      }
    }
  }

  @Post('checkout-session')
  async createCheckoutSession(
    @Body()
    body: {
      userId: number | string;
      planCode?: PlanCanonical;
      priceId?: string;
    },
  ) {
    if (!body?.userId) {
      throw new BadRequestException('Missing userId in body');
    }

    const { priceId, planCode } = this.resolvePrice(
      body.planCode,
      body.priceId,
    );

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      metadata: {
        userId: String(body.userId),
        planCode, // VIP_MEMBER | COMPANY_SILVER | COMPANY_GOLDEN ...
      },
      success_url: `${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/billing/cancelled`,
    });

    return { url: session.url };
  }
}
