import { BadRequestException } from '@nestjs/common';

export type PlanCanonical =
  | 'FREE_MEMBER'
  | 'VIP_MEMBER'
  | 'COMPANY_BASIC'
  // monthly paid
  | 'COMPANY_GOLDEN_MONTH'
  | 'COMPANY_PLATINUM_MONTH'
  // yearly paid
  | 'COMPANY_SILVER_YEAR'
  | 'COMPANY_GOLDEN_YEAR'
  | 'COMPANY_PLATINUM_YEAR';

export function getStripePriceId(planCode: PlanCanonical): string {
  switch (planCode) {
    case 'COMPANY_GOLDEN_MONTH': {
      const v = process.env.STRIPE_PRICE_COMPANY_GOLDEN_MONTH;
      if (!v) throw new BadRequestException('Missing STRIPE_PRICE_COMPANY_GOLDEN_MONTH');
      return v;
    }
    case 'COMPANY_PLATINUM_MONTH': {
      const v = process.env.STRIPE_PRICE_COMPANY_PLATINUM_MONTH;
      if (!v) throw new BadRequestException('Missing STRIPE_PRICE_COMPANY_PLATINUM_MONTH');
      return v;
    }
    case 'COMPANY_SILVER_YEAR': {
      const v = process.env.STRIPE_PRICE_COMPANY_SILVER_YEAR;
      if (!v) throw new BadRequestException('Missing STRIPE_PRICE_COMPANY_SILVER_YEAR');
      return v;
    }
    case 'COMPANY_GOLDEN_YEAR': {
      const v = process.env.STRIPE_PRICE_COMPANY_GOLDEN_YEAR;
      if (!v) throw new BadRequestException('Missing STRIPE_PRICE_COMPANY_GOLDEN_YEAR');
      return v;
    }
    case 'COMPANY_PLATINUM_YEAR': {
      const v = process.env.STRIPE_PRICE_COMPANY_PLATINUM_YEAR;
      if (!v) throw new BadRequestException('Missing STRIPE_PRICE_COMPANY_PLATINUM_YEAR');
      return v;
    }

    // VIP / FREE / BASIC = no Stripe for now
    default:
      throw new BadRequestException('Unsupported planCode for Stripe');
  }
}
