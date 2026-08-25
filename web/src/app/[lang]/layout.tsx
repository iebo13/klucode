import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Schibsted_Grotesk } from 'next/font/google';
import { notFound } from 'next/navigation';

import { getContent } from '@/content';
import { isPreviewDeploy, profile } from '@/content/profile';
import { asset } from '@/lib/base-path';
import { openGraphFor, twitterFor } from '@/lib/og';
import { LANGS, isLang, type Lang } from '@/lib/routes';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

import '../globals.css';

/**
 * next/font downloads each face at BUILD time and serves it from our own
 * domain. Nothing is requested from fonts.googleapis.com at runtime, so no
 * visitor IP reaches Google — which is the whole point in Germany after
 * LG München I, Az. 3 O 17493/20. See brand/03-visual-identity.md §6.2.
 */
const display = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

/**
 * 400 only, and it was 400 and 500.
 *
 * Every mono element on the site is an eyebrow, a tag, a step number or a
 * diagram label, and not one of them sets a weight or sits inside anything
 * that does: `Eyebrow` is font-medium but it is set in the BODY face, and no
 * rule in globals.css or tokens.css pairs the mono variable with a weight. So
 * the 500 was downloaded on every visit and drawn never.
 */
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

/**
 * The browser chrome, so a phone does not frame an ink page in white.
 *
 * Two entries and not one, because this site has two designed themes rather
 * than one theme and its inversion, and a single theme-color would be wrong in
 * whichever half of the audience it did not match. The values are the `surface`
 * role in each theme, stone.100 and stone.950, which is what `body` paints.
 *
 * Literals rather than var(--kc-surface): this is a meta tag, it is read by the
 * browser before any stylesheet has applied, and a custom property there
 * resolves to nothing. They are the same two hexes tokens.css generates, and
 * check_contrast.py already guards the pair they come from.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EAEEEB' },
    { media: '(prefers-color-scheme: dark)', color: '#1C201C' },
  ],
};

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const c = getContent(lang);

  return {
    metadataBase: new URL(profile.siteUrl),
    // No-op template on purpose: every content title carries its own
    // "— KluCode" suffix, because scripts/check-meta.mjs asserts length and
    // uniqueness on the raw content strings — a template-appended suffix
    // would be invisible to it and the budget would silently lie.
    title: { default: c.meta.title, template: `%s` },
    description: c.meta.description,
    alternates: {
      canonical: `/${lang}/`,
      languages: { de: '/de/', en: '/en/', 'x-default': '/de/' },
    },
    openGraph: openGraphFor(c, lang, `/${lang}/`),
    twitter: twitterFor(c),
    icons: {
      icon: [{ url: asset('/favicon.svg'), type: 'image/svg+xml' }],
      apple: asset('/apple-touch-icon.png'),
    },
    // A preview deploy is a full duplicate of the production site on another
    // origin; letting it into the index would make it compete with klucode.de.
    robots: isPreviewDeploy ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    // suppressHydrationWarning: the script below writes data-theme onto this
    // element before React sees it, so the client tree legitimately differs
    // from the server tree by exactly that one attribute.
    <html
      lang={lang as Lang}
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        {/* Blocking on purpose, and before any stylesheet. Deferring it is
            what produces the white flash on a dark-themed reload. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* Structured data is emitted per page (lib/schema.ts pageSchema), not
          here — the layout cannot know which page's graph to claim. */}
      <body className="min-h-dvh bg-surface text-body antialiased">{children}</body>
    </html>
  );
}
