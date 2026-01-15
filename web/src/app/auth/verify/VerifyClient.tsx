"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Γίνεται επιβεβαίωση...');

  useEffect(() => {
    const token = sp.get('token');
    if (!token) { setMsg('Λείπει token'); return; }
    (async () => {
      try {
        await api.get('/auth/verify', { params: { token } });
        setMsg('Το email επιβεβαιώθηκε! Μεταφορά στο login…');
        router.replace('/auth/login?verified=1');
      } catch (e:any) {
        setMsg(e?.response?.data?.message ?? 'Σφάλμα επιβεβαίωσης');
      }
    })();
  }, [sp, router]);

  return <div className="min-h-screen grid place-items-center">{msg}</div>;
}
