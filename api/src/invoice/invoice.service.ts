import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailerService } from '../mailer.service';
import { Invoice } from '@prisma/client';
import Stripe from 'stripe';
import { EtimologieraProviderService } from '../provider/etimologiera-provider.service';

@Injectable()
export class InvoiceService {
  private logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
    private provider: EtimologieraProviderService, // 👈 ΠΡΟΣΘΗΚΗ
  ) {}

  // θα καλείται από το webhook όταν πληρωθεί κάτι
  async handlePaidSession(session: Stripe.Checkout.Session) {
    try {
      const userIdStr = session.metadata?.userId;

      if (!userIdStr) {
        this.logger.error('Paid session without userId in metadata');
        return;
      }

      const userId = Number(userIdStr);
      if (Number.isNaN(userId)) {
        this.logger.error(
          `Invalid userId in metadata (not a number): ${userIdStr}`,
        );
        return;
      }

      const amountTotal = session.amount_total ?? 0;
      const currency = (session.currency ?? 'eur').toUpperCase();
      const planCode = session.metadata?.planCode ?? 'UNKNOWN_PLAN';

      const invoice = await this.prisma.invoice.create({
        data: {
          userId,
          stripeSessionId: session.id,
          stripeInvoiceId:
            typeof session.invoice === 'string' ? session.invoice : null,
          amountCents: amountTotal,
          currency,
          planCode,
          status: 'PENDING_UPLOAD',
        },
      });

      const pdfBuffer = await this.generateSimplePdf(invoice, session);

      const to = session.customer_details?.email ?? 'test@example.com';

      await this.mailer.sendMail({
        to,
        subject: `This is your invoice for your payment with ID: #${invoice.id}`,
        html: 'Thank you for your payment',
        attachments: [
          {
            filename: `invoice-${invoice.id}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      this.logger.log(
        `Invoice ${invoice.id} created (mock PDF/email sent) for user ${userId}`,
      );

      // εδώ ΘΕΩΡΗΤΙΚΑ θα ξεκινούσες και upload στον πάροχο
      // π.χ.:
      // await this.uploadWithProvider(invoice);
    } catch (err) {
      this.logger.error('Error in handlePaidSession', err as any);
    }
  }

  // MOCK PDF
  private async generateSimplePdf(
    invoice: any,
    session: Stripe.Checkout.Session,
  ): Promise<Buffer> {
    const text = `
      INVOICE (TEST)
      --------------
      Invoice ID: ${invoice.id}
      User ID: ${invoice.userId}
      Amount: ${(invoice.amountCents / 100).toFixed(2)} ${invoice.currency}
      Plan: ${invoice.planCode}
    `;
    return Buffer.from(text, 'utf8');
  }

  // 👇👇 ΝΕΕΣ ΜΕΘΟΔΟΙ ΓΙΑ CRON + PROVIDER 👇👇

  // θα την καλεί το cron job κάθε 15'
  async retryPendingUploads() {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'PENDING_UPLOAD',
        retries: { lt: 3 },
      },
    });

    if (!invoices.length) {
      this.logger.log('No pending invoices to retry');
      return;
    }

    this.logger.log(`Retrying ${invoices.length} pending invoice(s)...`);

    for (const inv of invoices) {
      await this.uploadWithProvider(inv);
    }
  }

  // ανεβάζει ένα invoice στον πάροχο (προς το παρόν mock)
  async uploadWithProvider(invoice: Invoice) {
    try {
      const result = await this.provider.uploadInvoice(invoice);

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'COMPLETED',
          providerId: result.providerId,
          providerNumber: result.providerNumber,
          mydataMark: result.mark,
          pdfUrl: result.pdfUrl ?? null,
        },
      });

      this.logger.log(`Invoice ${invoice.id} uploaded to provider (mock)`);

      // optional: εδώ μπορείς να στείλεις 2ο email:
      // "Το παραστατικό σας καταχωρήθηκε επιτυχώς στη ΑΑΔΕ"
    } catch (err) {
      const newRetries = invoice.retries + 1;

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          retries: newRetries,
          status: newRetries >= 3 ? 'FAILED' : 'PENDING_UPLOAD',
        },
      });

      this.logger.error(
        `Failed to upload invoice ${invoice.id} (attempt ${newRetries})`,
        err as any,
      );
    }
  }
}
