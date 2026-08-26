import { Fragment } from 'react';

import { ContactForm } from '@/components/contact-form';
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
  Shot,
  Tags,
} from '@/components/ui';
import type { Content } from '@/content';
import { filled, fullName, openTodos, profile } from '@/content/profile';
import type { Cta } from '@/content/types';
import { asset } from '@/lib/base-path';
import { pathFor, type Lang } from '@/lib/routes';

/**
 * Every page opens on ink, exactly like the homepage — the frame is a site
 * rule, not a homepage feature. The header is a fixed overlay that occupies
 * no layout space, so this slab starts at the viewport's first pixel; the
 * content's top padding (pt-24) is what clears the capsule, and it is tight
 * on purpose — dead space between the capsule and the first line is what
 * breaks the opening's flow.
 */
function PageHero({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <section className="grain relative isolate overflow-hidden bg-ink text-ink-fg">
      <div aria-hidden="true" className="ink-aurora -z-10" />
      <div aria-hidden="true" className="node-field-ink absolute inset-0 -z-10 opacity-60" />
      <div className="relative mx-auto max-w-container px-6 pb-12 pt-24 md:px-8">
        <Eyebrow onInk>{eyebrow}</Eyebrow>
        <h1 className={`${RHYTHM.heading} max-w-4xl text-h1`}>{title}</h1>
        <p className={`${RHYTHM.lead} max-w-measure text-lead text-ink-muted`}>{lead}</p>
      </div>
    </section>
  );
}

/** Reading-width wrapper for the legal pages. */
function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-narrow px-6 py-section md:px-8">{children}</div>;
}

/** The dot before an included line, and the dash before an excluded one. */
function IncludedList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3 text-small">
          <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
          {i}
        </li>
      ))}
    </ul>
  );
}

function ExcludedList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3 text-small text-muted">
          <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-stone-400" />
          {i}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ services */

export function ServicesPage({ lang, c }: { lang: Lang; c: Content }) {
  const s = c.services;
  return (
    <>
      <PageHero eyebrow={s.eyebrow} title={s.title} lead={s.lead} />

      <Section>
        <div className="space-y-6">
          {s.items.map((item) => (
            <Fragment key={item.key}>
              <Card id={item.key} className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-12">
                <div>
                  <h2 className="text-h2">{item.name}</h2>
                  <p className="mt-3 max-w-measure text-small font-medium text-brand-text">
                    {item.forWhom}
                  </p>
                  <p className="mt-4 max-w-measure text-muted">{item.body}</p>
                  <div className="mt-8 flex items-baseline gap-3 border-t border-line pt-6">
                    <span className="text-small text-muted">{c.ui.from}</span>
                    <span className="font-display text-h2 text-brand-text">{item.price}</span>
                  </div>
                  <p className="mt-1 text-small text-muted">{item.priceNote}</p>
                  {/* The offer pointing at the thing that proves it. Two of the
                    four have a delivered case and two do not, and the two that
                    do not simply have no link: a reader who follows one of
                    these must land on something real. */}
                  {item.example ? (
                    <p className="mt-6">
                      <ArrowLink href={`${pathFor('work', lang)}#${item.example.project}`}>
                        {item.example.label}
                      </ArrowLink>
                    </p>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-small font-medium text-muted">{c.ui.includes}</h3>
                  <IncludedList items={item.includes} />
                  {/* Where the fixed price stops, per offer. The single
                      site-wide „Was ich nicht mache" list below says what I do
                      not do at all; this says what THIS price does not buy,
                      which is the question a buyer actually has in front of a
                      number. */}
                  <h3 className="mt-8 text-small font-medium text-muted">{c.ui.excludes}</h3>
                  <ExcludedList items={item.excludes} />
                </div>
              </Card>

              {/* The proposed rung, rendered in price order behind the offer it
                slots in after, and only while the content carries one. It is
                null in both languages until the price is settled: a draft
                offer with a price on a public page is an internal decision
                rendered for customers. */}
              {s.middle && s.middle.after === item.key ? (
                <Card
                  id="middle"
                  className="grid gap-8 border-dashed md:grid-cols-[1.2fr_1fr] md:gap-12"
                >
                  <div>
                    <p className="font-mono text-eyebrow text-muted">{c.ui.draft}</p>
                    <h2 className="mt-3 text-h2">{s.middle.name}</h2>
                    <p className="mt-3 max-w-measure text-small font-medium text-brand-text">
                      {s.middle.forWhom}
                    </p>
                    <p className="mt-4 max-w-measure text-muted">{s.middle.body}</p>
                    <div className="mt-8 flex items-baseline gap-3 border-t border-line pt-6">
                      <span className="text-small text-muted">{c.ui.from}</span>
                      <span className="font-display text-h2 text-brand-text">{s.middle.price}</span>
                    </div>
                    <p className="mt-1 text-small text-muted">{s.middle.priceNote}</p>
                  </div>
                  <div>
                    <h3 className="text-small font-medium text-muted">{c.ui.includes}</h3>
                    <IncludedList items={s.middle.includes} />
                  </div>
                </Card>
              ) : null}
            </Fragment>
          ))}
        </div>
      </Section>

      <Section tint>
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <SectionHead eyebrow={s.howEyebrow} title={s.howTitle} />
            <p className="mt-4 max-w-measure text-muted">{s.howBody}</p>
          </div>
          <div>
            <h2 className="font-display text-h2">{s.notTitle}</h2>
            <p className="mt-4 text-muted">{s.notBody}</p>
            <ExcludedList items={s.notItems} />
          </div>
        </div>
      </Section>

      {/* The price questions, answered on the page where they are asked.

          This was a section whose entire content was a link to the homepage
          FAQ: a price-shopper who had read four cards and the billing terms
          was asked to leave the page to read the answers. The three answers
          about money and time are the same array the homepage renders, so
          they cannot drift, and the link covers the rest. */}
      <Section id="faq">
        <div className="max-w-narrow">
          <h2 className="text-h2">{s.faqTitle}</h2>
          <div className="mt-8">
            <Faq items={c.home.faq.filter((f) => f.price)} lang={lang} current="services" />
          </div>
          <p className="mt-6">
            <ArrowLink href={`${pathFor('home', lang)}#faq`}>{s.faqLink}</ArrowLink>
          </p>
        </div>
      </Section>

      <FinalCta lang={lang} c={c} cta={s.cta} />
    </>
  );
}

/* ---------------------------------------------------------------------- work */

export function WorkPage({ lang, c }: { lang: Lang; c: Content }) {
  const w = c.work;
  return (
    <>
      <PageHero eyebrow={w.eyebrow} title={w.title} lead={w.lead} />

      {w.projects.map((p, i) => {
        // The offer this was delivered under, with its price, so the page
        // does double duty: a reader convinced by the case sees what the
        // matching offer starts at without a page load.
        const offer = p.offer
          ? c.services.items.find((item) => item.key === p.offer?.service)
          : undefined;
        return (
          <Section key={p.key} id={p.key} tint={i % 2 === 1}>
            <div className="grid gap-8 md:grid-cols-[1fr_1.7fr] md:gap-16">
              <div>
                <p className="text-small font-medium text-brand-text">{p.sector}</p>
                <h2 className="mt-3 text-h2">{p.title}</h2>
                <p className="mt-3 text-small text-muted">{p.scope}</p>
                <div className="mt-8">
                  <h3 className="text-small font-medium text-muted">{c.ui.stack}</h3>
                  <div className="mt-3">
                    <Tags items={p.stack} />
                  </div>
                </div>
              </div>

              <div>
                {/* The picture of the thing, above the words about the thing.
                    A real screenshot the moment the client releases one, and
                    until then the system drawn as what it is. One treatment
                    for all three: a dashed box saying a screenshot was coming
                    stood on two of them and nothing on the third, and an
                    empty box with an excuse is worse than a text-only card. */}
                {p.shot ? (
                  // The same frame the homepage hero uses, and the same reason:
                  // a screenshot of somebody else's software is the one thing on
                  // this page that does not belong to the palette, and a dark
                  // browser chrome is what makes the foreign colours read as
                  // something being shown rather than as the page losing its
                  // nerve. object-cover is gone with the fixed 16/10 box — the
                  // picture is cropped where it is captured, so nothing is
                  // cropped twice and the framing cannot drift with the column.
                  <Shot shot={p.shot} className="mb-8" />
                ) : (
                  <div className="panel mb-8 p-6 md:p-8">
                    <SystemDiagram
                      sources={p.diagram.sources}
                      hub={p.diagram.hub}
                      out={p.diagram.out}
                      label={p.diagram.label}
                      className="w-full"
                    />
                  </div>
                )}

                <p className="max-w-measure text-lead">{p.summary}</p>
                <dl className="mt-8 space-y-6">
                  {(
                    [
                      [c.ui.before, p.before],
                      [c.ui.after, p.after],
                      [c.ui.result, p.result],
                    ] as const
                  ).map(([label, text]) => (
                    <div key={label} className="border-l-2 border-line pl-6">
                      <dt className="text-small font-medium text-brand-text">{label}</dt>
                      <dd className="mt-2 max-w-measure text-muted">{text}</dd>
                    </div>
                  ))}
                </dl>

                {/* Slots for the client-approved evidence. Empty until the
                    approvals from brand/01-strategy.md §7 arrive; then filling
                    de.ts/en.ts is the entire change. Nothing on the page says
                    they are coming: a panel apologising for their absence was
                    a second thing the page could not show. */}
                {p.metric ? (
                  <p className="mt-8 max-w-measure font-display text-h3 text-brand-text">
                    {p.metric}
                  </p>
                ) : null}
                {p.quote ? (
                  <figure className="panel mt-8 border-t-2 border-t-brand p-6 md:p-8">
                    {/* Quotation marks belong to the content, not the markup:
                        German copy quotes „so", English copy "so". */}
                    <blockquote className="max-w-measure text-lead">{p.quote.text}</blockquote>
                    <figcaption className="mt-4 text-small text-muted">
                      {p.quote.attribution}
                    </figcaption>
                  </figure>
                ) : null}

                {/* The other half of the evidence chain. A case study that ends
                    blind sends a reader who has just been convinced back to the
                    nav to work out what to buy. */}
                {p.offer ? (
                  <p className="mt-8">
                    <ArrowLink href={`${pathFor('services', lang)}#${p.offer.service}`}>
                      {p.offer.label}
                      {offer ? `, ${c.ui.from} ${offer.price}` : null}
                    </ArrowLink>
                  </p>
                ) : null}
              </div>
            </div>
          </Section>
        );
      })}

      <FinalCta lang={lang} c={c} cta={w.cta} />
    </>
  );
}

/* ------------------------------------------------------------------ approach */

export function ApproachPage({ lang, c }: { lang: Lang; c: Content }) {
  const a = c.approach;
  return (
    <>
      <PageHero eyebrow={a.eyebrow} title={a.title} lead={a.lead} />

      <Section>
        {/* End to end, in one line, before the four parts. The numbers were
            only on the offer cards, on another page. */}
        <p className="max-w-measure text-lead text-muted">{a.duration}</p>
        <ol className="mt-12 grid gap-8 md:grid-cols-2 md:gap-12">
          {a.steps.map((s, i) => (
            <li key={s.title} className="border-t border-line pt-6">
              {/* Filled, like the homepage's. One of the three places the green
                  becomes a ground rather than ink: the palette is a single hue
                  that only ever appeared as small text, hairlines and 8px dots,
                  which is what made it read as desaturated rather than as
                  monochrome. */}
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-action font-mono text-eyebrow font-medium text-on-brand"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-3 font-display text-h3">{s.title}</h2>
              <p className="mt-3 max-w-measure text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* The AI section. Deliberately not the headline of the site, and
          deliberately not hidden either — see brand/01-strategy.md §6. */}
      <Section tint>
        <div className="max-w-narrow">
          <Eyebrow>{a.aiEyebrow}</Eyebrow>
          <h2 className={`${RHYTHM.heading} text-h2`}>{a.aiTitle}</h2>
          {a.aiBody.map((p) => (
            <p key={p.slice(0, 24)} className="mt-4 max-w-measure text-lead text-muted">
              {p}
            </p>
          ))}
          {/* The page's punchline, and it now looks like one. Was `border-l-2
              border-brand pl-7`, the same 2px rule that was doing this job in
              three places across the site. */}
          <InkPanel className="mt-12">
            <h3 className="font-display text-h3">{a.objection.q}</h3>
            <p className="mt-4 max-w-measure text-ink-muted">{a.objection.a}</p>
          </InkPanel>
        </div>
      </Section>

      <Section>
        <h2 className="text-h2">{a.principlesTitle}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {a.principles.map((p) => (
            <Card key={p.title}>
              <h3 className="text-h3">{p.title}</h3>
              <p className="mt-3 text-muted">{p.body}</p>
            </Card>
          ))}
        </div>

        {/* The two questions about continuity and ownership, on the page
            about how the work is done. They were on the homepage, where they
            repeated the first two cards above almost word for word. */}
        <div className="mt-16 max-w-narrow">
          <h2 className="text-h2">{a.faqTitle}</h2>
          <div className="mt-8">
            <Faq items={a.faq} lang={lang} current="approach" />
          </div>
        </div>
      </Section>

      <FinalCta lang={lang} c={c} cta={a.cta} />
    </>
  );
}

/* --------------------------------------------------------------------- about */

export function AboutPage({ lang, c }: { lang: Lang; c: Content }) {
  const a = c.about;
  return (
    <>
      <PageHero eyebrow={a.eyebrow} title={a.title} lead={a.lead} />

      <Section>
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr] md:gap-16">
          <div>
            {a.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="mb-6 max-w-measure text-lead">
                {p}
              </p>
            ))}
            {/* The bio names the three projects. Now it links them, each to
                its own case study rather than to the top of the page. */}
            <h2 className="mt-8 text-small font-medium text-muted">{a.projectsTitle}</h2>
            <ul className="mt-3 space-y-1">
              {c.work.projects.map((p) => (
                <li key={p.key}>
                  <ArrowLink href={`${pathFor('work', lang)}#${p.key}`}>{p.title}</ArrowLink>
                </li>
              ))}
            </ul>
            {/* A quiet aside, not a punchline — so it gets the panel with a
                brand top-rule rather than the inverted slab. The two are now
                distinguishable, which the single 2px left rule never was. */}
            <div className="panel mt-8 border-t-2 border-t-brand p-6 md:p-8">
              <p className="max-w-measure text-muted">{a.nameNote}</p>
            </div>
          </div>

          <div>
            {/* The one photograph the site cannot do without: the person
                behind the „ich". Plain <img> with asset(), matching how the
                repo handles every hand-written public/ URL on a subpath
                deploy.

                Cropped to 4:5 at source rather than by CSS, so object-cover
                has nothing left to crop and the framing cannot drift with the
                column width. 4.0 MB of PNG became 64 kB of WebP, which matters
                on a page whose own checklist sells „Ladezeit unter einer
                Sekunde". */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-line bg-surface-raised">
              <img
                src={asset('/founder.webp')}
                alt={a.portraitAlt}
                width={1000}
                height={1250}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>

            <h2 className="mt-8 text-small font-medium text-muted">{a.factsTitle}</h2>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {a.facts.map((f) => (
                <div key={f.label} className="flex flex-col gap-1 py-4">
                  <dt className="text-small text-muted">{f.label}</dt>
                  <dd className="text-small">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <FinalCta lang={lang} c={c} cta={a.cta} />
    </>
  );
}

/* ------------------------------------------------------------------- contact */

export function ContactPage({ c }: { lang: Lang; c: Content }) {
  const t = c.contact;
  // The Impressum gets a loud warning while profile.ts is unfilled; the
  // contact page must not instead silently ship mailto:«E-Mail-Adresse» and an
  // empty tel: link — on the one page whose whole job is being reachable.
  // filled() is read for its RETURN value, not as a predicate. It hands back
  // the string or undefined, which narrows; testing it narrows nothing, because
  // profile.phone is `string | null` now that there is deliberately no number
  // and TypeScript cannot see through a call to a fact about its argument.
  const email = filled(profile.email);
  const phone = filled(profile.phone);
  const whatsapp = filled(profile.whatsapp);
  const booking = filled(profile.booking);
  const direct = [
    email ? { href: `mailto:${email}`, label: email, external: false } : null,
    phone ? { href: `tel:${phone.replace(/[^\d+]/g, '')}`, label: phone, external: false } : null,
    // The two optional second channels. Both are null until the owner sets
    // them (see profile.ts for what each one costs), and neither renders
    // anything until then.
    whatsapp ? { href: `https://wa.me/${whatsapp}`, label: t.whatsapp, external: true } : null,
    booking ? { href: booking, label: t.booking, external: true } : null,
  ].filter((l): l is { href: string; label: string; external: boolean } => l !== null);
  const street = filled(profile.street);

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

      <Section>
        {/* A hairline between the columns. „Direkt" and „Oder hier" are two
            different offers of the same thing and there was nothing between
            them at all, so the page read as one column that changed its mind
            halfway. A rule rather than a panel around the form: the fields now
            carry their own 3:1 edge, and a panel behind them would put a raised
            surface under a control whose fill is a raised surface. */}
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr] md:gap-16 md:divide-x md:divide-line">
          <div>
            {/* Said before the form rather than after it, because the doubt it
                answers is what stops a visitor filling the form in at all:
                „I do not know which of these I need, so I will come back when I
                have worked it out", which is a tab that closes. */}
            <p className="max-w-measure text-muted">{t.triage}</p>

            {direct.length > 0 ? (
              <>
                <h2 className="mt-12 font-display text-h3">{t.directTitle}</h2>
                <p className="mt-3 max-w-measure text-muted">{t.directBody}</p>
                <ul className="mt-6 space-y-3">
                  {direct.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        rel={l.external ? 'noopener' : undefined}
                        className="inline-flex min-h-[2.75rem] items-center font-display text-h3 text-brand-text underline decoration-viridian-300 underline-offset-4"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
                {/* The place, as a line. A local search lands here wanting to
                    know the business is where it says it is, and the address
                    was only on the Impressum. */}
                {street ? (
                  <address className="mt-6 text-small not-italic text-muted">
                    {fullName}
                    <br />
                    {street}
                    <br />
                    {profile.postalCode} {profile.city}
                  </address>
                ) : null}
              </>
            ) : null}

            <div className={`${direct.length > 0 ? 'mt-12 border-t border-line pt-8' : ''}`}>
              <h2 className="text-small font-medium text-muted">{t.expectTitle}</h2>
              <ol className="mt-4 space-y-3">
                {t.expect.map((e, i) => (
                  <li key={e} className="flex items-start gap-3 text-small text-muted">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-action font-mono text-eyebrow font-medium text-on-brand"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {e}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="md:pl-16">
            <h2 className="mb-8 font-display text-h3">{t.formTitle}</h2>
            <ContactForm t={t} siteName={c.meta.siteName} />
          </div>
        </div>
      </Section>
    </>
  );
}

/* --------------------------------------------------------------------- legal */

export function ImprintPage({ c }: { lang: Lang; c: Content }) {
  const todos = openTodos();
  return (
    <Prose>
      <h1 className="text-h1">{c.imprint.title}</h1>
      <p className="mt-4 text-lead text-muted">{c.imprint.lead}</p>

      {todos.length > 0 ? (
        <div
          role="alert"
          className="mt-8 rounded-lg border-2 border-warning bg-warning-surface p-6 text-stone-900 md:p-8"
        >
          <h2 className="font-display text-h3">{c.imprint.todoWarningTitle}</h2>
          <p className="mt-3 text-small">{c.imprint.todoWarningBody}</p>
          {/* A list marker, not a typed dash. This banner exists to enforce a
              rule the site keeps everywhere else, and it was breaking a
              different one: the house copy rule bans the em dash in anything a
              visitor can read, and this component was printing one per row. */}
          <ul className="mt-4 list-disc space-y-2 pl-6">
            {todos.map((t) => (
              <li key={t} className="font-mono text-small">
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-12 space-y-8">
        {c.imprint.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-h3">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 32)} className="mt-2 text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Prose>
  );
}

export function PrivacyPage({ c }: { lang: Lang; c: Content }) {
  return (
    <Prose>
      <h1 className="text-h1">{c.privacy.title}</h1>
      <p className="mt-4 text-lead text-muted">{c.privacy.lead}</p>
      <p className="mt-3 text-small text-muted">{c.privacy.updated}</p>

      <div className="mt-12 space-y-8">
        {c.privacy.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-h3">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 32)} className="mt-3 max-w-measure text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Prose>
  );
}

/* ----------------------------------------------------------------- shared cta */

/**
 * The closing ask, in the page's own words.
 *
 * One heading and one lead per page, handed in, rather than the homepage's
 * pair repeated on all six: the same H2 closing every page was also the H1 of
 * /kontakt, and a site that says the same sentence seven times reads as a
 * site with one sentence. The button is the same everywhere because the
 * action is. There is no second button: „Projekte ansehen" under every page
 * was, on /projekte, a link to the page the reader was on.
 */
function FinalCta({ lang, c, cta }: { lang: Lang; c: Content; cta: Cta }) {
  const whatsapp = filled(profile.whatsapp);
  return (
    <Section tint>
      <div className="max-w-narrow">
        <h2 className="text-h2">{cta.title}</h2>
        <p className="mt-4 max-w-measure text-lead text-muted">{cta.lead}</p>
        <div className="mt-8">
          <ButtonLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ButtonLink>
        </div>
        {/* The reader who is already convinced should not need the contact
            page as an intermediate stop. Renders only with real data, and at
            a thumb's height: 44px, which the bare link was not. */}
        {filled(profile.email) ? (
          <p className="mt-6 flex flex-wrap items-center gap-x-6 text-small text-muted">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex min-h-[2.75rem] items-center text-brand-text underline decoration-viridian-300 underline-offset-4"
            >
              {profile.email}
            </a>
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                rel="noopener"
                className="inline-flex min-h-[2.75rem] items-center text-brand-text underline decoration-viridian-300 underline-offset-4"
              >
                {c.contact.whatsapp}
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </Section>
  );
}
