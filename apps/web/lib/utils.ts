import type { Bilingual } from './public-api';

/** Extract the Arabic (or fallback English) string from a bilingual field */
export function t(field: Bilingual | string | null | undefined, locale: 'ar' | 'en' = 'ar'): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return (locale === 'ar' ? field.ar : field.en) || field.ar || field.en || '';
}

/** Format a date string in Arabic locale */
export function formatDate(date: string | null | undefined, locale = 'ar-EG'): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return date;
  }
}

/** Truncate text to a maximum number of characters */
export function truncate(text: string, max = 120): string {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

/** Build a query string from params */
export function qs(params: Record<string, any>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Star array for ratings */
export function stars(rating: number): boolean[] {
  return Array.from({ length: 5 }, (_, i) => i < rating);
}
