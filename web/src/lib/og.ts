import type { Metadata } from 'next';

import type { Content } from '@/content';
import type { Lang } from '@/lib/routes';

/**
 * The complete Open Graph / Twitter blocks for one page.
 *
 * Shared by the layout, the home page and the sub-pages because Next does NOT
 * deep-merge `openGraph` between segments: a child that sets only
 * `openGraph.title` silently drops the parent's image, siteName and locale.
 * Every caller therefore builds the whole object through these helpers;
 * only the URL and the title/description pair vary. This is also why the
 * title/description are passed explicitly rather than left to fall back on
 * the resolved <title> — the fallback is exactly the mechanism that once gave
 * every sub-page the site-level card (issue #13).
 *
 * `url` and `images` are plain paths on purpose — both are resolved against
 * `metadataBase` (set in the [lang] layout), which already carries any
 * preview base path. See web/README.md "Deployment" for the two-behaviours
 * warning.
 */

type PagePair = { title: string; description: string };

export function openGraphFor(
  c: Content,
  lang: Lang,
  path: string,
  page?: PagePair,
): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    siteName: c.meta.siteName,
    url: path,
    title: page?.title ?? c.meta.title,
    description: page?.description ?? c.meta.description,
    locale: lang === 'de' ? 'de_DE' : 'en_GB',
    alternateLocale: lang === 'de' ? 'en_GB' : 'de_DE',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: `${c.meta.siteName} · ${c.footer.tagline}`,
      },
    ],
  };
}

/** Without this block a shared link renders as a bare text card. */
export function twitterFor(c: Content, page?: PagePair): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    title: page?.title ?? c.meta.title,
    description: page?.description ?? c.meta.description,
    images: ['/og.png'],
  };
}
