/**
 * The flagship system, drawn as what it is: three systems feeding one
 * database, deployed to one server.
 *
 * This is the node graph from the logo doing real work — the one place on the
 * site where the house device is information rather than ornament. The
 * topology IS the sales argument („Drei Systeme, eine Datenbank"), so the
 * drawing needs no caption and earns its space in the proof section.
 *
 * Geometry follows the mark's rules: thin edges, small terminal nodes, one
 * emphasised hub at ~1.6× — the value is in knowing how things connect.
 * Static on purpose; a diagram that draws itself in is motion the brand never
 * asked for.
 */
export function SystemDiagram({
  sources,
  hub,
  out,
  label,
  className = '',
}: {
  /** The three left-hand systems, top to bottom. */
  sources: readonly [string, string, string];
  /** The shared database at the centre. */
  hub: string;
  /** The deployment target on the right. */
  out: string;
  /** Accessible description of the whole drawing. */
  label: string;
  className?: string;
}) {
  const rows = [
    { y: 44, text: sources[0] },
    { y: 120, text: sources[1] },
    { y: 196, text: sources[2] },
  ];

  return (
    <svg
      viewBox="0 0 560 240"
      role="img"
      aria-label={label}
      className={className}
      fill="none"
    >
      {/* edges first, so nodes sit on top of the line ends */}
      {rows.map(({ y }) => (
        <path
          key={y}
          d={`M 20 ${y} C 150 ${y}, 190 120, 288 120`}
          className="stroke-brand"
          strokeWidth={1.5}
        />
      ))}
      <path d="M 312 120 L 540 120" className="stroke-brand" strokeWidth={1.5} />

      {/* terminal nodes */}
      {rows.map(({ y }) => (
        <circle key={y} cx={20} cy={y} r={5} className="fill-brand" />
      ))}
      <circle cx={540} cy={120} r={5} className="fill-brand" />
      {/* the hub — the emphasised junction, exactly like the mark's K */}
      <circle cx={300} cy={120} r={8} className="fill-brand" />

      {/* labels: mono, because they name real technology */}
      {rows.map(({ y, text }) => (
        <text key={text} x={34} y={y - 10} fontSize={12} className="fill-muted font-mono">
          {text}
        </text>
      ))}
      <text
        x={300}
        y={150}
        fontSize={12}
        textAnchor="middle"
        className="fill-muted font-mono"
      >
        {hub}
      </text>
      <text x={540} y={100} fontSize={12} textAnchor="end" className="fill-muted font-mono">
        {out}
      </text>
    </svg>
  );
}
