/**
 * Bilingual routing.
 *
 * Slugs are localised — /leistungen and /services, not /de/services — because
 * German search traffic is the point of the German side. The `[page]` route
 * resolves a slug back to a PageKey and renders the matching section.
 */

export const LANGS = ['de', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'de';

export const PAGE_KEYS = [
  'services',
  'work',
  'approach',
  'about',
  'contact',
  'imprint',
  'privacy',
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/** Pages that appear in the main navigation, in order. */
export const NAV_KEYS = ['services', 'work', 'approach', 'about'] as const;

/** Pages that appear only in the footer. */
export const LEGAL_KEYS = ['imprint', 'privacy'] as const;

export const slugs: Record<PageKey, Record<Lang, string>> = {
  services: { de: 'leistungen', en: 'services' },
  work: { de: 'projekte', en: 'work' },
  approach: { de: 'ansatz', en: 'approach' },
  about: { de: 'ueber-mich', en: 'about' },
  contact: { de: 'kontakt', en: 'contact' },
  imprint: { de: 'impressum', en: 'imprint' },
  privacy: { de: 'datenschutz', en: 'privacy' },
};

/** Path for a page in a language. `home` is the language root. */
export function pathFor(key: PageKey | 'home', lang: Lang): string {
  if (key === 'home') return `/${lang}/`;
  return `/${lang}/${slugs[key][lang]}/`;
}

/** Resolve a URL slug back to its PageKey, or null if it is not ours. */
export function keyForSlug(slug: string, lang: Lang): PageKey | null {
  return PAGE_KEYS.find((k) => slugs[k][lang] === slug) ?? null;
}

/** The same page in the other language — for the language switch. */
export function alternatePath(key: PageKey | 'home', lang: Lang): string {
  return pathFor(key, lang === 'de' ? 'en' : 'de');
}

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}
