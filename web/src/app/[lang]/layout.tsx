import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { getContent } from '@/content';
import { isPreviewDeploy, profile } from '@/content/profile';
import { asset } from '@/lib/base-path';
import { openGraphFor } from '@/lib/og';
import { businessJsonLd } from '@/lib/schema';
import { LANGS, isLang, type Lang } from '@/lib/routes';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

import '../globals.css';

/**
 * next/font downloads each face at BUILD time and serves it from our own
 * domain. Nothing is requested from fonts.googleapis.com at runtime, so no
 * visitor IP reaches Google — which is the whole point in Germany after
 * LG München I, Az. 3 O 17493/20. See brand/03-visual-identity.md §6.2.
 */
const display = Space_Grotesk({
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

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

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
    // Sub-pages set short titles ('Leistungen') and get the suffix from this
    // template — one place for the pattern instead of eight hand-appended
    // copies that can drift. The home page opts out with `absolute`.
    title: { default: c.meta.title, template: `%s — ${c.meta.siteName}` },
    description: c.meta.description,
    alternates: {
      canonical: `/${lang}/`,
      languages: { de: '/de/', en: '/en/', 'x-default': '/de/' },
    },
    openGraph: openGraphFor(c, lang, `/${lang}/`),
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

  // null while profile.ts still carries todo() placeholders — see lib/schema.ts.
  const business = businessJsonLd(getContent(lang), lang);

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
      <body className="min-h-dvh bg-surface text-body antialiased">
        {business ? <JsonLd data={business} /> : null}
        {children}
      </body>
    </html>
  );
}
