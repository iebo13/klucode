import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Shell } from '@/components/shell';
import {
  ArrowLink,
  ButtonLink,
  Card,
  Eyebrow,
  Faq,
  FigureSlot,
  InkPanel,
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

  // The copy ranks these; the layout used to render them all at equal weight.
  // Services split into two revenue lines and two supporting ones; projects are
  // literally labelled largest / middle / smallest.
  const [revenue, supporting] = [c.services.items.slice(0, 2), c.services.items.slice(2)];
  const [flagship, ...otherProjects] = c.work.projects;

  return (
    <Shell lang={lang} current="home">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="aurora grain -z-10" />
        <div aria-hidden="true" className="node-field absolute inset-0 -z-10 opacity-50" />
        <div className="relative mx-auto max-w-container px-6 pb-section pt-20 md:px-10 md:pt-28">
          <Eyebrow>{h.heroEyebrow}</Eyebrow>
          {/* The headline keeps the full container width — narrowing it to make
              room for the figure cost it two extra line breaks and most of its
              impact. text-brand-text, not text-brand: the accent was
              viridian-500 at 2.79:1, so the biggest word on the site failed AA
              for large text, in defiance of the rule tokens.css states in its
              own header comment. viridian-700 measures 5.27:1 here. */}
          <h1 className="mt-6 max-w-4xl text-display">
            {h.heroTitle} <span className="text-brand-text">{h.heroTitleAccent}</span>
          </h1>

          <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-7">
              <p className="max-w-measure text-lead text-muted">{h.heroLead}</p>

              <div className="mt-8 flex flex-wrap gap-4">
                <ButtonLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ButtonLink>
                <ButtonLink href={pathFor('work', lang)} variant="secondary">
                  {c.ui.ctaSecondary}
                </ButtonLink>
              </div>

              <ul className="mt-12 flex flex-wrap gap-3">
                {h.heroProof.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface-raised px-4 py-2 font-mono text-eyebrow uppercase text-muted"
                  >
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Reserved for a screenshot of a real system. Correct ratio now, so
                dropping one in later is a file drop, not a layout change. */}
            <FigureSlot className="hidden aspect-[4/3] lg:col-span-5 lg:block" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- problem */}
      {/* Three bad options and the pitch. The pitch used to get `border-l-2
          border-brand pl-7` — the weakest emphasis device in the system — while
          the three things it argues against each got a card. Now it is the
          fourth cell of a 2x2 and it is inverted, so the visual weight matches
          the argument. Same markup cost. */}
      <Section tint>
        <SectionHead eyebrow={h.problemEyebrow} title={h.problemTitle} lead={h.problemLead} />
        <div className="mt-8 grid gap-6 md:mt-12 md:grid-cols-2">
          {h.problemCards.map((card) => (
            <Card key={card.title}>
              <h3 className="text-h3">{card.title}</h3>
              <p className="mt-3 text-muted">{card.body}</p>
            </Card>
          ))}
          <InkPanel className="flex flex-col justify-center">
            <h3 className="font-display text-h2">{h.answerTitle}</h3>
            <p className="mt-4 max-w-measure text-lead text-ink-muted">{h.answerBody}</p>
          </InkPanel>
        </div>
      </Section>

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
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:sticky md:top-32 md:col-span-4 md:self-start">
            <Eyebrow>{h.approachEyebrow}</Eyebrow>
            <h2 className="mt-3 text-h2">{h.approachTitle}</h2>
            <p className="mt-4 max-w-measure text-lead text-muted">{h.approachLead}</p>
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
      <Section glow>
        <div className="gap-8 md:grid md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <h2 className="text-h1">{h.finalTitle}</h2>
            <p className="mt-6 max-w-measure text-lead text-muted">{h.finalLead}</p>
            <div className="mt-8">
              <ButtonLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ButtonLink>
            </div>
          </div>
          {/* The availability line lives in the column that used to be empty. */}
          <p className="mt-8 text-small text-muted md:col-span-4 md:col-start-9 md:mt-0 md:text-right">
            <span className="flex items-center gap-2 md:justify-end">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
              {c.ui.availablePrefix} {profile.availableFrom[lang]}
            </span>
          </p>
        </div>
      </Section>
    </Shell>
  );
}
