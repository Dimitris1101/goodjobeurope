"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

type Role = 'CANDIDATE' | 'COMPANY' | 'ADMIN';

type Me = {
  role: Role;
  plan?: string | null;
};

export default function SuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session_id');

  const [status, setStatus] = useState<'idle' | 'confirming' | 'ok' | 'error'>(
    'idle',
  );
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        setStatus('confirming');

        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        // 1) Confirm στον Nest (φτιάχνει Subscription + Plan κλπ)
        const res = await fetch(
          `${apiBase}/billing/confirm?session_id=${encodeURIComponent(
            sessionId,
          )}`,
          {
            method: 'POST',
            headers: { 'x-internal': '1' },
          },
        );

        if (!res.ok) {
          console.error(
            'billing/confirm failed',
            await res.text().catch(() => ''),
          );
          throw new Error('Confirm failed');
        }

        // 2) Σημάδεψε onboarding completed + καθάρισε ad caps
        try {
          localStorage.setItem('hasPlan', '1');
          localStorage.setItem('onboarding.completed', '1');
          Object.keys(localStorage)
            .filter((k) => k.startsWith('ad.'))
            .forEach((k) => localStorage.removeItem(k));
          localStorage.setItem('ad.freshStart', String(Date.now()));
        } catch {
          // ignore
        }

        // 3) Φέρε /me για να δούμε ρόλο & plan
        const { data } = await api.get<Me>('/me');
        const nextRole = data?.role ?? null;
        setRole(nextRole);
        setStatus('ok');

        // 4) Redirect στο σωστό dashboard
        setTimeout(() => {
          if (nextRole === 'COMPANY') {
            router.replace('/dashboard/company');
          } else {
            router.replace('/dashboard/candidate');
          }
        }, 1500);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    })();
  }, [sessionId, router]);

  const infoText =
    status === 'confirming'
      ? 'Confirming your payment…'
      : status === 'ok'
      ? 'Payment confirmed. Redirecting to your dashboard…'
      : status === 'error'
      ? 'Payment completed, but something went wrong. You can go to your dashboard from the button below.'
      : 'Processing…';

  const goDashboard = () => {
    if (role === 'COMPANY') {
      router.replace('/dashboard/company');
    } else {
      router.replace('/dashboard/candidate');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(155,255,222)] p-4">
      <div className="relative w-[350px] h-[680px] bg-[rgba(39,29,95,1)] rounded-[30px] p-5 flex flex-col items-center text-center shadow-lg">
        <img
          src="/success.jpg"
          alt="Payment success"
          className="w-[80%] h-[250px] object-contain rotate-[-3deg] mt-2"
        />

        <h1 className="text-[26px] text-[rgb(197,197,197)] mt-6 font-semibold">
          Payment Success!
        </h1>
        <p className="text-[rgb(197,197,197)] px-8 mt-4">
          GREAT! Your payment has been completed successfully.
        </p>

        <img
          src="/icon.png"
          alt="Payment verified"
          className="w-[60%] h-[150px] object-contain rotate-[-3deg] mt-3"
        />

        <div className="absolute bottom-16 left-6 right-6 text-xs text-white opacity-80">
          {infoText}
        </div>

        <button
          onClick={goDashboard}
          className="absolute bottom-6 left-6 right-6 bg-[rgb(10,219,246)] text-black font-semibold text-[18px] py-3 rounded-xl hover:opacity-90 transition"
        >
          Go to dashboard
        </button>
      </div>
    </main>
  );
}
