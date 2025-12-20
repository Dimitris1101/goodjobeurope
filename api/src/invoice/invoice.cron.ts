import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceService } from './invoice.service';

@Injectable()
export class InvoiceCron {
  private logger = new Logger(InvoiceCron.name);

  constructor(private readonly invoiceService: InvoiceService) {}

  @Cron('*/15 * * * *') // κάθε 15 λεπτά
  async retryPendingUploads() {
    this.logger.log('Retrying failed/pending myDATA uploads...');
    await this.invoiceService.retryPendingUploads();
  }
}
