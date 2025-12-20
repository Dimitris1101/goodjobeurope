import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe.webhook.controller';
import { StripeController } from './stripe.controller';
import { InvoiceModule } from '../invoice/invoice.module';


@Module({
  imports: [InvoiceModule],         
  controllers: [StripeController,StripeWebhookController],
})
export class StripeModule {}

