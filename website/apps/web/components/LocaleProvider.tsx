'use client';
import { createContext, useContext, ReactNode } from 'react';
import type { Bilingual } from '@/lib/public-api';

const LocaleContext = createContext<'ar' | 'en'>('ar');

export function LocaleProvider({ children, locale }: { children: ReactNode, locale: 'ar' | 'en' }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return (field: Bilingual | string | null | undefined) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return (locale === 'ar' ? field.ar : field.en) || field.ar || field.en || '';
  };
}
