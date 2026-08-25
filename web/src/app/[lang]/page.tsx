import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Crossroads } from '@/components/crossroads';
import { JsonLd } from '@/components/json-ld';
import { ProblemOptions } from '@/components/problem';
import { Shell } from '@/components/shell';
import { SystemDiagram } from '@/components/diagram';
import {
  ArrowLink,
  ButtonLink,
  Card,
  Eyebrow,
  Faq,
  InkPanel,
  RHYTHM,
  Section,
  SectionHead,
  Tags,
} from '@/components/ui';
import { getContent } from '@/content';
import { availableFrom, filled, profile } from '@/content/profile';
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

  // Projects are literally labelled largest / middle / smallest in the copy;
  // the flagship gets the featured panel.
  const [flagship, ...otherProjects] = c.work.projects;

  // The flagship drawn as what it is. Labels are content, so they localise.
  const diagram =
    lang === 'de'
      ? {
          sources: ['CRM', 'Provisionsabrechnung', 'Vergleichsportal'] as const,
          hub: 'PostgreSQL · eine Datenbank',
          out: 'Plesk-Server',
          label:
            'Systemdiagramm: CRM, Provisionsabrechnung und Vergleichsportal teilen eine PostgreSQL-Datenbank auf einem Plesk-Server.',
        }
      : {
          sources: ['CRM', 'Commission billing', 'Comparison portal'] as const,
          hub: 'PostgreSQL · one database',
          out: 'Plesk server',
          label:
            'System diagram: the CRM, commission billing and comparison portal share one PostgreSQL database on one Plesk server.',
        };

  return (
    <Shell lang={lang} current="home">
      <JsonLd data={pageSchema(lang, c, 'home')} />

      {/* ---------------------------------------------------------------- hero */}
      {/* The INK OPENING. The page is framed in ink: it opens on the same
          dark slab it closes on (the footer), and everything between is paper.
          The slab is pulled up under the glass capsule so the frame starts at
          the viewport edge, in both themes. All colour on this surface uses the fixed ink roles — ink is
          dark in both themes, so nothing here flips. */}
      {/* The header is a fixed overlay (see header.tsx), so this section is
          the first thing in the layout flow and the ink starts at the
          viewport's first pixel — no margin arithmetic against the header's
          height, which proved fragile across zoom levels and viewports. */}
      <section className="grain relative isolate overflow-hidden bg-ink text-ink-fg">
        <div aria-hidden="true" className="ink-aurora -z-10" />
        <div aria-hidden="true" className="node-field-ink absolute inset-0 -z-10 opacity-60" />
        <div className="relative mx-auto max-w-container px-6 pb-section pt-24 md:px-8">
          <p className="flex items-center gap-2 text-small font-medium text-ink-accent">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink-accent" />
            {h.heroEyebrow}
          </p>
          <h1 className={`${RHYTHM.heading} max-w-5xl text-display`}>
            {h.heroTitle} <span className="text-ink-accent">{h.heroTitleAccent}</span>
          </h1>

          <p className={`${RHYTHM.lead} max-w-measure text-lead text-ink-muted`}>{h.heroLead}</p>

          {/* One button, and one text link.

              Two buttons side by side is two primary actions, which is none:
              the eye has nothing to follow and the page has not said what it
              wants. The ask is „Projekt besprechen" and everything else on the
              first screen is a way of putting it off, so the second one is an
              arrow link now.

              It still points at the work rather than at the prices, which is
              what the audit suggested. The prices are one section further down
              than the proof on purpose: „Bewiesen statt behauptet" is the
              order every stronger competitor in this segment uses, and it is
              the change this branch made yesterday. A hero link straight to
              #services would undo it for exactly the reader who most needs the
              proof first. */}
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <ButtonLink href={pathFor('contact', lang)} variant="ink">
              {c.ui.ctaPrimary}
            </ButtonLink>
            <ArrowLink onInk href={pathFor('work', lang)}>
              {c.ui.ctaSecondary}
            </ArrowLink>
          </div>

          {/* Proof as clear-glass chips: on this surface the blur has the node
              field and aurora underneath it, which is the one condition glass
              needs to actually refract. */}
          <ul className="mt-12 flex flex-wrap gap-3">
            {h.heroProof.map((p) => (
              <li
                key={p}
                className="glass-chip flex items-center gap-2 rounded-full px-4 py-2 text-small text-ink-muted"
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ink-accent" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PROOF BEFORE PRICE, and this band used to sit after the crossroads.

          The order was hero, the problem, the price board, and only then the
          three delivered systems, so a first-time visitor was asked to take in
          „ab 9.000 €" before seeing one thing that had been built. Both of the
          stronger competitors in this market put their credibility devices
          immediately after the hero and their prices further down. Price
          transparency is still the right call for this segment, it just lands
          better on top of capability than under it.

          It also follows the hero properly now: the hero's chips say „Drei
          Systeme im Produktivbetrieb" and the next thing on the page is those
          three systems. The crossroads is untouched and still runs problem,
          answer, prices in one move. */}
      {/* ---------------------------------------------------------------- work */}
      {/* STRUCTURAL EXCEPTION 1 of 2: full-bleed. This is the proof section and
          it is the one place the page is allowed to break the left edge every
          other section shares. The projects are labelled largest / middle /
          smallest in the copy and were rendered as three identical stacked
          cards; the flagship is now a featured panel with room for a
          screenshot, and the other two sit 2-up beneath it. */}
      <Section glow bleed>
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
              {/* h3 like its two sibling cards: the featured panel is marked by
                  layout and the figure, not by a third heading size. */}
              <h3 className="mt-2 text-h3">{flagship.title}</h3>
              <p className="mt-2 text-small text-muted">{flagship.scope}</p>
              <p className="mt-4 max-w-measure text-muted">{flagship.summary}</p>
              {/* The client-approved number, once it exists — the strongest
                  line in the section the moment de.ts/en.ts carry it. */}
              {flagship.metric ? (
                <p className="mt-6 font-display text-h3 text-brand-text">{flagship.metric}</p>
              ) : null}
              <div className="mt-8">
                <Tags items={flagship.stack} />
              </div>
            </div>
            {/* The house device as information: the flagship's real topology,
                drawn from the logo's own geometry. This replaced an empty
                figure slot — a diagram that says „drei Systeme, eine
                Datenbank" is proof; an empty dotted box was an apology. */}
            <div className="flex items-center">
              <SystemDiagram
                sources={diagram.sources}
                hub={diagram.hub}
                out={diagram.out}
                label={diagram.label}
                className="w-full"
              />
            </div>
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

      {/* ------------------------------------------------------------- problem */}
      {/* „Die Ausgangslage", back on paper and back at the reader's own pace.

          It spent a day as the first act of the crossroads, pinned, with the
          camera closing the distance to the junction while the argument was
          made. The merge was worth trying and it is undone with its reasons
          written down: see the note at the top of components/problem.tsx and
          the one at the top of crossroads/progress.ts. The short version is
          that 122svh of pinned scroll bought a picture that was not about what
          the words were about, and the experiment that tried to make it about
          that returned a measured no.

          What survives the reversal is the striking: each option fails as you
          leave it, and now that runs for every visitor rather than only for
          the ones without a scene. */}
      {/* Only the list is a client island. The heading and the answer panel are
          server-rendered and handed in, so 'use client' does not drag Section,
          SectionHead and InkPanel into every visitor's First Load JS. */}
      <Section>
        <SectionHead eyebrow={h.problemEyebrow} title={h.problemTitle} lead={h.problemLead} />
        <ProblemOptions cards={h.problemCards}>
          <InkPanel className="mt-8 md:mt-12">
            <div className="gap-8 md:grid md:grid-cols-12">
              <h3 className="text-h3 text-ink-accent md:col-span-4">{h.answerTitle}</h3>
              <p className="mt-4 max-w-measure text-ink-muted md:col-span-8 md:mt-0">
                {h.answerBody}
              </p>
            </div>
          </InkPanel>
        </ProblemOptions>
      </Section>

      {/* ------------------------------------------------------------ services */}
      {/* THE CROSSROADS. „Vier Wege zur Zusammenarbeit" is already a spatial
          metaphor, so it is one: four lanes off a junction, and at the end of
          each the thing you would actually get. It opens at the junction now,
          straight off the answer the section above it lands on.

          The rows are the section's content and its fallback at once, which is
          why there is exactly one copy of them, and the four names standing at
          the four objects are the same strings again rather than a second copy
          in a texture. See components/crossroads. */}
      <Crossroads
        lang={lang}
        eyebrow={h.servicesEyebrow}
        title={h.servicesTitle}
        link={{ href: pathFor('services', lang), label: h.servicesLink }}
        fromLabel={c.ui.from}
        sceneAlt={h.sceneAlt}
        ways={c.services.items}
      />

      {/* ------------------------------------------------------------ approach */}
      {/* STRUCTURAL EXCEPTION 2 of 2: asymmetric and offset. The heading holds
          columns 1-4 and sticks while the steps scroll past in columns 6-12,
          so the section is read as one thing with four parts rather than as
          another eyebrow / h2 / lead / grid band. */}
      <Section tint>
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
      {/* Addressable, because the Leistungen page is where price objections
          actually get raised and the answer to the loudest of them lives here.
          Six answers on the homepage that the page selling the prices does not
          link to is six answers most price-shoppers never reach. */}
      <Section id="faq">
        <SectionHead eyebrow={h.faqEyebrow} title={h.faqTitle} />
        <div className="mt-8 max-w-narrow md:mt-12">
          <Faq items={h.faq} lang={lang} />
        </div>
      </Section>

      {/* ----------------------------------------------------------- final cta */}
      {/* The INK CLOSE. The frame's other end: the ask sits on the same slab
          the page opened on, and flows straight into the ink footer below it,
          so the page ends as one dark block with the single thing it exists
          for. The warm dot is fixed warm-300 here — the theme role resolves
          to a value chosen for paper and dies on ink. */}
      <Section ink>
        <div className="gap-8 md:grid md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <h2 className="text-h1">{h.finalTitle}</h2>
            <p className="mt-6 max-w-measure text-lead text-ink-muted">{h.finalLead}</p>
            <div className="mt-8">
              <ButtonLink href={pathFor('contact', lang)} variant="ink">
                {c.ui.ctaPrimary}
              </ButtonLink>
            </div>
            {/* The last step should not cost a page load: the reader who is
                already convinced gets the address here. Real data only. */}
            {filled(profile.email) ? (
              <p className="mt-6 text-small text-ink-muted">
                <a
                  href={`mailto:${profile.email}`}
                  className="text-ink-accent underline decoration-viridian-300 underline-offset-4"
                >
                  {profile.email}
                </a>
                {filled(profile.phone) ? <> · {profile.phone}</> : null}
              </p>
            ) : null}
          </div>
          {/* The availability line lives in the column that used to be empty —
              as a glass chip, like the hero's proof. */}
          <p className="mt-8 text-small text-ink-muted md:col-span-4 md:col-start-9 md:mt-0 md:text-right">
            <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warm-300" />
              {c.ui.availablePrefix} {availableFrom(lang)}
            </span>
          </p>
        </div>
      </Section>
    </Shell>
  );
}
