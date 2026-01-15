'use client';

import { useEffect, useState } from 'react';

type Mode = 'preferred' | 'original';

function getPreferredLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return (
    localStorage.getItem('preferredLanguage') ||
    localStorage.getItem('ui.accountLang') ||
    localStorage.getItem('uiAccountLang') ||
    'en'
  ).toLowerCase();
}

function getMode(): Mode {
  if (typeof window === 'undefined') return 'original';
  const raw = (localStorage.getItem('ui.mode') || '').toLowerCase();
  if (raw === 'original' || raw === 'preferred') return raw as Mode;

  const pref = getPreferredLanguage();
  return pref && pref !== 'en' ? 'preferred' : 'original';
}

export default function LanguageTranslateToggle() {
  const [preferred, setPreferred] = useState('en');
  const [mode, setMode] = useState<Mode>('original');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const pref = getPreferredLanguage();
      setPreferred(pref);
      setMode(getMode());
      setReady(true);
    };

    sync();

    const onPref = () => sync();
    const onMode = () => sync();

    window.addEventListener('preferredLanguageChanged', onPref as any);
    window.addEventListener('uiModeChanged', onMode as any);

    return () => {
      window.removeEventListener('preferredLanguageChanged', onPref as any);
      window.removeEventListener('uiModeChanged', onMode as any);
    };
  }, []);

  if (!ready) return null;

  // Αν δεν έχει pref (ή είναι en), δεν δείχνουμε switcher (δεν έχει νόημα)
  if (!preferred || preferred === 'en') return null;

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextMode = e.target.value as Mode;
    localStorage.setItem('ui.mode', nextMode);
    window.dispatchEvent(new CustomEvent('uiModeChanged'));
    window.location.reload(); // καθαρίζει translated DOM
  };

  return (
    <div className="inline-flex items-center gap-2" data-no-translate>
      <span className="text-xs text-gray-700">View:</span>
      <select
        value={mode}
        onChange={onChange}
        className="px-2 py-1 text-xs border rounded-lg bg-white text-black hover:bg-gray-50"
      >
        <option value="preferred" className="text-black">
          UI language ({preferred.toUpperCase()})
        </option>
        <option value="original" className="text-black">
          English (original)
        </option>
      </select>
    </div>
  );
}
