import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma.service';
import { EtimologieraProviderService } from '../provider/etimologiera-provider.service';
import { MailerService } from '../mailer.service';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, PrismaService, EtimologieraProviderService, MailerService],
  exports: [BillingService],
})
export class BillingModule {}
