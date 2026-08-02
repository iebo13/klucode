import type { MetadataRoute } from 'next';

import { profile } from '@/content/profile';
import { LANGS, LEGAL_KEYS, PAGE_KEYS, slugs, type PageKey } from '@/lib/routes';

/**
 * Imprint and privacy are `noindex` — see [page]/page.tsx. Listing a noindex
 * URL in a sitemap asks the crawler to index a page it is simultaneously told
 * not to, which Search Console reports as a conflict. So the sitemap covers
 * every localised route that is *meant* to be indexed, and no others.
 */
const INDEXED = PAGE_KEYS.filter(
  (key): key is Exclude<PageKey, (typeof LEGAL_KEYS)[number]> =>
    !(LEGAL_KEYS as readonly string[]).includes(key),
);

const priority: Partial<Record<PageKey | 'home', number>> = {
  home: 1,
  services: 0.9,
  work: 0.9,
  approach: 0.7,
  about: 0.6,
  contact: 0.8,
};

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = profile.siteUrl;

  const entries: MetadataRoute.Sitemap = [];

  for (const lang of LANGS) {
    const other = lang === 'de' ? 'en' : 'de';

    entries.push({
      url: `${base}/${lang}/`,
      priority: priority.home,
      changeFrequency: 'monthly',
      alternates: { languages: { [other]: `${base}/${other}/` } },
    });

    for (const key of INDEXED) {
      entries.push({
        url: `${base}/${lang}/${slugs[key][lang]}/`,
        priority: priority[key],
        changeFrequency: 'monthly',
        alternates: { languages: { [other]: `${base}/${other}/${slugs[key][other]}/` } },
      });
    }
  }

  return entries;
}
