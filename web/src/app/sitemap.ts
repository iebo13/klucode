import type { MetadataRoute } from 'next';

import { profile } from '@/content/profile';
import { LANGS, LEGAL_KEYS, PAGE_KEYS, pathFor, type PageKey } from '@/lib/routes';

/**
 * Imprint and privacy are `noindex` — see [page]/page.tsx. Listing a noindex
 * URL in a sitemap asks the crawler to index a page it is simultaneously told
 * not to, which Search Console reports as a conflict. So the sitemap covers
 * every localised route that is *meant* to be indexed, and no others.
 */
const INDEXED: (PageKey | 'home')[] = [
  'home',
  ...PAGE_KEYS.filter((key) => !(LEGAL_KEYS as readonly string[]).includes(key)),
];

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
    for (const key of INDEXED) {
      entries.push({
        url: `${base}${pathFor(key, lang)}`,
        priority: priority[key],
        changeFrequency: 'monthly',
        // hreflang: every URL must list ALL language versions INCLUDING
        // itself, plus x-default, or Google treats the annotation set as
        // broken and ignores it. One-sided "the other language only"
        // entries are worse than none.
        alternates: {
          languages: {
            de: `${base}${pathFor(key, 'de')}`,
            en: `${base}${pathFor(key, 'en')}`,
            'x-default': `${base}${pathFor(key, 'de')}`,
          },
        },
      });
    }
  }

  return entries;
}
