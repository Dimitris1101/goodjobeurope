'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { BillingDetailsForm } from '@/components/BillingDetailsForm';
import { PlanName } from '@/types/plan';

type Role = 'CANDIDATE' | 'COMPANY' | 'ADMIN';

type Me = {
  id: string;
  email?: string;
  role: Role;
};

// only paid plans go through Stripe
const PAID_PLANS: PlanName[] = ['VIP_MEMBER', 'COMPANY_SILVER', 'COMPANY_GOLDEN'];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') as PlanName | null;

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // load /me to get email
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Me>('/me');
        if (!data || data.role === 'ADMIN') {
          router.replace('/');
          return;
        }
        setMe(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // guard: if plan is missing or not allowed → back to plan page
  useEffect(() => {
    if (!plan) return;
    if (!PAID_PLANS.includes(plan)) {
      router.replace('/onboarding/plan');
    }
  }, [plan, router]);

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Missing plan. Redirecting…
      </div>
    );
  }

  if (loading || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Loading…
      </div>
    );
  }

  const userEmail = me.email || '';

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <BillingDetailsForm
        planCode={plan as 'VIP_MEMBER' | 'COMPANY_SILVER' | 'COMPANY_GOLDEN'}
        userEmail={userEmail}
        apiBaseUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
      />
    </div>
  );
}
