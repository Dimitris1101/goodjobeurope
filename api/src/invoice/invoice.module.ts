// C:\job-matching\api\src\invoice\invoice.module.ts
import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../prisma.service';
import { MailerService } from '../mailer.service';
import { InvoiceCron } from './invoice.cron';
import { EtimologieraProviderService } from '../provider/etimologiera-provider.service';

@Module({
  providers: [
    InvoiceService,
    PrismaService,
    MailerService,
    EtimologieraProviderService,
    InvoiceCron,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
