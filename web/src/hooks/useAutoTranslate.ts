'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

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

  // default: αν δεν έχει pref (ή είναι en), δείξε original
  const pref = getPreferredLanguage();
  return pref && pref !== 'en' ? 'preferred' : 'original';
}

export function useAutoTranslate() {
  const pathname = usePathname();
  const observerRef = useRef<MutationObserver | null>(null);
  const debounceIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const run = async () => {
      const mode = getMode();
      if (mode === 'original') return;

      const lang = getPreferredLanguage();
      if (!lang || lang === 'en') return;

      // περίμενε λίγο να ολοκληρωθεί η hydration
      await new Promise((r) => setTimeout(r, 120));

      const mod = await import('@/lib/autoTranslate');

      try {
        await mod.autoTranslatePage({
          lang,
          apiBase: process.env.NEXT_PUBLIC_API_URL || '',
        });
      } catch {
        // σιωπηρά
      }
    };

    let cancelled = false;
    const runOnce = async () => {
      if (cancelled) return;
      await run();
    };

    // πρώτη εκτέλεση σε κάθε αλλαγή διαδρομής
    void runOnce();

    // παρακολούθηση DOM για δυναμικές αλλαγές
    if (!observerRef.current) {
      observerRef.current = new MutationObserver(() => {
        if (debounceIdRef.current) window.clearTimeout(debounceIdRef.current);
        debounceIdRef.current = window.setTimeout(() => {
          void runOnce();
        }, 120);
      });

      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // αν αλλάξει mode/lang από switcher, κάνουμε hard reload εκεί, οπότε εδώ δεν χρειάζεται listener
    return () => {
      cancelled = true;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (debounceIdRef.current) {
        window.clearTimeout(debounceIdRef.current);
        debounceIdRef.current = null;
      }
    };
  }, [pathname]);
}
