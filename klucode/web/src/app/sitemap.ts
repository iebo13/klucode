import type { MetadataRoute } from 'next';

import { profile } from '@/content/profile';
import { LANGS, PAGE_KEYS, slugs, type PageKey } from '@/lib/routes';

const priority: Partial<Record<PageKey | 'home', number>> = {
  home: 1,
  services: 0.9,
  work: 0.9,
  approach: 0.7,
  about: 0.6,
  contact: 0.8,
  imprint: 0.1,
  privacy: 0.1,
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

    for (const key of PAGE_KEYS) {
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
