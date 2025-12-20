'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  role?: 'COMPANY' | 'CANDIDATE';
  name?: string;
};

export default function MessengerHeader({ role, name }: Props) {
  const router = useRouter();

  // ΣΩΣΤΑ dashboards:
  const dashboardHref =
    role === 'COMPANY' ? '/dashboard/company' : '/dashboard/candidate';

  const onLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    router.push('/auth/login');
  };

  return (
    <header className="bg-[#0B0B0F] text-white">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-xs opacity-80">Welcome</div>
          <div className="text-sm font-semibold">
            {name || (role === 'COMPANY' ? 'Company' : 'Candidate')}
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {/* ΜΟΝΟ Dashboard */}
          <Link
            href={dashboardHref}
            className="rounded-full border border-white/30 px-3 py-1.5 text-sm hover:bg-white hover:text-black"
          >
            Dashboard
          </Link>

          <button
            onClick={onLogout}
            className="rounded-full bg-white text-black px-3 py-1.5 text-sm"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}