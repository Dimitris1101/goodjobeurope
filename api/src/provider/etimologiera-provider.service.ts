// C:\job-matching\api\src\provider\etimologiera-provider.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Invoice, InvoiceSeries } from '@prisma/client';

export interface ProviderUploadResult {
  mark: string;
  providerId: string;
  providerNumber: string;
  pdfUrl?: string | null;
  raw?: any;
}

@Injectable()
export class EtimologieraProviderService {
  private logger = new Logger(EtimologieraProviderService.name);
  private client: AxiosInstance;

  constructor() {
    const baseURL =
      process.env.EINVOICE_BASE_URL ||
      'https://einvoicing-api.etimologiera.gr/v4';

    const username = process.env.EINVOICE_USER || '';
    const password = process.env.EINVOICE_PASSWORD || '';

    this.logger.log(
      `Etimologiera config → baseURL=${baseURL}, user=${username}, passLen=${password.length}`,
    );

    if (!username || !password) {
      this.logger.warn(
        'EINVOICE_USER / EINVOICE_PASSWORD are not set – provider calls will fail',
      );
    }

    this.client = axios.create({
      baseURL,
      auth: {
        username,
        password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  // βοηθητικό για country code
  private normalizeCountry(country?: string | null): string {
    if (!country) return 'GR';
    const upper = country.trim().toUpperCase();

    if (upper === 'GREECE' || upper === 'ΕΛΛΑΔΑ') return 'GR';
    if (upper.length === 2) return upper;

    // για οτιδήποτε περίεργο, γύρνα GR για να μην σκάει
    return 'GR';
  }

   private athensDateYYYYMMDD(d = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);

    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;

    return `${y}-${m}-${day}`; // YYYY-MM-DD
  }

  async uploadInvoice(invoice: Invoice): Promise<ProviderUploadResult> {
    const amount = invoice.amountCents / 100;

    const vatPercent = invoice.vatPercent ?? 24;
    const isZeroVat = vatPercent === 0;

    const vatAmountStandard = isZeroVat
      ? 0
      : Number((amount * (vatPercent / 100)).toFixed(2));

    const vatCategoryStandard =
      invoice.vatCategory ?? (isZeroVat ? 7 : 1);

    const incomeClassificationTypeStandard =
      invoice.incomeClassType || 'E3_561_001';
    const incomeClassificationCategoryStandard =
      invoice.incomeClassCategory || 'category1_3';

    let seriesText = 'ΤΠΥ';
    switch (invoice.series) {
      case InvoiceSeries.APY:
        seriesText = 'ΑΠΥ';
        break;
      case InvoiceSeries.TPY_EE:
        seriesText = 'ΤΠΥΕΕ';
        break;
      case InvoiceSeries.TPY_TX:
        seriesText = 'ΤΠΥΤΧ';
        break;
      default:
        seriesText = 'ΤΠΥ';
    }

    let mydataType: string;
    if (invoice.series === InvoiceSeries.APY) {
      mydataType = '11.2';
    } else {
      mydataType = (invoice as any).mydataType || '2.1';
    }

    // 🔹 Στοιχεία πελάτη (με normalize στο country)
    const counterpartVat = invoice.customerVat || '000000000';
    const counterpartName = invoice.customerName || 'TEST CUSTOMER';
    const counterpartCountry = this.normalizeCountry(invoice.customerCountry);
    const counterpartCity = invoice.customerCity || 'ATHINA';
    const counterpartPostalCode = invoice.customerPostalCode || '00000';

    const issuerVat = process.env.ISSUER_VAT || process.env.EINVOICE_USER || '';
    const issuerName = process.env.ISSUER_NAME || 'GOODJOBEUROPE';
    const issuerTitle = process.env.ISSUER_TITLE || issuerName;
    const issuerActivity =
      process.env.ISSUER_ACTIVITY || 'ΥΠΗΡΕΣΙΕΣ ΛΟΓΙΣΜΙΚΟΥ';
    const issuerStreet = process.env.ISSUER_STREET || '';
    const issuerZip = process.env.ISSUER_ZIP || '';
    const issuerCity = process.env.ISSUER_CITY || '';
    const issuerPhone = process.env.ISSUER_PHONE || '';
    const issuerEmail = process.env.ISSUER_EMAIL || '';
    const issuerWebsite = process.env.ISSUER_WEBSITE || '';

    let invoicePayload: any;

if (invoice.series === InvoiceSeries.APY) {
  // ===== ΑΠΥ =====
  const netValue = Number((amount / (1 + vatPercent / 100)).toFixed(2));
  const vatAmount = Number((amount - netValue).toFixed(2));

  const customerVatForReceipt = invoice.customerVat || '000000000';
  const customerNameForReceipt = invoice.customerName || 'ΠΕΛΑΤΗΣ ΛΙΑΝΙΚΗΣ';

  const aa = String((invoice as any).invoiceNumber ?? invoice.aa ?? 1);

  invoicePayload = {
    isUnsigned: true,
    issuer: {
      vatNumber: issuerVat,
      country: 'GR',
      branch: 0,
    },
    invoiceHeader: {
      series: seriesText,
      aa, // ✅ ΕΔΩ
      issueDate: this.athensDateYYYYMMDD(),
      invoiceType: mydataType,
      currency: (invoice.currency || 'EUR').toUpperCase(),
    },
    paymentMethods: {
      paymentMethodDetails: [
        {
          type: 1,
          amount,
        },
      ],
    },
    invoiceDetails: [
      {
        name: 'ΥΠΗΡΕΣΙΑ',
        code: invoice.planCode || '000001',
        lineNumber: 1,
        netValueBeforeDiscount: amount,
        netValue,
        vatAmount,
        vatCategory: 1,
        incomeClassification: [
          {
            classificationType: 'E3_561_003',
            classificationCategory: 'category1_3',
            amount: netValue,
            id: 1,
          },
        ],
        price: amount,
        measurementUnitName: 'ΤΕΜ',
        vatPercent,
        priceIncludeVAT: 1,
      },
    ],
    invoiceSummary: {
      totalNetValue: netValue,
      totalVatAmount: vatAmount,
      totalWithheldAmount: 0,
      totalFeesAmount: 0,
      totalStampDutyAmount: 0,
      totalOtherTaxesAmount: 0,
      totalDeductionsAmount: 0,
      totalGrossValue: amount,
      totalPrintGrossValue: amount,
      incomeClassification: [
        {
          classificationType: 'E3_561_003',
          classificationCategory: 'category1_3',
          amount: netValue,
          id: 1,
        },
      ],
    },
    invoiceVatAnalysis: [
      {
        vatCategory: 1,
        vatPercent,
        netValuePerVat: netValue,
        vatAmount,
      },
    ],
    extra: {
      customerSendEmail: false,
      salerName: issuerName,
      salerTitle: issuerTitle,
      salerActivity: issuerActivity,
      salerStreetName: issuerStreet,
      salerTk: issuerZip,
      salerCity: issuerCity,
      salerPhone: issuerPhone,
      salerEmail: issuerEmail,
      salerWebsite: issuerWebsite,
      salerVat: issuerVat,
      customerName: customerNameForReceipt,
      customerVat: customerVatForReceipt,
      customerCity: invoice.customerCity || 'ΑΘΗΝΑ',
      customerTk: invoice.customerPostalCode || '11111',
      paymentMethodName: 'Τοίς Μετρητοίς',
      invoiceTypeName: 'Απόδειξη Παροχής Υπηρεσιών',
    },
  };
} else {
  // ======================
  // TPY (Τιμολόγιο Παροχής Υπηρεσιών)
  // ======================
  const vatAmount = vatAmountStandard;
  const vatCategory = vatCategoryStandard;
  const incomeClassificationType = incomeClassificationTypeStandard;
  const incomeClassificationCategory = incomeClassificationCategoryStandard;

  const isGreekCounterpart = counterpartCountry === 'GR';

  // χτίζουμε το counterpart χωρίς name (αν είναι Ελλάδα)
  const counterpart: any = {
    vatNumber: counterpartVat,
    country: counterpartCountry,
    branch: 0,
    address: {
      postalCode: counterpartPostalCode,
      city: counterpartCity,
    },
  };

  // Αν ΔΕΝ είναι Ελλάδα, τότε επιτρέπεται το name
  if (!isGreekCounterpart) {
    counterpart.name = counterpartName;
  }

  const aa = String((invoice as any).invoiceNumber ?? invoice.aa ?? 1);


  invoicePayload = {
    isUnsigned: false,
    issuer: {
      vatNumber: issuerVat,
      country: 'GR',
      branch: 0,
    },
    counterpart,
    invoiceHeader: {
      series: seriesText,
      aa, // ✅ ΕΔΩ
      issueDate: this.athensDateYYYYMMDD(),
      invoiceType: mydataType,
      currency: (invoice.currency || 'EUR').toUpperCase(),
    },
    paymentMethods: {
      paymentMethodDetails: [
        {
          type: 1,
          amount,
        },
      ],
    },
    invoiceDetails: [
      {
        name: `Υπηρεσία ${invoice.planCode}`,
        code: invoice.planCode,
        lineNumber: 1,
        quantity: 1,
        measurementUnit: 1,
        netValueBeforeDiscount: amount,
        netValue: amount,
        vatAmount,
        vatCategory,
        incomeClassification: [
          {
            classificationType: incomeClassificationType,
            classificationCategory: incomeClassificationCategory,
            amount,
            id: 1,
          },
        ],
        price: amount,
        measurementUnitName: 'ΤΕΜ',
        vatPercent,
        priceIncludeVAT: 0,
      },
    ],
    invoiceSummary: {
      totalNetValue: amount,
      totalVatAmount: vatAmount,
      totalWithheldAmount: 0,
      totalFeesAmount: 0,
      totalStampDutyAmount: 0,
      totalOtherTaxesAmount: 0,
      totalDeductionsAmount: 0,
      totalGrossValue: amount + vatAmount,
      totalPrintGrossValue: amount + vatAmount,
      incomeClassification: [
        {
          classificationType: incomeClassificationType,
          classificationCategory: incomeClassificationCategory,
          amount,
          id: 1,
        },
      ],
    },
    invoiceVatAnalysis: [
      {
        vatCategory,
        vatPercent,
        netValuePerVat: amount,
        vatAmount,
      },
    ],
    extra: {
      salerName: issuerName,
      salerTitle: issuerTitle,
      salerActivity: issuerActivity,
      salerStreetName: issuerStreet,
      salerTk: issuerZip,
      salerCity: issuerCity,
      salerPhone: issuerPhone,
      salerEmail: issuerEmail,
      salerWebsite: issuerWebsite,
      salerVat: issuerVat,
    },
  };
}

    const body = { invoice: [invoicePayload] };

    try {
      this.logger.log(
        'Etimologiera request body: ' + JSON.stringify(body, null, 2),
      );

      const res = await this.client.post('/sendInvoice', body);

      this.logger.log(
        'Etimologiera RAW response: ' + JSON.stringify(res.data, null, 2),
      );

      if (res.data?.errors?.length) {
        this.logger.error(
          'Etimologiera logical errors: ' + JSON.stringify(res.data.errors),
        );
        throw new Error(
          'Etimologiera logical error: ' +
            JSON.stringify(res.data.errors),
        );
      }

      const paroxosError = res.data?.response?.paroxosError;
      if (paroxosError) {
        this.logger.error(
          'Etimologiera paroxosError: ' +
            JSON.stringify(paroxosError),
        );
        throw new Error(
          `Etimologiera logical error: ${paroxosError.code}: ${paroxosError.description}`,
        );
      }

      const first =
        res.data?.response?.responses?.[0] ??
        res.data?.responses?.[0] ??
        res.data?.response ??
        res.data;

      this.logger.log(
        'Etimologiera parsed first: ' + JSON.stringify(first, null, 2),
      );

      const mark = first?.invoiceMark;
      const providerId = first?.id;
      const providerNumber = first?.authenticationCode;
      const pdfUrl = first?.invoiceUrl ?? null;

      if (!mark) {
        throw new Error(
          'Etimologiera logical error: missing invoiceMark in response',
        );
      }

      return {
        mark: String(mark),
        providerId: String(providerId ?? ''),
        providerNumber: providerNumber ?? '',
        pdfUrl,
        raw: res.data,
      };
    } catch (error: any) {
      this.logger.error(
        `Provider upload failed for invoice ${invoice.id}`,
        error?.response?.data
          ? JSON.stringify(error.response.data, null, 2)
          : error.message,
      );
      throw error;
    }
  }
}
