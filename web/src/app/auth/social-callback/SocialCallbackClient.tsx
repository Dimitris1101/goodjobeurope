"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SocialCallbackPage() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = sp.get('token');
    const error = sp.get('error');

    if (error) {
      // Προώθηση στη login με μήνυμα
      router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (token) {
      localStorage.setItem('access_token', token);
      router.replace('/dashboard'); // ή όπου θέλεις
      return;
    }
    router.replace('/auth/login');
  }, [sp, router]);

  return <p className="p-4 text-sm">Completing sign-in…</p>;
}
