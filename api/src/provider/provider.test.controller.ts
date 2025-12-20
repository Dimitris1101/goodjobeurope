// C:\job-matching\api\src\provider\provider.test.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { EtimologieraProviderService } from './etimologiera-provider.service';
import { InvoiceSeries, VatProfile } from '@prisma/client';

@Controller('test')
export class ProviderTestController {
  constructor(private readonly provider: EtimologieraProviderService) {}

  @Post('provider')
  async testProvider(@Body() body: any) {
    const amountCents = Number(body.amountCents ?? 100);

    const series = (body.series as keyof typeof InvoiceSeries) ?? 'TPY';
    const mydataType = body.mydataType ?? null;

    const fakeInvoice = {
      id: 'test-123',
      userId: 1,
      amountCents,
      currency: 'EUR',
      planCode: 'TEST_PLAN',
      stripeSessionId: 'test_sess',
      stripeInvoiceId: null,
      status: 'PENDING_UPLOAD',
      retries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),

      series,
      vatProfile: VatProfile.VAT24,
      vatPercent: 24,
      vatCategory: 1,
      incomeClassType: 'E3_561_001',
      incomeClassCategory: 'category1_3',
      mydataType,

      customerVat: '000000000',
      customerName: 'TEST CUSTOMER',
      customerCountry: 'GR',
      customerCity: 'ATHINA',
      customerPostalCode: '11111',
    };

    try {
      const result = await this.provider.uploadInvoice(fakeInvoice as any);

      return {
        ok: true,
        sentInvoice: fakeInvoice,
        providerResult: result,
      };
    } catch (err: any) {
      // ΔΕΝ πετάμε το error προς τα έξω → γυρνάμε 200 με λεπτομέρειες
      return {
        ok: false,
        message: err.message,
        // αν είναι axios error, θα έχει response.data
        providerRaw: err.response?.data ?? null,
        stack: err.stack,
      };
    }
  }
}
