import type { MetadataRoute } from 'next';

import { profile } from '@/content/profile';
import { LANGS, PAGE_KEYS, pathFor, type PageKey } from '@/lib/routes';

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

  // Impressum and Datenschutz are noindex ([page]/page.tsx) and deliberately
  // stay out: a sitemap that submits noindexed URLs produces "submitted URL
  // marked noindex" errors in Search Console.
  const listed: (PageKey | 'home')[] = [
    'home',
    ...PAGE_KEYS.filter((k) => k !== 'imprint' && k !== 'privacy'),
  ];

  for (const lang of LANGS) {
    for (const key of listed) {
      entries.push({
        url: `${base}${pathFor(key, lang)}`,
        priority: priority[key],
        changeFrequency: 'monthly',
        // hreflang: every URL must list ALL language versions INCLUDING
        // itself, plus x-default, or Google treats the annotation set as
        // broken and ignores it. One-sided "the other language only" entries
        // are worse than none.
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
