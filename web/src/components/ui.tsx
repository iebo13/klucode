import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Section label: a node dot and sentence-case text.
 *
 * This was uppercase mono, the reflexive dev-brand register — and by 2026 the
 * single most recognisable tic of AI-generated sites. Mono survives only where
 * it shows something genuinely technical (tags, step numbers); the label that
 * merely names a section speaks in sentence case, marked by the smallest
 * possible piece of the house device: one node.
 */
export function Eyebrow({ children, onInk = false }: { children: ReactNode; onInk?: boolean }) {
  // On ink the theme roles are wrong by construction (brandText resolves to a
  // deep green in light mode); the fixed ink-accent does the same job there.
  const color = onInk ? 'text-ink-accent' : 'text-brand-text';
  const dot = onInk ? 'bg-ink-accent' : 'bg-brand';
  return (
    <p className={`flex items-center gap-2 text-small font-medium ${color}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {children}
    </p>
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
  ink = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  tint?: boolean;
  /**
   * The ink register: the section becomes a full-bleed slab of the same
   * surface the footer is made of — dark in BOTH themes. The homepage is
   * framed in it: it opens on ink and closes on ink, and everything between
   * is paper. Carries grain, because ink is a peak surface.
   */
  ink?: boolean;
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
      className={`relative isolate overflow-hidden ${
        ink ? 'grain bg-ink text-ink-fg' : tint ? 'bg-surface-alt' : ''
      } ${className}`}
    >
      {/* On ink, glow means the ink's own fixed washes plus the node field —
          the texture that gives any glass sitting on this band something to
          refract. The theme-flipping .aurora would haze a dark ground. */}
      {glow ? (
        <div aria-hidden="true" className={`${ink ? 'ink-aurora' : 'aurora'} -z-10`} />
      ) : null}
      {ink && glow ? (
        <div aria-hidden="true" className="node-field-ink absolute inset-0 -z-10 opacity-40" />
      ) : null}
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
  onInk = false,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  aside?: ReactNode;
  className?: string;
  onInk?: boolean;
}) {
  return (
    <div className={`gap-8 md:grid md:grid-cols-12 md:items-end ${className}`}>
      <div className="md:col-span-7">
        {eyebrow ? <Eyebrow onInk={onInk}>{eyebrow}</Eyebrow> : null}
        <h2 className={`${RHYTHM.heading} text-h2`}>{title}</h2>
        {lead ? (
          <p
            className={`${RHYTHM.lead} max-w-measure text-lead ${
              onInk ? 'text-ink-muted' : 'text-muted'
            }`}
          >
            {lead}
          </p>
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
    <div
      // border-ink-line, because "every panel gets a border" applies to this
      // panel too — on the dark theme the bare slab sat at ~1.25:1 against a
      // tinted section and had no edge at all. Grain, because the ink slab is
      // one of the page's two peak surfaces.
      className={`grain relative overflow-hidden rounded-lg border border-ink-line bg-ink p-6 text-ink-fg md:p-8 ${className}`}
    >
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

// Body face, not display: a button is an instrument, not a headline. And
// transition-colors, not transition-all — the only thing that should ever
// animate on a button is its colour.
const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-small font-semibold transition-colors duration-base ease-brand';

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
  /**
   * `ink` / `inkSecondary` are for buttons ON an ink surface. They use fixed
   * scale values rather than theme roles, and that is correct, not lazy: ink
   * is dark in both themes, so its button is the dark-theme button in both —
   * viridian-400 fill with an ink label (7.51:1, see visual-identity §5).
   */
  variant?: 'primary' | 'secondary' | 'ink' | 'inkSecondary';
}) {
  // The primary button is a solid fill. It is the one element on the page whose
  // contrast is not allowed to depend on what sits behind it.
  //
  // The secondary was `glass glass-sm`, i.e. a 10% white wash with no border on
  // a near-white page — invisible next to the primary, which is not what
  // "secondary" means. It is now an outlined button: a real 1px edge, body text,
  // and a border that goes brand on hover so the affordance is visible before
  // the pointer arrives, not after.
  // The shadow tint is viridian-700 (#396C43), the button's own hover colour —
  // the previous value was an off-palette green that existed nowhere in the
  // token scales. Static, because a shadow that grows on hover is motion the
  // brand never asked for.
  const styles = {
    primary:
      'bg-brand-action text-on-brand shadow-[0_6px_20px_-8px_rgba(57,108,67,.5)] hover:bg-viridian-700',
    secondary:
      'border border-line bg-transparent text-body hover:border-brand-action hover:text-brand-text',
    ink: 'bg-viridian-400 text-stone-950 hover:bg-viridian-300',
    // Clear glass: on ink the secondary action is a glass chip — the blur has
    // the node field and aurora underneath it to sample, which is the one
    // condition glass needs (see globals.css).
    inkSecondary: 'glass-chip text-ink-fg hover:border-ink-accent hover:text-ink-accent',
  } as const;
  const style = styles[variant];
  return (
    <Link href={href} className={`${base} ${style}`}>
      {children}
    </Link>
  );
}

/** A text link with an arrow, used to lead into a deeper page. */
export function ArrowLink({
  href,
  children,
  onInk = false,
}: {
  href: string;
  children: ReactNode;
  onInk?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 font-medium underline underline-offset-4 transition-colors duration-base hover:decoration-current ${
        onInk
          ? 'text-ink-accent decoration-viridian-600'
          : 'text-brand-text decoration-viridian-300'
      }`}
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
 * Glass (`glass-nav`) is the navigation material and is reserved for the
 * header capsule, which applies the class itself. There is deliberately no
 * glass variant here: if you are reaching for it on a card, you want `panel`.
 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`panel rounded-lg p-6 transition-shadow duration-slow ease-brand md:p-8 ${className}`}
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
          {/* Body face at lead size, not display h3: six display-set questions
              in a row out-shouted the section heading above them, and the
              size jump inside the accordion was one of the places the type
              scale felt arbitrary. */}
          <summary className="liquid-row -mx-3 flex cursor-pointer list-none items-start justify-between gap-6 px-3 py-2 text-lead font-medium marker:content-none">
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
