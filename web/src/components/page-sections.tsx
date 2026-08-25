import Link from 'next/link';
import { Fragment } from 'react';

import { ContactForm } from '@/components/contact-form';
import {
  ArrowLink,
  ButtonLink,
  Card,
  Eyebrow,
  InkPanel,
  RHYTHM,
  Section,
  SectionHead,
  Tags,
} from '@/components/ui';
import type { Content } from '@/content';
import { filled, openTodos, profile } from '@/content/profile';
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
                  <ul className="mt-4 space-y-3">
                    {item.includes.map((i) => (
                      <li key={i} className="flex gap-3 text-small">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand"
                        />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* The proposed rung, rendered in price order behind the offer it
                slots in after. Marked as a proposal on the page as well as in
                the content, because a price nobody has agreed to must not be
                indistinguishable from the four that are settled. */}
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
                    <ul className="mt-4 space-y-3">
                      {s.middle.includes.map((i) => (
                        <li key={i} className="flex gap-3 text-small">
                          <span
                            aria-hidden="true"
                            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand"
                          />
                          {i}
                        </li>
                      ))}
                    </ul>
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
            <ul className="mt-6 space-y-3">
              {s.notItems.map((i) => (
                <li key={i} className="flex gap-3 text-small text-muted">
                  <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-stone-400" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* The price objection is formed on this page and answered on the home
          page, and until now nothing joined the two. Six answers including
          „Was kostet das?" sat one click away with no click to make. */}
      {/* The visitor who cannot place themselves. The site's answer has always
          been the 30 minute call, and until now it was never offered on the
          page where the doubt forms. */}
      <Section>
        <p className="max-w-measure text-lead text-muted">{s.triage}</p>
      </Section>

      <Section>
        <div className="max-w-narrow">
          <h2 className="font-display text-h2">{s.faqTitle}</h2>
          <p className="mt-4 text-muted">{s.faqBody}</p>
          <div className="mt-6">
            <ArrowLink href={`${pathFor('home', lang)}#faq`}>{s.faqLink}</ArrowLink>
          </div>
        </div>
      </Section>

      <FinalCta lang={lang} c={c} />
    </>
  );
}

/* ---------------------------------------------------------------------- work */

export function WorkPage({ lang, c }: { lang: Lang; c: Content }) {
  const w = c.work;
  return (
    <>
      <PageHero eyebrow={w.eyebrow} title={w.title} lead={w.lead} />

      {w.projects.map((p, i) => (
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
                  Three shipped systems and no pixels of any of them was the
                  largest single gap on this site. */}
              {p.shot ? (
                <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-lg border border-line bg-surface-raised">
                  <img
                    src={asset(p.shot.src)}
                    alt={p.shot.alt}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                </div>
              ) : p.shotPending ? (
                /* An empty frame and not a stand-in. A stock image under „so
                   sieht das System aus" would be a fabricated claim on the one
                   section whose value is that it is honest. check-profile.mjs
                   refuses a production build while any of these are still up. */
                <div
                  aria-hidden="true"
                  className="mb-8 flex aspect-[16/10] items-center justify-center rounded-lg border border-dashed border-line bg-surface-alt p-6 text-center"
                >
                  <p className="max-w-narrow hyphens-none font-mono text-eyebrow text-muted">
                    {c.ui.shotPending}
                  </p>
                </div>
              ) : null}

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
                  de.ts/en.ts is the entire change. */}
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
                  </ArrowLink>
                </p>
              ) : null}
            </div>
          </div>
        </Section>
      ))}

      <Section>
        <div className="panel max-w-narrow p-6 md:p-8">
          <h2 className="font-display text-h3">{w.noteTitle}</h2>
          <p className="mt-3 text-muted">{w.noteBody}</p>
        </div>
      </Section>

      <FinalCta lang={lang} c={c} />
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
        <ol className="grid gap-8 md:grid-cols-2 md:gap-12">
          {a.steps.map((s, i) => (
            <li key={s.title} className="border-t border-line pt-6">
              <span className="font-mono text-eyebrow text-brand-text">
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
      </Section>

      <FinalCta lang={lang} c={c} />
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

                It was a holiday snap on a beach, on a page arguing engineer
                responsibility, a B.Sc. and „ich prüfe, teste und verantworte
                jede Zeile". A face beats no face, but the gap between that
                voice and that picture was doing real work against a 9.000 €
                trust decision, and both competitors who show a founder show
                them at work.

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

      <FinalCta lang={lang} c={c} />
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
  const direct = [
    email ? { href: `mailto:${email}`, label: email } : null,
    phone ? { href: `tel:${phone.replace(/[^\d+]/g, '')}`, label: phone } : null,
  ].filter((l): l is { href: string; label: string } => l !== null);

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

      <Section>
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr] md:gap-16">
          <div>
            {/* Said before the form rather than after it, because the doubt it
                answers is what stops a visitor filling the form in at all:
                „I do not know which of these I need, so I will come back when I
                have worked it out", which is a tab that closes. */}
            <p className="max-w-measure text-muted">{t.triage}</p>

            {direct.length > 0 ? (
              <>
                <h2 className="mt-12 font-display text-h3">{t.directTitle}</h2>
                <p className="mt-3 text-muted">{t.directBody}</p>
                <ul className="mt-6 space-y-3">
                  {direct.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        className="inline-flex min-h-[2.75rem] items-center font-display text-h3 text-brand-text underline decoration-viridian-300 underline-offset-4"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <div className={`${direct.length > 0 ? 'mt-12 border-t border-line pt-8' : ''}`}>
              <h2 className="text-small font-medium text-muted">{t.expectTitle}</h2>
              <ol className="mt-4 space-y-3">
                {t.expect.map((e, i) => (
                  <li key={e} className="flex gap-3 text-small text-muted">
                    <span className="font-mono text-eyebrow text-brand-text">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {e}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div>
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

function FinalCta({ lang, c }: { lang: Lang; c: Content }) {
  return (
    <Section tint>
      <div className="max-w-narrow">
        <h2 className="text-h2">{c.home.finalTitle}</h2>
        <p className="mt-4 max-w-measure text-lead text-muted">{c.home.finalLead}</p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <ButtonLink href={pathFor('contact', lang)}>{c.ui.ctaPrimary}</ButtonLink>
          <Link
            href={pathFor('work', lang)}
            className="inline-flex min-h-[2.75rem] items-center font-display font-medium text-brand-text underline decoration-viridian-300 underline-offset-4"
          >
            {c.ui.ctaSecondary}
          </Link>
        </div>
        {/* The reader who is already convinced should not need the contact
            page as an intermediate stop. Renders only with real data. */}
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
    </Section>
  );
}
