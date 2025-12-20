'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getCookie(name: string) {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : '';
}

export function useAutoTranslate() {
  const pathname = usePathname();
  const observerRef = useRef<MutationObserver | null>(null);
  const debounceIdRef = useRef<number | null>(null);

  useEffect(() => {
    const lang = getCookie('uiLanguage');
    if (!lang) return;

    let cancelled = false;

    async function runOnce() {
      // περίμενε λίγο να ολοκληρωθεί η hydration
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled) return;

      const mod = await import('@/lib/autoTranslate');
      if (cancelled) return;

      try {
        await mod.autoTranslatePage({
          lang,
          apiBase: process.env.NEXT_PUBLIC_API_URL || '',
          // source: undefined => auto-detect
        });

        // μικρό banner για debug/επιβεβαίωση
        const banner = document.createElement('div');
        banner.textContent = `Translated UI → ${lang}`;
        banner.style.cssText =
          'position:fixed;bottom:12px;right:12px;padding:6px 10px;background:#111;color:#fff;border-radius:8px;font-size:12px;z-index:999999;opacity:.9';
        document.body.appendChild(banner);
        window.setTimeout(() => banner.remove(), 1500);
      } catch (e) {
        // σιωπηρά, ώστε να μην ενοχλεί τον χρήστη
        // console.warn('[autoTranslate] failed', e);
      }
    }

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
