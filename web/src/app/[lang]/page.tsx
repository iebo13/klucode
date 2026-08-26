import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Crossroads } from '@/components/crossroads';
import { JsonLd } from '@/components/json-ld';
import { Shell } from '@/components/shell';
import { SystemDiagram } from '@/components/diagram';
import {
  ArrowLink,
  ButtonLink,
  Card,
  Eyebrow,
  Faq,
  RHYTHM,
  Section,
  SectionHead,
  Shot,
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

/**
 * The homepage, in six sections.
 *
 * Hero, the four ways with their prices, the three delivered systems, the
 * process in one line per step, the questions about money and time, the ask.
 * It was seven: „Die Ausgangslage" stood between the proof and the prices,
 * arguing against agencies and website kits to a reader who had not asked,
 * and the prices sat 3,000px down behind a pinned 3D section. The argument is
 * a question in the FAQ now, the crossroads is a section of ordinary height,
 * and the prices are inside the second screen.
 *
 * Services before projects, which reverses the previous day's order. That
 * order put the proof first on the strength of what competitors do, and it
 * was right about the principle and wrong about the cost: for the reader who
 * arrived from a search, the prices are the point of the visit, and they were
 * three and a half phone viewports away. The three systems are one section
 * further down with a diagram of the largest. The hero is eyebrow, headline,
 * lead and the two actions, and nothing else: a portrait with a byline and a
 * line of three facts sat under the buttons for an afternoon and the owner
 * took them out, so the face lives on /ueber-mich alone.
 */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = getContent(lang);
  const h = c.home;

  // Projects are literally labelled largest / middle / smallest in the copy;
  // the flagship gets the featured panel.
  const [flagship, ...otherProjects] = c.work.projects;

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
        <div className="relative mx-auto max-w-container px-6 pb-section-lg pt-24 md:px-8">
          <p className="flex items-center gap-2 text-small font-medium text-ink-accent">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink-accent" />
            {h.heroEyebrow}
          </p>
          {/* No cap and no balance, which are the same decision twice.
              `max-w-5xl` held the headline to 1024px inside a 1088px container
              and `text-wrap: balance` then spent that width on three even
              lines, the middle of which was 474px — 614px short of the column.
              Greedy wrapping across the full measure sets it on two lines that
              reach the edge, and a display setting that reaches an edge is the
              difference between a headline and a wireframe. See .rag-natural. */}
          <h1 className={`${RHYTHM.heading} rag-natural text-display`}>
            {h.heroTitle} <span className="text-ink-accent">{h.heroTitleAccent}</span>
          </h1>

          {/* body, not lead, and a short measure. At `lead` this paragraph was
              22px over three lines and 888px wide, which is longer than two of
              the three headline lines above it: the subordinate element
              out-measured the dominant one. It is context, not a second
              headline. */}
          <p className={`${RHYTHM.lead} max-w-measure-tight text-ink-muted`}>{h.heroLead}</p>

          {/* One button, and one text link.

              Two buttons side by side is two primary actions, which is none:
              the eye has nothing to follow and the page has not said what it
              wants. The ask is „Projekt besprechen" and everything else on the
              first screen is a way of putting it off, so the second one is an
              arrow link. */}
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <ButtonLink href={pathFor('contact', lang)} variant="ink">
              {c.ui.ctaPrimary}
            </ButtonLink>
            <ArrowLink onInk href={pathFor('work', lang)}>
              {c.ui.ctaSecondary}
            </ArrowLink>
          </div>

          {/* THE FOLD COMMITS TO A PICTURE, and this is the finding the rest of
              the visual pass was downstream of: the homepage rendered ZERO
              images on a phone and two drawings on a laptop, so there was
              nothing to compose with and no evidence on the page that anything
              had ever been built.

              Full container width rather than a thumbnail in the hero's right
              column, and the reason is legibility rather than taste. At 460px
              this screenshot is a texture; at 1088 it is close to 1:1 and every
              figure on it can be read, which is the only version of it that is
              worth anything. It starts above the fold and continues past it,
              which is what a hero picture is for. */}
          <Shot
            onInk
            eager
            shot={h.heroShot}
            caption={h.heroShotCaption}
            className="mt-12 md:mt-16"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ services */}
      {/* THE CROSSROADS, unpinned. „Vier Wege zur Zusammenarbeit" is already a
          spatial metaphor, so it is one: four lanes off a junction, and at the
          end of each the thing you would actually get. The camera no longer
          reads the scroll. It idles at the junction and glides to a way when
          its row is hovered or focused, which is what the section spent
          1,800px of pinned scrolling to do before, and every row is a link.

          The rows are the section's content and its fallback at once, which is
          why there is exactly one copy of them, and the four names standing at
          the four objects are the same strings again rather than a second copy
          in a texture. See components/crossroads. */}
      <Crossroads
        lang={lang}
        eyebrow={h.servicesEyebrow}
        title={h.servicesTitle}
        lead={h.servicesLead}
        link={{ href: pathFor('services', lang), label: h.servicesLink }}
        hint={h.servicesHint}
        servicesPath={pathFor('services', lang)}
        fromLabel={c.ui.from}
        sceneAlt={h.sceneAlt}
        scenePhoneAlt={h.scenePhoneAlt}
        ways={c.services.items}
      />

      {/* ---------------------------------------------------------------- work */}
      {/* STRUCTURAL EXCEPTION 1 of 2: full-bleed. This is the proof section and
          it is the one place the page is allowed to break the left edge every
          other section shares. The projects are labelled largest / middle /
          smallest in the copy and were rendered as three identical stacked
          cards; the flagship is now a featured panel with the system drawn as
          what it is, and the other two sit 2-up beneath it. */}
      <Section glow bleed>
        {/* The heading keeps the spine. The exception is the GRID, not the
            section: the head sits in the same 72rem container every other
            heading on the page sits in, and only the cards run wide, so the
            offset reads as one deliberate move rather than as a section that
            drifted. */}
        <div className="mx-auto max-w-container px-6 md:px-8">
          <SectionHead
            eyebrow={h.workEyebrow}
            title={h.workTitle}
            lead={h.workLead}
            aside={<ArrowLink href={pathFor('work', lang)}>{h.workLink}</ArrowLink>}
          />
        </div>

        {/* px-6, which is 24px of the viewport and nothing else. That is the
            whole exception: the cards run to within 24px of both edges at every
            width, so at 1280 and at 1920 it reads the same way — as a grid that
            has been let out of the container on purpose. The old version kept a
            104rem cap and 32px of padding, which meant the offset from the
            spine was 64px on the most common desktop viewport and 256px on the
            widest, i.e. a misalignment at one end and a device at the other. */}
        {flagship ? (
          <div className="mx-auto w-full px-6">
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
                <p className="mt-6">
                  <ArrowLink href={`${pathFor('work', lang)}#${flagship.key}`}>
                    {h.workLink}
                  </ArrowLink>
                </p>
              </div>
              {/* The house device as information: the flagship's real topology,
                drawn from the logo's own geometry, from the same content the
                project page draws it from. A diagram that says „drei Systeme,
                eine Datenbank" is proof; an empty dotted box was an apology.

                order-first below md, because stacked the drawing landed AFTER
                the link out of the card: the panel ended on a picture the
                reader had already been invited to leave. */}
              <div className="order-first flex items-center md:order-none">
                <SystemDiagram
                  sources={flagship.diagram.sources}
                  hub={flagship.diagram.hub}
                  out={flagship.diagram.out}
                  label={flagship.diagram.label}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mx-auto mt-6 grid w-full gap-6 px-6 md:grid-cols-2">
          {otherProjects.map((p) => (
            <Card key={p.key}>
              <p className="text-small font-medium text-brand-text">{p.sector}</p>
              <h3 className="mt-2 text-h3">{p.title}</h3>
              <p className="mt-2 text-small text-muted">{p.scope}</p>
              <p className="mt-4 max-w-measure text-muted">{p.summary}</p>
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
          another eyebrow / h2 / lead / grid band.

          One line per step, not the full account. That lives on /ablauf, and
          rendering all four bodies here made this section a copy of the page
          it links to. */}
      <Section tint rhythm="tight">
        {/* Six columns and six, not four and seven. „Warum das in Wochen geht
            und nicht in Quartalen." is a 40px heading and it was set in a 341px
            column, which gives a display face about nine characters a line: it
            broke into five lines ending at five different points, the worst rag
            on the site. The layout had it backwards — the narrow column held
            the type that needs width and the wide one held body copy that is
            measure-capped anyway. At 528px the heading is three lines with a
            steady rag, and the steps lose nothing, because a step's body was
            never allowed past `max-w-measure`. */}
        <div className="grid gap-8 md:grid-cols-12 md:gap-8">
          <div className="md:sticky md:top-32 md:col-span-6 md:self-start">
            <Eyebrow>{h.approachEyebrow}</Eyebrow>
            <h2 className={`${RHYTHM.heading} text-h2`}>{h.approachTitle}</h2>
            <p className={`${RHYTHM.lead} max-w-measure text-lead text-muted`}>{h.approachLead}</p>
            <div className="mt-8">
              <ArrowLink href={pathFor('approach', lang)}>{h.approachLink}</ArrowLink>
            </div>
          </div>

          <ol className="space-y-8 md:col-span-6 md:col-start-7">
            {c.approach.steps.map((s, i) => (
              <li key={s.title} className="flex gap-6">
                {/* FILLED, not outlined, and this is one of the three places
                    the green stops being ink and becomes a ground. The palette
                    is a single hue and it never appeared at any size: viridian
                    lived as small text, hairlines, 8px dots and one button, so
                    the site read as desaturated rather than as monochrome.
                    Monochrome works by pushing the one hue hard somewhere. The
                    pair is brandAction/onBrand rather than brand/onBrand,
                    because that is the pair check_contrast.py already holds to
                    4.5:1 for a label on a fill. */}
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-action font-mono text-eyebrow font-medium text-on-brand"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-h3">{s.title}</h3>
                  <p className="mt-2 max-w-measure text-muted">{s.brief}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- faq */}
      {/* Addressable, because the Leistungen page renders the three price
          questions inline and links here for the rest. */}
      <Section id="faq">
        <SectionHead
          eyebrow={h.faqEyebrow}
          title={h.faqTitle}
          aside={<ArrowLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ArrowLink>}
        />
        {/* The accordion runs the container's full width. It was capped at
            48rem inside a 72rem container, so 320px of the section was empty
            for the whole 812px of its height, next to the questions rather
            than around them — a hole rather than composition. Narrowing and
            centring the column would have closed it and cost the page its
            spine, since a centred 768px column inside 1088 introduces a fifth
            left edge. The questions are one line each and the ANSWERS are
            still measure-capped, which is where the reading width actually
            matters. */}
        <div className="mt-8 md:mt-12">
          <Faq items={h.faq} lang={lang} current="home" />
        </div>
      </Section>

      {/* ----------------------------------------------------------- final cta */}
      {/* The INK CLOSE. The frame's other end: the ask sits on the same slab
          the page opened on, and flows straight into the ink footer below it,
          so the page ends as one dark block with the single thing it exists
          for. The warm dot is fixed warm-300 here — the theme role resolves
          to a value chosen for paper and dies on ink. */}
      <Section ink rhythm="bookend">
        <div>
          {/* The heading runs the container, like the hero's. Capped at
              `max-w-measure` it stopped 470px short of the right edge and the
              section read as a left column with a hole beside it — the same
              defect as the hero, at the other end of the page, and the same
              fix: let the display type reach an edge and there is nothing left
              beside it to be empty. The lead keeps its measure, because a lead
              is for reading. */}
          <h2 className="rag-natural text-h1">{h.finalTitle}</h2>
          <p className="mt-6 max-w-measure text-lead text-ink-muted">{h.finalLead}</p>
          <div className="mt-8">
            <ButtonLink href={pathFor('contact', lang)} variant="ink">
              {c.ui.ctaPrimary}
            </ButtonLink>
          </div>
          {/* The last step should not cost a page load: the reader who is
                already convinced gets the address here. Real data only, and
                at a thumb's height. */}
          {/* The availability line, directly under the action it qualifies.

                It used to float bottom-right of a twelve-column grid at x=923,
                aligned to nothing, as the only thing in the right half of the
                section: the loudest isolated element in the closing ask, and
                what it says is a reason not to get in touch. As a status line
                under the button it is what it actually is — a condition on the
                thing you just read — and the section stops leaving half of
                itself empty to hold it. */}
          <p className="mt-6 text-small text-ink-muted">
            <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warm-300" />
              {c.ui.availablePrefix} {availableFrom(lang)}
            </span>
          </p>

          {filled(profile.email) ? (
            <p className="mt-6 flex flex-wrap items-center gap-x-6 text-small text-ink-muted">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex min-h-[2.75rem] items-center text-ink-accent underline decoration-viridian-300 underline-offset-4"
              >
                {profile.email}
              </a>
              {filled(profile.whatsapp) ? (
                <a
                  href={`https://wa.me/${profile.whatsapp}`}
                  rel="noopener"
                  className="inline-flex min-h-[2.75rem] items-center text-ink-accent underline decoration-viridian-300 underline-offset-4"
                >
                  {c.contact.whatsapp}
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      </Section>
    </Shell>
  );
}
