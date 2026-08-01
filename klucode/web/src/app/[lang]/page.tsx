import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Shell } from '@/components/shell';
import {
  ArrowLink,
  ButtonLink,
  Card,
  Eyebrow,
  Faq,
  Section,
  SectionHead,
  Tags,
} from '@/components/ui';
import { getContent } from '@/content';
import { profile } from '@/content/profile';
import { LANGS, isLang, pathFor } from '@/lib/routes';

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
  const { meta } = getContent(lang);
  return { title: meta.pages.home.title, description: meta.pages.home.description };
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = getContent(lang);
  const h = c.home;

  return (
    <Shell lang={lang} current="home">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="aurora grain -z-10" />
        <div aria-hidden="true" className="node-field absolute inset-0 -z-10 opacity-50" />
        <div className="relative mx-auto max-w-container px-6 pb-section pt-20 md:px-10 md:pt-28">
          <Eyebrow>{h.heroEyebrow}</Eyebrow>
          <h1 className="mt-6 max-w-4xl text-display">
            {h.heroTitle} <span className="text-brand">{h.heroTitleAccent}</span>
          </h1>
          <p className="mt-8 max-w-measure text-lead text-muted">{h.heroLead}</p>

          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ButtonLink>
            <ButtonLink href={pathFor('work', lang)} variant="secondary">
              {c.ui.ctaSecondary}
            </ButtonLink>
          </div>

          <ul className="mt-14 flex flex-wrap gap-3">
            {h.heroProof.map((p) => (
              <li
                key={p}
                className="glass glass-sm flex items-center gap-2.5 px-4 py-2 font-mono text-eyebrow uppercase text-muted"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------- problem */}
      <Section tint glow>
        <SectionHead eyebrow={h.problemEyebrow} title={h.problemTitle} lead={h.problemLead} />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {h.problemCards.map((card) => (
            <Card key={card.title}>
              <h3 className="text-h3">{card.title}</h3>
              <p className="mt-3 text-muted">{card.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-14 border-l-2 border-brand pl-7">
          <h3 className="font-display text-h2">{h.answerTitle}</h3>
          <p className="mt-4 max-w-measure text-lead">{h.answerBody}</p>
        </div>
      </Section>

      {/* ------------------------------------------------------------ services */}
      <Section glow>
        <SectionHead eyebrow={h.servicesEyebrow} title={h.servicesTitle} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {c.services.items.map((s) => (
            <div
              key={s.key}
              className="glass flex flex-col justify-between gap-6 rounded-glass p-8"
            >
              <div>
                <h3 className="text-h3">{s.name}</h3>
                <p className="mt-2 text-small text-muted">{s.forWhom}</p>
              </div>
              <p className="font-display text-h3 text-brand-text">
                <span className="font-mono text-eyebrow uppercase text-muted">{c.ui.from} </span>
                {s.price}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <ArrowLink href={pathFor('services', lang)}>{h.servicesLink}</ArrowLink>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- work */}
      <Section tint glow>
        <SectionHead eyebrow={h.workEyebrow} title={h.workTitle} lead={h.workLead} />
        <div className="mt-14 space-y-6">
          {c.work.projects.map((p) => (
            <Card key={p.key} className="grid gap-6 md:grid-cols-[1fr_1.6fr] md:gap-12">
              <div>
                <p className="font-mono text-eyebrow uppercase text-brand-text">{p.sector}</p>
                <h3 className="mt-3 text-h3">{p.title}</h3>
                <p className="mt-2 font-mono text-eyebrow uppercase text-muted">{p.scope}</p>
              </div>
              <div>
                <p className="text-muted">{p.summary}</p>
                <div className="mt-6">
                  <Tags items={p.stack} />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-10">
          <ArrowLink href={pathFor('work', lang)}>{h.workLink}</ArrowLink>
        </div>
      </Section>

      {/* ------------------------------------------------------------ approach */}
      <Section>
        <div className="grid gap-14 md:grid-cols-2 md:items-start md:gap-20">
          <SectionHead eyebrow={h.approachEyebrow} title={h.approachTitle} lead={h.approachLead} />
          <ol className="space-y-8">
            {c.approach.steps.map((s, i) => (
              <li key={s.title} className="flex gap-6">
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line font-mono text-eyebrow text-brand-text"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-h3">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-12">
          <ArrowLink href={pathFor('approach', lang)}>{h.approachLink}</ArrowLink>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- faq */}
      <Section tint>
        <SectionHead eyebrow={h.faqEyebrow} title={h.faqTitle} />
        <div className="mt-12 max-w-narrow">
          <Faq items={h.faq} />
        </div>
      </Section>

      {/* ----------------------------------------------------------- final cta */}
      <Section glow>
        <div className="max-w-narrow">
          <h2 className="text-h1">{h.finalTitle}</h2>
          <p className="mt-6 max-w-measure text-lead text-muted">{h.finalLead}</p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <ButtonLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ButtonLink>
            <span className="font-mono text-eyebrow uppercase text-muted">
              {c.ui.availablePrefix} {profile.availableFrom[lang]}
            </span>
          </div>
        </div>
      </Section>
    </Shell>
  );
}
