// C:\job-matching\web\src\components\Pricing.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Plan = {
  name: string;
  price: string;
  features: string[];
  cta: string;
  popular?: boolean;
};

const candidatePlans: Plan[] = [
  { name: 'FREE',       price: '0€',       features: ['1 Φωτογραφία', 'Διαφημίσεις', 'ΟΧΙ προτεραιότητα σε αναζητήσεις'], cta: 'Ξεκίνα δωρεάν' },
  { name: 'VIP MEMBER', price: '15€/μήνα', features: ['Χωρίς διαφημίσεις', 'Πολλαπλές φωτογραφίες', 'Προτεραιότητα σε αναζητήσεις'], cta: 'Απόκτησέ το', popular: true },
];

const companyPlans: Plan[] = [
  { name: 'ΑΠΛΗ',   price: '0€',       features: ['Περιορισμός στα profile υποψηγίων', 'Διαφημίσεις', 'Χαμηλή προτεραιότητα αναζητήσεων'], cta: 'Ξεκίνα' },
  { name: 'SILVER', price: '20€/μήνα', features: ['Περιορισμός στα profile υποψηφίων', 'Λιγότερες διαφημίσεις', 'Μεσαία προτεραιότητα σε Matching'], cta: 'Απόκτησέ το', popular: true },
  { name: 'GOLDEN', price: '35€/μήνα', features: ['Απεριόριστα match με υποψήφιους', 'Καθόλου διαφημίσεις', 'Επιλογή φίλτρων υποψηφίων'], cta: 'Γίνε PRO' },
];

function normalizePlanKey(name: string) {
  return name.toUpperCase().replace(/\s+/g, '_'); // π.χ. VIP MEMBER -> VIP_MEMBER
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 flex-none">
      <path
        d="M20 6 9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  isAuthenticated?: boolean;   // δώστο από το session σου
  userId?: string | null;      // δώστο από το session σου
};

export default function Pricing({ isAuthenticated = false, userId = null }: Props) {
  const router = useRouter();
  const [audience, setAudience] = useState<'CANDIDATE' | 'COMPANY'>('CANDIDATE');

  const plans = useMemo(
    () => (audience === 'CANDIDATE' ? candidatePlans : companyPlans),
    [audience]
  );

  const handleSelect = async (plan: Plan) => {
    const planKey = normalizePlanKey(plan.name);
    const role = audience === 'CANDIDATE' ? 'candidate' : 'company';

    // Αν δεν είναι συνδεδεμένος → πάει για εγγραφή με προεπιλογή role/plan
    if (!isAuthenticated || !userId) {
      router.push(`/auth/register?role=${role}&plan=${planKey}`);
      return;
    }

    // Συνδεδεμένος:
    if (audience === 'CANDIDATE') {
      if (planKey === 'VIP_MEMBER') {
        // Stripe Checkout για VIP
        try {
          const res = await fetch('/api/billing/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          if (!res.ok) throw new Error('Checkout init failed');
          const { url } = await res.json();
          if (!url) throw new Error('Missing checkout URL');
          window.location.href = url; // redirect στο Stripe Checkout
          return;
        } catch (e) {
          // Optional: εμφάνισε toast/error
          console.error('Checkout error', e);
          return;
        }
      }
      if (planKey === 'FREE') {
        
        router.push('/dashboard');
        return;
      }
    }

    // Επέκταση για εταιρικά πλάνα (SILVER/GOLDEN) – προς το παρόν redirect
    router.push('/dashboard');
  };

  return (
    <section
      id="pricing"
      className="relative py-16 sm:py-20 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/back_pricing.jpg')" }}
    >
      {/* Ελαφρύ overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="mt-3 text-3ξ sm:text-4xl font-bold tracking-tight text-slate-900">
            Choose your plan
          </h2>
          <p className="mt-2 text-slate-600">
            free trial, possibility to update the plan
          </p>
        </div>

        {/* Tabs */}
        <div className="mx-auto mb-8 flex w-full max-w-xl items-center rounded-2xl border bg-white p-1 shadow-sm">
          <button
            onClick={() => setAudience('CANDIDATE')}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
              audience === 'CANDIDATE'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            aria-pressed={audience === 'CANDIDATE'}
          >
            Candidate
          </button>
          <button
            onClick={() => setAudience('COMPANY')}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
              audience === 'COMPANY'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            aria-pressed={audience === 'COMPANY'}
          >
            Company
          </button>
        </div>

        {/* Cards */}
        <div
          className={`grid gap-6 ${
            audience === 'CANDIDATE'
              ? 'sm:grid-cols-2'
              : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {plans.map((p) => {
            const popular = !!p.popular;
            return (
              <div
                key={p.name}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md ${
                  popular ? 'ring-2 ring-violet-500' : 'border-slate-200'
                }`}
              >
                {/* Popular badge */}
                {popular && (
                  <div className="absolute -top-3 right-4 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                    Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-slate-900">{p.name}</h3>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{p.price}</div>
                </div>

                <ul className="space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-slate-700">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckIcon />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(p)}
                  className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition
                    ${popular
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'}
                  `}
                  aria-label={`${p.cta} – ${p.name}`}
                >
                  {p.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* disclaimer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Monthly subscription prices include VAT where applicable.
        </p>
      </div>
    </section>
  );
}
