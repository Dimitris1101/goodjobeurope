export type InvoiceKind = 'TPY' | 'APY' | 'TPY_EE' | 'TPY_TX';

export function getInvoiceMeta(kind: InvoiceKind) {
  switch (kind) {
    case 'TPY':
      return {
        series: 'ΤΠΥ',
        mydataType: '2.1',
        vatPercent: 24,
        vatCategory: 1,
        vatExemptionCode: null,
      };

    case 'APY':
      return {
        series: 'ΑΠΥ',
        mydataType: '11.2', // επιβεβαίωσέ το με λογιστή
        vatPercent: 24,
        vatCategory: 1,
        vatExemptionCode: null,
      };

    case 'TPY_EE':
      return {
        series: 'ΤΠΥΕΕ',
        mydataType: '2.1',
        vatPercent: 0,
        vatCategory: 7,
        vatExemptionCode: '33', // ΕΕ
      };

    case 'TPY_TX':
      return {
        series: 'ΤΠΥΤΧ',
        mydataType: '2.1',
        vatPercent: 0,
        vatCategory: 7,
        vatExemptionCode: '29', // τρίτη χώρα
      };
  }
}
