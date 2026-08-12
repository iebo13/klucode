import Link from 'next/link';

import { ContactForm } from '@/components/contact-form';
import {
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
import { isTodo, openTodos, profile } from '@/content/profile';
import { pathFor, type Lang } from '@/lib/routes';

function PageHero({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="aurora -z-10" />
      <div aria-hidden="true" className="node-field absolute inset-0 -z-10 opacity-40" />
      <div className="relative mx-auto max-w-container px-6 pb-16 pt-16 md:px-8 md:pt-24">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className={`${RHYTHM.heading} max-w-4xl text-h1`}>{title}</h1>
        <p className={`${RHYTHM.lead} max-w-measure text-lead text-muted`}>{lead}</p>
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
            <Card key={item.key} className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-12">
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
        <Section key={p.key} tint={i % 2 === 1}>
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
                    — {p.quote.attribution}
                  </figcaption>
                </figure>
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
            {/* Replace with a real photograph before launch — see
                brand/03-visual-identity.md §8. */}
            <div className="flex aspect-[4/5] items-end rounded-lg border border-dashed border-line bg-surface-raised p-6">
              <p className="text-small text-muted">{a.portraitPlaceholder}</p>
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
  const direct = [
    isTodo(profile.email) ? null : { href: `mailto:${profile.email}`, label: profile.email },
    isTodo(profile.phone)
      ? null
      : { href: `tel:${profile.phone.replace(/[^\d+]/g, '')}`, label: profile.phone },
  ].filter((l): l is { href: string; label: string } => l !== null);

  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

      <Section>
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr] md:gap-16">
          <div>
            {direct.length > 0 ? (
              <>
                <h2 className="font-display text-h3">{t.directTitle}</h2>
                <p className="mt-3 text-muted">{t.directBody}</p>
                <ul className="mt-6 space-y-3">
                  {direct.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        className="font-display text-h3 text-brand-text underline decoration-viridian-300 underline-offset-4"
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
          <ul className="mt-4 space-y-2">
            {todos.map((t) => (
              <li key={t} className="font-mono text-small">
                — {t}
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
            className="font-display font-medium text-brand-text underline decoration-viridian-300 underline-offset-4"
          >
            {c.ui.ctaSecondary}
          </Link>
        </div>
        {/* The reader who is already convinced should not need the contact
            page as an intermediate stop. Renders only with real data. */}
        {!isTodo(profile.email) ? (
          <p className="mt-6 text-small text-muted">
            <a
              href={`mailto:${profile.email}`}
              className="text-brand-text underline decoration-viridian-300 underline-offset-4"
            >
              {profile.email}
            </a>
            {!isTodo(profile.phone) ? <> · {profile.phone}</> : null}
          </p>
        ) : null}
      </div>
    </Section>
  );
}
