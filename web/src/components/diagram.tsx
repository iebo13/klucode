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
 *
 * TWO DRAWINGS, ONE TOPOLOGY, and the reason is a measurement rather than a
 * preference. An SVG's text scales with its viewBox, so a 12px label in a
 * 560-unit box rendered into a 293px column is 6.3 CSS pixels — not small,
 * illegible, on a card whose whole argument is that the three systems share a
 * database. Nothing about the wide drawing survives being made narrow: three
 * lanes fanning left to right need width the way a display face does.
 *
 * So the narrow one is a different drawing of the same fact. The three systems
 * sit on one vertical bus, the bus turns once into the hub, and the hub drops
 * to the server. 14px labels in a 320-unit box come out at about 12.8px in the
 * column they actually land in. Exactly one of the two is ever in the document:
 * `hidden` is display:none, so the other is out of the accessibility tree as
 * well as off the screen, and a screen reader hears the label once.
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
  return (
    <>
      <WideDiagram
        sources={sources}
        hub={hub}
        out={out}
        label={label}
        className={`hidden sm:block ${className}`}
      />
      <TallDiagram
        sources={sources}
        hub={hub}
        out={out}
        label={label}
        className={`sm:hidden ${className}`}
      />
    </>
  );
}

type Props = {
  sources: readonly [string, string, string];
  hub: string;
  out: string;
  label: string;
  className: string;
};

/** Three lanes fanning into a hub. The laptop drawing. */
function WideDiagram({ sources, hub, out, label, className }: Props) {
  const rows = [
    { y: 44, text: sources[0] },
    { y: 120, text: sources[1] },
    { y: 196, text: sources[2] },
  ];

  return (
    <svg viewBox="0 0 560 240" role="img" aria-label={label} className={className} fill="none">
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

      {/* labels: mono, because they name real technology.

          ABOVE its node for the two rows whose lane leaves level or downward,
          BELOW for the row whose lane climbs. Every label used to sit at
          y - 10, and the bottom row's own curve runs from (20,196) up to
          (288,120) and passes y=184 at x=103 — straight through „Vergleichs-
          portal", at every viewport, in both languages. The side of the node
          that is clear is the side the lane is not on, so that is where the
          name goes. */}
      {rows.map(({ y, text }) => (
        <text
          key={text}
          x={34}
          y={y > 120 ? y + 20 : y - 10}
          fontSize={12}
          className="fill-muted font-mono"
        >
          {text}
        </text>
      ))}
      <text x={300} y={150} fontSize={12} textAnchor="middle" className="fill-muted font-mono">
        {hub}
      </text>
      <text x={540} y={100} fontSize={12} textAnchor="end" className="fill-muted font-mono">
        {out}
      </text>
    </svg>
  );
}

/** One bus, one turn, one drop. The phone drawing. */
function TallDiagram({ sources, hub, out, label, className }: Props) {
  const rows = [
    { y: 26, text: sources[0] },
    { y: 74, text: sources[1] },
    { y: 122, text: sources[2] },
  ];

  return (
    <svg viewBox="0 0 320 400" role="img" aria-label={label} className={className} fill="none">
      {/* The bus the three systems stand on, then one turn into the hub and
          one drop to the server. Three separate lanes would have to fan
          across a width this drawing does not have, and three curves crossing
          each other's labels is what the wide drawing is for. */}
      <path d="M 20 26 L 20 122" className="stroke-brand" strokeWidth={1.5} />
      <path d="M 20 122 C 20 190, 84 214, 152 214" className="stroke-brand" strokeWidth={1.5} />
      <path d="M 160 222 L 160 330" className="stroke-brand" strokeWidth={1.5} />

      {rows.map(({ y }) => (
        <circle key={y} cx={20} cy={y} r={5} className="fill-brand" />
      ))}
      <circle cx={160} cy={214} r={8} className="fill-brand" />
      <circle cx={160} cy={338} r={5} className="fill-brand" />

      {/* 14px in a 320-unit box, against 12 in a 560-unit one. Rendered into
          the 293px column a 390px phone actually gives this card, that is the
          difference between 12.8 CSS pixels and 6.3. The labels sit to the
          right of the bus rather than over it, so nothing crosses anything. */}
      {rows.map(({ y, text }) => (
        <text key={text} x={36} y={y + 5} fontSize={14} className="fill-muted font-mono">
          {text}
        </text>
      ))}
      <text x={160} y={262} fontSize={14} textAnchor="middle" className="fill-muted font-mono">
        {hub}
      </text>
      <text x={160} y={368} fontSize={14} textAnchor="middle" className="fill-muted font-mono">
        {out}
      </text>
    </svg>
  );
}
