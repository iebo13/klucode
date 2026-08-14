/**
 * The `</K>` mark, inline.
 *
 * The geometry mirrors brand/logo/_build/build_logos.py exactly — if you change
 * one, change the other. It is inlined rather than loaded as an <img> so the
 * brackets and the node graph can take their colour from the current theme.
 *
 * The wordmark is set as real text, not as the outlined SVG from the brand kit.
 * On this site Space Grotesk is guaranteed to be loaded, so live text is the
 * better choice: it is selectable, searchable, and read correctly aloud. The
 * outlined SVG exists for everywhere else, where the font is not guaranteed.
 */

const NODES = [
  [46, 14],
  [46, 50],
  [65, 14],
  [65, 50],
] as const;

export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 92 64" className={className} fill="none" aria-hidden="true" focusable="false">
      {/* angle brackets */}
      <g
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-body"
      >
        <polyline points="17,17 8,32 17,47" />
        <line x1="24" y1="47" x2="33" y2="17" />
        <polyline points="75,17 84,32 75,47" />
      </g>
      {/* the K as a node graph: one unbroken stem, two arms off the hub */}
      <g className="text-brand" stroke="currentColor" strokeWidth={4.6} strokeLinecap="round">
        <line x1="46" y1="14" x2="46" y2="50" />
        <line x1="46" y1="32" x2="65" y2="14" />
        <line x1="46" y1="32" x2="65" y2="50" />
      </g>
      <g className="text-brand" fill="currentColor">
        {NODES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={4.2} />
        ))}
        <circle cx={46} cy={32} r={6} />
      </g>
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-[-0.02em] ${className}`}>
      Klu<span className="text-brand">Code</span>
    </span>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Mark className="h-[1.32em] w-auto" />
      <Wordmark />
    </span>
  );
}
