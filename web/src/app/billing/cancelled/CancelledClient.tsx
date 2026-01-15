"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelledPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetryPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Βάλε εδώ το πραγματικό userId από το context/session
      const userId = localStorage.getItem('userId') || 'test-user-123';

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error('Checkout init failed');

      const data = await res.json();
      if (!data?.url) throw new Error('No checkout URL received');

      window.location.href = data.url; // Redirect back to Stripe checkout
    } catch (err: any) {
      setError(err.message || 'Payment retry failed');
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-[linear-gradient(135deg,#ffcccb,#b0e57c,#d4a5ff,#b0e0e6)] text-[#333] font-[Arial,sans-serif]">
      <div className="text-center bg-white/90 p-10 rounded-xl shadow-md max-w-[500px] mx-4">
        <div className="text-[50px] text-[#f44336] mb-5">❌</div>
        <h1 className="text-[2em] mb-3 font-bold text-[#f44336]">
          Payment Cancelled
        </h1>
        <p className="text-[1.2em] my-5 text-[#555]">
          Your payment was cancelled. Would you like to try again?
        </p>

        {error && (
          <p className="text-red-600 text-sm mb-3">
            {error}
          </p>
        )}

        <button
          onClick={handleRetryPayment}
          disabled={loading}
          className="mt-4 inline-block px-6 py-3 text-white text-[1em] bg-[#f44336] rounded-md shadow hover:bg-[#e53935] transition disabled:opacity-70"
        >
          {loading ? 'Redirecting...' : 'Try Payment Again'}
        </button>
      </div>
    </main>
  );
}
