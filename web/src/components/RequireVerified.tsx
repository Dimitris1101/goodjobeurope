'use client';
import { useMe } from '@/hooks/useMe';
import VerifyBanner from './VerifyBanner';

export default function RequireVerified({ children }: { children: React.ReactNode }) {
  const { me, loading } = useMe();

  if (loading) return <div className="p-6">Φόρτωση…</div>;
  if (!me) return null; // το interceptor θα πάει login

  if (!me.emailVerified) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <VerifyBanner />
        <div className="mt-4 text-sm text-gray-600">
          Για να συνεχίσεις, επιβεβαίωσε το email σου.
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
