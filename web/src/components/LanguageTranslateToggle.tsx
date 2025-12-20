// C:\job-matching\web\src\components\LanguageTranslateToggle.tsx
'use client';

import { useEffect, useState } from 'react';

export default function LanguageTranslateToggle() {
  const [accountLang, setAccountLang] = useState('en');
  const [viewLang, setViewLang] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const acc =
      localStorage.getItem('ui.accountLang') ||
      localStorage.getItem('uiAccountLang') ||
      localStorage.getItem('uiLanguage') ||
      'en';

    const view = localStorage.getItem('ui.viewLang') || acc;

    setAccountLang(acc.toLowerCase());
    setViewLang(view.toLowerCase());
    setReady(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setViewLang(value);

    if (typeof window !== 'undefined') {
      localStorage.setItem('ui.viewLang', value);
      window.location.reload();
    }
  };

  if (!ready) return null;
  if (accountLang === 'en') return null; // δεν δείχνουμε toggle αν το account είναι ήδη en

  const valueForSelect = viewLang === 'en' ? 'en' : accountLang;
  const uiLabel = `UI language (${accountLang.toUpperCase()})`;

  return (
    <div
      className="inline-flex items-center gap-2" // ΔΕΝ βάζουμε text-white εδώ
      data-no-translate
    >
      <span className="text-xs text-gray-700">View:</span>
      <select
        value={valueForSelect}
        onChange={handleChange}
        className="px-2 py-1 text-xs border rounded-lg bg-white text-black hover:bg-gray-50"
      >
        <option value={accountLang} className="text-black">
          {uiLabel}
        </option>
        <option value="en" className="text-black">
          English (original)
        </option>
      </select>
    </div>
  );
}
