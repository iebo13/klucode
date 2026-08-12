import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import {
  AboutPage,
  ApproachPage,
  ContactPage,
  ImprintPage,
  PrivacyPage,
  ServicesPage,
  WorkPage,
} from '@/components/page-sections';
import { Shell } from '@/components/shell';
import { getContent } from '@/content';
import { isPreviewDeploy } from '@/content/profile';
import { openGraphFor, twitterFor } from '@/lib/og';
import { LANGS, PAGE_KEYS, isLang, keyForSlug, slugs, type PageKey } from '@/lib/routes';
import { pageSchema } from '@/lib/schema';

/**
 * Every page other than the home page, in both languages, from one file.
 * Slugs are localised (/leistungen vs /services) and resolved back to a
 * PageKey here — see lib/routes.ts.
 */

// The full set of pages is known at build time; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.flatMap((lang) => PAGE_KEYS.map((key) => ({ lang, page: slugs[key][lang] })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; page: string }>;
}): Promise<Metadata> {
  const { lang, page } = await params;
  if (!isLang(lang)) return {};
  const key = keyForSlug(page, lang);
  if (!key) return {};

  const c = getContent(lang);
  const m = c.meta.pages[key];
  const other = lang === 'de' ? 'en' : 'de';
  const path = `/${lang}/${page}/`;

  return {
    // Short title; the layout template appends "— KluCode".
    title: m.title,
    description: m.description,
    alternates: {
      canonical: path,
      // The same full set (both languages + x-default) the homepage declares:
      // hreflang annotations that differ in shape across a site are a known
      // reason for Google to ignore them.
      languages: {
        [lang]: path,
        [other]: `/${other}/${slugs[key][other]}/`,
        'x-default': `/de/${slugs[key].de}/`,
      },
    },
    // The page's own card, not the site-level pair every sub-page once
    // shared. Built whole through the helper — Next replaces a parent's
    // openGraph rather than merging it, so a partial override here would
    // drop the image, siteName and locale.
    openGraph: openGraphFor(c, lang, path, m),
    twitter: twitterFor(c, m),
    // Legal pages carry no marketing value and should not compete in search;
    // a preview deploy must stay out of the index entirely.
    robots: isPreviewDeploy
      ? { index: false, follow: false }
      : key === 'imprint' || key === 'privacy'
        ? { index: false, follow: true }
        : { index: true, follow: true },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; page: string }>;
}) {
  const { lang, page } = await params;
  if (!isLang(lang)) notFound();

  const key = keyForSlug(page, lang);
  if (!key) notFound();

  const c = getContent(lang);
  const props = { lang, c } as const;

  const views: Record<PageKey, React.ReactNode> = {
    services: <ServicesPage {...props} />,
    work: <WorkPage {...props} />,
    approach: <ApproachPage {...props} />,
    about: <AboutPage {...props} />,
    contact: <ContactPage {...props} />,
    imprint: <ImprintPage {...props} />,
    privacy: <PrivacyPage {...props} />,
  };

  return (
    <Shell lang={lang} current={key}>
      {/* Legal pages are noindex; a breadcrumb graph for a page that is not in
          the index is noise, so they get nothing. */}
      {key === 'imprint' || key === 'privacy' ? null : <JsonLd data={pageSchema(lang, c, key)} />}
      {views[key]}
    </Shell>
  );
}
