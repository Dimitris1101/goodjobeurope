'use client';

export default function UpgradeButton({ userId }: { userId: string }) {
  async function start() {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const { url } = await res.json();
    window.location.href = url; // redirect to Stripe Checkout
  }

  return (
    <button
      onClick={start}
      className="rounded bg-blue-600 text-white px-4 py-2">
      Go VIP
    </button>
  );
}
