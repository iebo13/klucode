import type { Metadata } from 'next';

import type { Content } from '@/content';
import type { Lang } from '@/lib/routes';

/**
 * The complete Open Graph block for one page.
 *
 * Shared by the layout and the sub-page metadata because Next does NOT deep-
 * merge `openGraph` between segments: a child that sets only `openGraph.url`
 * would silently drop the parent's image, siteName and locale. Every caller
 * therefore builds the whole object through this helper and only the URL
 * varies.
 *
 * `url` and `images` are plain paths on purpose — both are resolved against
 * `metadataBase` (set in the [lang] layout), which already carries any
 * preview base path. See web/README.md "Deployment" for the two-behaviours
 * warning.
 */
export function openGraphFor(
  c: Content,
  lang: Lang,
  path: string,
): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    siteName: c.meta.siteName,
    url: path,
    locale: lang === 'de' ? 'de_DE' : 'en_GB',
    alternateLocale: lang === 'de' ? 'en_GB' : 'de_DE',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: `${c.meta.siteName} — ${c.footer.tagline}`,
      },
    ],
  };
}
