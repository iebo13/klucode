import Link from 'next/link';
import type { ReactNode } from 'react';

/** Small uppercase mono label. The quiet signal that a developer built this. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-brand-text">{children}</p>
  );
}

export function Section({
  children,
  className = '',
  tint = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  tint?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`${tint ? 'bg-surface-alt' : ''} border-t border-line ${className}`}
    >
      <div className="mx-auto max-w-container px-6 py-section md:px-10">{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-narrow ${className}`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-3 text-h2">{title}</h2>
      {lead ? <p className="mt-5 max-w-measure text-lead text-muted">{lead}</p> : null}
    </div>
  );
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 font-display text-[0.95rem] font-medium transition-colors duration-base ease-brand';

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
  const style =
    variant === 'primary'
      ? 'bg-brand-action text-on-brand hover:bg-viridian-700'
      : 'border border-line text-body hover:border-brand-action hover:text-brand-text';
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

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-surface p-7 ${className}`}>{children}</div>
  );
}

/** Monospace technology tags. */
export function Tags({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((t) => (
        <li
          key={t}
          className="rounded-sm border border-line px-2.5 py-1 font-mono text-eyebrow text-muted"
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
        <details key={item.q} className="group py-5">
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
