/**
 * Contact details, derived one way for every surface that shows them.
 *
 * Source of truth: business/brand/CONTACT_DIRECTORY.md. INSAN publishes **two**
 * hotline numbers, so `contact_phone` is read as a list, not a single value —
 * the header, footer and homepage contact block previously each rendered only
 * the first, and each derived the WhatsApp link differently.
 */

/**
 * A settings value holding one or more phone numbers.
 *
 * Accepts comma, Arabic comma, middle dot, slash or newline as separators, so
 * an operator typing "01500668657 · 01100755556" into the admin panel gets two
 * numbers rather than one unusable string.
 */
export function parsePhones(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(/[,،·/\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Strips spaces and dashes for a tel: href, keeping any leading +. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[\s-]/g, '')}`;
}

/**
 * Builds a wa.me link from a local Egyptian number.
 *
 * CONTACT_DIRECTORY.md §2 exists because this was got wrong: the international
 * format **drops the leading zero** rather than gluing the country code onto
 * the front. 01500668657 becomes 201500668657, not 2001500668657 — the second
 * is a dead link that looks fine until someone taps it. Always derive, never
 * hand-write.
 */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const local = digits.replace(/^20/, '').replace(/^0/, '');
  return `https://wa.me/20${local}`;
}
