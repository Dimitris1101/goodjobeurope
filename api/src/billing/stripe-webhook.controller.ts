import { Controller, Headers, HttpCode, Post, Req, Res } from '@nestjs/common';
import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { BillingService } from './billing.service';

@Controller()
export class StripeWebhookController {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  constructor(private readonly billingService: BillingService) {}

  @Post('webhooks/stripe')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') sig?: string,
  ) {
    if (!sig) return res.status(400).send('Missing stripe-signature');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.body as any, // raw buffer
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await this.billingService.handleStripeEvent(event);

    return res.json({ received: true });
  }
}
