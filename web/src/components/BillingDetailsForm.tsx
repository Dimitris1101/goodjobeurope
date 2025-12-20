'use client';

import React, { useState } from 'react';
import api from '@/lib/api';

type InvoiceSeries = 'APY' | 'TPY';

interface BillingDetailsFormProps {
  planCode: 'VIP_MEMBER' | 'COMPANY_SILVER' | 'COMPANY_GOLDEN';
  userEmail: string;
  apiBaseUrl?: string; // μπορεί να μείνει αλλά δεν το χρειάζεσαι πλέον
}

export const BillingDetailsForm: React.FC<BillingDetailsFormProps> = ({
  planCode,
  userEmail,
}) => {
  const [invoiceSeries, setInvoiceSeries] = useState<InvoiceSeries>('APY');
  const [customerName, setCustomerName] = useState('');
  const [customerVat, setCustomerVat] = useState('');
  const [customerCountry, setCustomerCountry] = useState('GR');
  const [customerCity, setCustomerCity] = useState('');
  const [customerPostalCode, setCustomerPostalCode] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState(userEmail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // simple frontend validation for TPY
    if (invoiceSeries === 'TPY') {
      if (!customerName || !customerVat || !customerCity || !customerPostalCode) {
        setError('Please fill in all required invoice fields.');
        return;
      }
    }

    setLoading(true);
    try {
      const { data } = await api.post<{ url: string }>(
        '/billing/create-checkout-session',
        {
          planCode,
          invoiceSeries,
          customerName: customerName || undefined,
          customerVat: customerVat || undefined,
          customerCountry: customerCountry || undefined,
          customerCity: customerCity || undefined,
          customerPostalCode: customerPostalCode || undefined,
          invoiceEmail: invoiceEmail || undefined,
        },
      );

      if (!data.url) {
        throw new Error('Stripe URL not returned by server');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          'Something went wrong while starting the payment.',
      );
    } finally {
      setLoading(false);
    }
  }

  const isInvoice = invoiceSeries === 'TPY';

  const planLabel =
    planCode === 'VIP_MEMBER'
      ? 'VIP Member'
      : planCode === 'COMPANY_SILVER'
      ? 'Company Silver'
      : planCode === 'COMPANY_GOLDEN'
      ? 'Company Golden'
      : planCode;

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 border rounded-xl shadow-sm bg-white">
      <h1 className="text-2xl font-semibold mb-2">Billing details</h1>
      <p className="text-sm text-gray-600 mb-4">
        Plan: <span className="font-medium">{planLabel}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Document type */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Document type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="invoiceSeries"
                value="APY"
                checked={invoiceSeries === 'APY'}
                onChange={() => setInvoiceSeries('APY')}
              />
              <span>Receipt (APY)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="invoiceSeries"
                value="TPY"
                checked={invoiceSeries === 'TPY'}
                onChange={() => setInvoiceSeries('TPY')}
              />
              <span>Invoice (TPY)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Choose “Receipt” for individuals, “Invoice” for businesses or freelancers.
          </p>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {isInvoice ? 'Full name / Company name *' : 'Full name (optional)'}
          </label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder={isInvoice ? 'e.g. John Doe PC' : 'e.g. John Doe'}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* VAT */}
        <div>
          <label className="block text-sm font-medium mb-1">
            VAT number {isInvoice && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder={isInvoice ? 'e.g. 123456789' : 'optional'}
            value={customerVat}
            onChange={(e) => setCustomerVat(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            For receipts, leave blank to use 000000000.
          </p>
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Country
          </label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={customerCountry}
            onChange={(e) => setCustomerCountry(e.target.value)}
          />
        </div>

        {/* City + Postal code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              City {isInvoice && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g. Athens"
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Postal code {isInvoice && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g. 11111"
              value={customerPostalCode}
              onChange={(e) => setCustomerPostalCode(e.target.value)}
            />
          </div>
        </div>

        {/* Invoice email */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Invoice email
          </label>
          <input
            type="email"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Where should we send your document?"
            value={invoiceEmail}
            onChange={(e) => setInvoiceEmail(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            A copy of the document will also be sent to the GoodJobEurope owner.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Redirecting to payment…' : 'Pay with card'}
        </button>
      </form>
    </div>
  );
};
