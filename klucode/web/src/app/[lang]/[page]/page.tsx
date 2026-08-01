import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

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
import { LANGS, PAGE_KEYS, isLang, keyForSlug, slugs, type PageKey } from '@/lib/routes';

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

  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical: `/${lang}/${page}/`,
      languages: {
        [lang]: `/${lang}/${page}/`,
        [other]: `/${other}/${slugs[key][other]}/`,
      },
    },
    // Legal pages carry no marketing value and should not compete in search.
    robots:
      key === 'imprint' || key === 'privacy'
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
      {views[key]}
    </Shell>
  );
}
