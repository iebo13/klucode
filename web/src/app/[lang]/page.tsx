import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { Shell } from '@/components/shell';
import { ScrollStory } from '@/components/story/scroll-story';
import {
  ArrowLink,
  ButtonLink,
  Card,
  Eyebrow,
  Faq,
  FigureSlot,
  RHYTHM,
  Section,
  SectionHead,
  Tags,
} from '@/components/ui';
import { getContent } from '@/content';
import { filled, profile } from '@/content/profile';
import { openGraphFor, twitterFor } from '@/lib/og';
import { LANGS, isLang, pathFor } from '@/lib/routes';
import { pageSchema } from '@/lib/schema';

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
  const page = c.meta.pages.home;

  return {
    title: page.title,
    description: page.description,
    // The full blocks, not just the page pair — Next replaces a parent's
    // openGraph wholesale, so a partial override here would drop the image,
    // siteName and locale. See lib/og.ts.
    openGraph: openGraphFor(c, lang, `/${lang}/`, page),
    twitter: twitterFor(c, page),
  };
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = getContent(lang);
  const h = c.home;

  // The copy ranks these; the layout used to render them all at equal weight.
  // Services split into two revenue lines and two supporting ones; projects are
  // literally labelled largest / middle / smallest.
  const [revenue, supporting] = [c.services.items.slice(0, 2), c.services.items.slice(2)];
  const [flagship, ...otherProjects] = c.work.projects;

  return (
    <Shell lang={lang} current="home">
      <JsonLd data={pageSchema(lang, c, 'home')} />

      {/* ----------------------------------------------------- the scroll story */}
      {/* „Vom Gespräch zum laufenden System": five full-viewport phases over
          one sticky 3D stage on which the client's future app assembles
          itself — sketched frame, requirement cards, wireframe + fixed price,
          living interface, docked on its server. The story carries the
          narrative; the sections below carry the conversion. Design:
          docs/superpowers/specs/2026-08-19-werkstatt-scroll-story-design.md */}
      <ScrollStory
        hero={{
          eyebrow: h.heroEyebrow,
          title: h.heroTitle,
          accent: h.heroTitleAccent,
          lead: h.heroLead,
          proof: h.heroProof,
        }}
        story={h.story}
        ctaPrimary={{ label: c.ui.ctaPrimary, href: pathFor('contact', lang) }}
        ctaSecondary={{ label: c.ui.ctaSecondary, href: pathFor('work', lang) }}
      />

      {/* ------------------------------------------------------------ services */}
      {/* Two of these are revenue lines and two are supporting work. A uniform
          2x2 said they were four equivalent products. */}
      <Section>
        <SectionHead
          eyebrow={h.servicesEyebrow}
          title={h.servicesTitle}
          aside={<ArrowLink href={pathFor('services', lang)}>{h.servicesLink}</ArrowLink>}
        />
        <div className="mt-8 grid gap-6 md:mt-12 md:grid-cols-2">
          {revenue.map((s) => (
            <div key={s.key} className="panel flex flex-col justify-between gap-8 p-6 md:p-8">
              <div>
                <h3 className="text-h2">{s.name}</h3>
                <p className="mt-3 max-w-measure text-muted">{s.forWhom}</p>
              </div>
              <p className="font-display text-h2 text-brand-text">
                <span className="text-small text-muted">{c.ui.from} </span>
                {s.price}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {supporting.map((s) => (
            <div
              key={s.key}
              className="panel flex flex-wrap items-baseline justify-between gap-4 p-6"
            >
              <div>
                <h3 className="text-h3">{s.name}</h3>
                <p className="mt-1 max-w-measure text-small text-muted">{s.forWhom}</p>
              </div>
              <p className="shrink-0 font-display text-h3 text-brand-text">
                <span className="text-small text-muted">{c.ui.from} </span>
                {s.price}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- work */}
      {/* STRUCTURAL EXCEPTION 1 of 2: full-bleed. This is the proof section and
          it is the one place the page is allowed to break the left edge every
          other section shares. The projects are labelled largest / middle /
          smallest in the copy and were rendered as three identical stacked
          cards; the flagship is now a featured panel with room for a
          screenshot, and the other two sit 2-up beneath it. */}
      <Section tint glow bleed>
        <SectionHead
          eyebrow={h.workEyebrow}
          title={h.workTitle}
          lead={h.workLead}
          aside={<ArrowLink href={pathFor('work', lang)}>{h.workLink}</ArrowLink>}
        />

        {flagship ? (
          <div className="panel mt-8 grid gap-8 p-6 md:mt-12 md:grid-cols-[1.15fr_1fr] md:gap-12 md:p-8">
            <div>
              <p className="text-small font-medium text-brand-text">{flagship.sector}</p>
              <h3 className="mt-2 text-h2">{flagship.title}</h3>
              <p className="mt-2 text-small text-muted">{flagship.scope}</p>
              <p className="mt-6 max-w-measure text-lead text-muted">{flagship.summary}</p>
              {/* The client-approved number, once it exists — the strongest
                  line in the section the moment de.ts/en.ts carry it. */}
              {flagship.metric ? (
                <p className="mt-6 font-display text-h3 text-brand-text">{flagship.metric}</p>
              ) : null}
              <div className="mt-8">
                <Tags items={flagship.stack} />
              </div>
            </div>
            <FigureSlot className="aspect-[4/3] md:aspect-auto md:min-h-[16rem]" />
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {otherProjects.map((p) => (
            <Card key={p.key}>
              <p className="text-small font-medium text-brand-text">{p.sector}</p>
              <h3 className="mt-2 text-h3">{p.title}</h3>
              <p className="mt-2 text-small text-muted">{p.scope}</p>
              <p className="mt-4 text-muted">{p.summary}</p>
              <div className="mt-6">
                <Tags items={p.stack} />
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------ approach */}
      {/* STRUCTURAL EXCEPTION 2 of 2: asymmetric and offset. The heading holds
          columns 1-4 and sticks while the steps scroll past in columns 6-12,
          so the section is read as one thing with four parts rather than as
          another eyebrow / h2 / lead / grid band. */}
      <Section>
        <div className="grid gap-8 md:grid-cols-12 md:gap-8">
          <div className="md:sticky md:top-32 md:col-span-4 md:self-start">
            <Eyebrow>{h.approachEyebrow}</Eyebrow>
            <h2 className={`${RHYTHM.heading} text-h2`}>{h.approachTitle}</h2>
            <p className={`${RHYTHM.lead} max-w-measure text-lead text-muted`}>{h.approachLead}</p>
            <div className="mt-8">
              <ArrowLink href={pathFor('approach', lang)}>{h.approachLink}</ArrowLink>
            </div>
          </div>

          <ol className="space-y-8 md:col-span-7 md:col-start-6">
            {c.approach.steps.map((s, i) => (
              <li key={s.title} className="flex gap-6">
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line font-mono text-eyebrow text-brand-text"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-h3">{s.title}</h3>
                  <p className="mt-2 max-w-measure text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- faq */}
      <Section tint>
        <SectionHead eyebrow={h.faqEyebrow} title={h.faqTitle} />
        <div className="mt-8 max-w-narrow md:mt-12">
          <Faq items={h.faq} />
        </div>
      </Section>

      {/* ----------------------------------------------------------- final cta */}
      <Section>
        <div className="gap-8 md:grid md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <h2 className="text-h1">{h.finalTitle}</h2>
            <p className="mt-6 max-w-measure text-lead text-muted">{h.finalLead}</p>
            <div className="mt-8">
              <ButtonLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ButtonLink>
            </div>
            {/* The last step should not cost a page load: the reader who is
                already convinced gets the address here. Real data only. */}
            {filled(profile.email) ? (
              <p className="mt-6 text-small text-muted">
                <a
                  href={`mailto:${profile.email}`}
                  className="text-brand-text underline decoration-viridian-300 underline-offset-4"
                >
                  {profile.email}
                </a>
                {filled(profile.phone) ? <> · {profile.phone}</> : null}
              </p>
            ) : null}
          </div>
          {/* The availability line lives in the column that used to be empty. */}
          <p className="mt-8 text-small text-muted md:col-span-4 md:col-start-9 md:mt-0 md:text-right">
            <span className="flex items-center gap-2 md:justify-end">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-warm" />
              {c.ui.availablePrefix} {profile.availableFrom[lang]}
            </span>
          </p>
        </div>
      </Section>
    </Shell>
  );
}
