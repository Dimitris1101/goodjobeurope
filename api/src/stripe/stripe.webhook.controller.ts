// C:\job-matching\api\src\stripe\stripe.webhook.controller.ts
import { Controller, Post, Req, Res } from '@nestjs/common';
import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { InvoiceService } from '../invoice/invoice.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private stripe: Stripe;

  constructor(private readonly invoiceService: InvoiceService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      //apiVersion: '2024-06-20', // ή ό,τι έχεις στο Stripe dashboard
    });
  }

  @Post()
  async handle(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        (req as any).rawBody ?? req.body, // rawBody αν έχεις middleware
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        // εδώ ενεργοποιούμε και την ροή του invoice
        await this.invoiceService.handlePaidSession(s);
        break;
      }
      case 'invoice.paid': {
        // αργότερα αν θέλεις extra logic για recurring invoices
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
      case 'invoice.payment_failed':
        // TODO: sync κατάσταση/period_end
        break;
    }

    res.json({ received: true });
  }
}
