/**
 * Convert a string to a URL-safe slug.
 * Source: name.en per the schema slug-generation rules.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resource path prefixes for redirect generation.
 * When a slug changes, redirects are created for every locale prefix.
 */
export const RESOURCE_PATHS: Record<string, string> = {
  Hospital: 'hospitals',
  MedicalCenter: 'medical-centers',
  Doctor: 'doctors',
  NewsPost: 'news',
  NewsCategory: 'news-categories',
  Page: '', // pages use the slug directly at root
};

export const SUPPORTED_LOCALES = ['ar', 'en'];
