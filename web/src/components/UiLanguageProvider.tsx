'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type UiLanguageMode = 'UI_LANG' | 'ORIGINAL_EN';

type UiLanguageContextValue = {
  uiLang: string;                 // π.χ. "el", "en", "de"
  setUiLang: (lang: string) => void;
  mode: UiLanguageMode;           // UI_LANG ή ORIGINAL_EN
  setMode: (m: UiLanguageMode) => void;
};

const UiLanguageContext = createContext<UiLanguageContextValue | undefined>(
  undefined,
);

export function useUiLanguageContext() {
  const ctx = useContext(UiLanguageContext);
  if (!ctx) {
    throw new Error('useUiLanguageContext must be used within UiLanguageProvider');
  }
  return ctx;
}

export default function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [uiLang, setUiLangState] = useState<string>('en');
  const [mode, setModeState] = useState<UiLanguageMode>('UI_LANG');

  const setUiLang = (lang: string) => {
    setUiLangState(lang);
    try {
      localStorage.setItem('ui.lang', lang);
      // για συμβατότητα με παλιό κώδικα που ίσως διαβάζει αυτό
      localStorage.setItem('uiAccountLang', lang);
    } catch {}
  };

  const setMode = (m: UiLanguageMode) => {
    setModeState(m);
    try {
      localStorage.setItem('ui.mode', m);
    } catch {}
  };

  useEffect(() => {
    // μόνο από localStorage – ΚΑΜΙΑ κλήση στο /me εδώ
    try {
      const storedLang =
        localStorage.getItem('ui.lang') ||
        localStorage.getItem('uiAccountLang') ||
        undefined;

      const storedMode = localStorage.getItem('ui.mode') as UiLanguageMode | null;

      if (storedLang) setUiLangState(storedLang);
      if (storedMode === 'UI_LANG' || storedMode === 'ORIGINAL_EN') {
        setModeState(storedMode);
      }
    } catch {}
  }, []);

  const value: UiLanguageContextValue = {
    uiLang,
    setUiLang,
    mode,
    setMode,
  };

  return (
    <UiLanguageContext.Provider value={value}>
      {children}
    </UiLanguageContext.Provider>
  );
}