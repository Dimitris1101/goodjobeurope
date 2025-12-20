// src/i18n.ts
export const locales = ['el', 'en'] as const;
export const defaultLocale = 'el';

// 'always' => τα URLs έχουν πάντα prefix (/el, /en)
export const localePrefix = 'always';

export type Locale = (typeof locales)[number];