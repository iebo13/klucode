import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Small uppercase mono label. The quiet signal that a developer built this.
 *
 * It stopped being quiet: 12px uppercase mono at 0.08em appeared about 36 times
 * on the homepage — six section eyebrows, three proof pills, four price labels,
 * three sector and three scope labels, twelve tags, four step numbers and the
 * availability line — which made the loudest recurring texture on the page out
 * of the device meant to whisper, and left no hierarchy inside the small-text
 * tier at all. Mono-uppercase is now restricted to three roles: SECTION
 * EYEBROWS (this component), TECH TAGS and STEP NUMBERS. Everything else that
 * used to reach for it is sentence-case `text-small`.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-brand-text">{children}</p>
  );
}

/**
 * The canonical eyebrow → heading → lead rhythm. ONE definition, used
 * everywhere the pattern appears.
 *
 * It was `mt-3`/`mt-5` in SectionHead, `mt-6`/`mt-7` in PageHero and
 * `mt-6`/`mt-8` in the homepage hero — three different answers to the same
 * question, none of them on the token scale twice. The display-size hero uses
 * the same two values as a 40px section heading: the gap belongs to the
 * relationship, not to the type size.
 */
export const RHYTHM = { heading: 'mt-3', lead: 'mt-4' } as const;

export function Section({
  children,
  className = '',
  tint = false,
  glow = false,
  bleed = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  tint?: boolean;
  /**
   * Adds an aurora wash behind the section. PUNCTUATION, and rationed like it:
   * the hero and one section, nothing else.
   *
   * It used to say "use sparingly" and then sit on the hero plus four of six
   * sections, which is not punctuation, it is wallpaper. It also produced two
   * different results depending on where it landed: on a `tint` section the
   * wash was viridian-100 over viridian-100, i.e. invisible, so the same device
   * did nothing in half the places it was used. The wash now sits a step down
   * the scale so it registers against the page AND against the tint.
   */
  glow?: boolean;
  /**
   * Drops the 72rem container cap so the section runs nearly to the viewport
   * edge. This is a STRUCTURAL EXCEPTION and there is exactly one on the
   * homepage, on the work section. Seven sections sharing one left edge is
   * what made the page read as a single undifferentiated column; the fix is
   * punctuation, not variety, so a second one would undo the first.
   */
  bleed?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      // ONE separation strategy, not two. Every Section carried `border-t
      // border-line`: hard flat separation, fighting the soft depth language,
      // and redundant next to the tint alternation that was already marking the
      // same boundaries. The tint stays; the rules go.
      className={`relative isolate overflow-hidden ${tint ? 'bg-surface-alt' : ''} ${className}`}
    >
      {glow ? <div aria-hidden="true" className="aurora -z-10" /> : null}
      <div
        className={`relative mx-auto px-6 py-section md:px-8 ${
          bleed ? 'max-w-[104rem]' : 'max-w-container'
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * A section heading, and the column beside it.
 *
 * The head is capped at seven of twelve columns for measure. The remaining
 * ~570px used to be empty above every grid on the page, seven times over —
 * so `aside` deliberately occupies it. On this site that is the section's
 * ArrowLink, which also stops it hanging off the bottom-left of every grid.
 */
export function SectionHead({
  eyebrow,
  title,
  lead,
  aside,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`gap-8 md:grid md:grid-cols-12 md:items-end ${className}`}>
      <div className="md:col-span-7">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className={`${RHYTHM.heading} text-h2`}>{title}</h2>
        {lead ? (
          <p className={`${RHYTHM.lead} max-w-measure text-lead text-muted`}>{lead}</p>
        ) : null}
      </div>
      {aside ? (
        <div className="mt-6 md:col-span-4 md:col-start-9 md:mt-0 md:text-right">{aside}</div>
      ) : null}
    </div>
  );
}

/**
 * An inverted slab. Reserved for the one sentence a section is actually
 * arguing towards.
 *
 * This replaces `border-l-2 border-brand pl-7`, which was the weakest emphasis
 * device in the system and was being used three times across the site, every
 * time for a punchline. A 2px rule does not carry a punchline.
 */
export function InkPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-ink p-6 text-ink-fg md:p-8 ${className}`}>
      <span aria-hidden="true" className="mb-6 block h-1 w-8 rounded-full bg-ink-accent" />
      {children}
    </div>
  );
}

/**
 * A reserved slot for imagery that does not exist yet.
 *
 * Correct aspect-ratio box, so dropping a screenshot in later is a file drop
 * and not a layout change. Until then it holds the node field — the brand's own
 * graphic device — rather than a grey rectangle with the word "placeholder" in
 * it, because an empty box that looks designed is not the same thing as an
 * empty box that looks broken. Decorative until it has content, hence
 * aria-hidden and no caption.
 */
export function FigureSlot({ className = '' }: { className?: string }) {
  return (
    <figure aria-hidden="true" className={`panel relative overflow-hidden ${className}`}>
      <div className="node-field-fill absolute inset-0" />
    </figure>
  );
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-[0.95rem] font-medium transition-all duration-base ease-brand';

/**
 * Primary buttons sit on viridian-600, not the brand viridian-500. On 500 the
 * off-white label measures 4.10:1 and fails WCAG AA; on 600 it is 5.51:1.
 * See brand/03-visual-identity.md §5.
 */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  // The primary button is a solid fill. It is the one element on the page whose
  // contrast is not allowed to depend on what sits behind it.
  //
  // The secondary was `glass glass-sm`, i.e. a 10% white wash with no border on
  // a near-white page — invisible next to the primary, which is not what
  // "secondary" means. It is now an outlined button: a real 1px edge, body text,
  // and a border that goes brand on hover so the affordance is visible before
  // the pointer arrives, not after.
  const style =
    variant === 'primary'
      ? 'bg-brand-action text-on-brand shadow-[0_6px_20px_-6px_rgba(53,108,91,.55)] hover:bg-viridian-700 hover:shadow-[0_10px_28px_-8px_rgba(53,108,91,.65)]'
      : 'border border-line bg-transparent text-body hover:border-brand-action hover:text-brand-text';
  return (
    <Link href={href} className={`${base} ${style}`}>
      {children}
    </Link>
  );
}

/** A text link with an arrow, used to lead into a deeper page. */
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 font-display font-medium text-brand-text underline decoration-viridian-300 underline-offset-4 transition-colors duration-base hover:decoration-current"
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-base group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}

/**
 * The standard content surface.
 *
 * `panel` is flat: surfaceRaised, a 1px border, one ambient shadow. It replaced
 * glass because glass had no measurable edge in light mode (1.007:1 against the
 * page) and its blur had nothing but a smooth gradient to sample.
 *
 * `glass` is the navigation material and is reserved for the header capsule.
 * Nothing on any page uses it; it exists so the one legitimate caller has a
 * name for it. If you are reaching for it on a card, you want `panel`.
 */
export function Card({
  children,
  className = '',
  variant = 'panel',
}: {
  children: ReactNode;
  className?: string;
  variant?: 'panel' | 'glass';
}) {
  return (
    <div
      className={`rounded-lg p-6 transition-shadow duration-slow ease-brand md:p-8 ${
        variant === 'glass' ? 'glass-nav' : 'panel'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Monospace technology tags. Flat, and deliberately so: these used to be
 * `glass glass-sm` sitting inside a `glass` Card, which is a nested
 * backdrop-filter — two stacked blurs sampling each other, for no visible
 * gain, twelve times on the homepage.
 */
export function Tags({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((t) => (
        <li
          key={t}
          className="rounded-full border border-line bg-surface-raised px-3 py-1 font-mono text-eyebrow text-muted"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

/** Native disclosure — keyboard accessible for free, and works without JS. */
export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group py-4">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-h3 font-medium marker:content-none">
            {item.q}
            <span
              aria-hidden="true"
              className="mt-1 shrink-0 text-brand transition-transform duration-base group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-4 max-w-measure text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
