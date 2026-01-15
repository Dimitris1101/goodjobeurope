'use client';
import {useRouter, usePathname} from 'next/navigation';
import {useLocale} from 'next-intl';

const locales = [
  {code: 'el', label: 'Ελληνικά'},
  {code: 'en', label: 'English'},
];

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      value={locale}
      onChange={(e) => {
        const next = `/${e.target.value}${pathname.replace(/^\/(el|en)/, '') || ''}`;
        document.cookie = `NEXT_LOCALE=${encodeURIComponent(
        e.target.value
        )}; path=/; max-age=31536000; SameSite=Lax`;
        router.push(next);
      }}
      className="rounded-md border px-2 py-1 text-sm"
      aria-label="Change language"
    >
      {locales.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
