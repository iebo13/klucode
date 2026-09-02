/**
 * Where the four labels stand, and whether they stand at all.
 *
 * A pure pass over four candidates in stage pixels, shared by both worlds:
 * the stills world's candidates come from the render's anchors through the
 * contain transform, the live world's from the camera projecting the
 * objects' anchors every frame. What both need is the same three rules
 * written once: a chip is nudged into the free region beside the panel,
 * lifted clear of a neighbour, and dropped when neither is enough.
 */
export type Metrics = {
  reserve: number;
  stageW: number;
  stageH: number;
  half: number[];
  tall: number;
};
export type Candidate = { x: number; y: number; on: boolean };
export type Placement = { x: number; y: number; on: boolean };

/**
 * How much clear space a label needs on every side before it is shown at all.
 *
 * A chip touching the panel's edge or the top of the stage reads as a
 * rendering fault rather than as a label, and one that is half under the panel
 * reads as a bug. 12px is a hair more than the chip's own corner radius, which
 * is what makes it look placed rather than trapped.
 */
export const MARK_GAP = 12;

export function placeMarks(candidates: readonly Candidate[], m: Metrics): Placement[] {
  const { reserve, stageW, stageH, half, tall } = m;
  /**
   * Every chip's box before anything is written anywhere, because two of
   * them have to be compared with each other and a box read back out of the
   * DOM would be a layout read per chip per hover.
   *
   * x is the chip's centre and y its bottom, which is where the transform
   * puts it: the chip is centred on its anchor and rises from it, so it
   * reaches `w` to either side and `tall` up.
   */
  const chips = candidates.map((at, i) => {
    /**
     * The chip is nudged into the free region rather than dropped out of
     * it. At the 1024 floor the free region is 536px wide, the fan fills
     * it, and "01 Website & Landingpage" is 208px: measured there, the
     * first chip's own left half reaches 39px past the panel's edge.
     * Hiding it would cost exactly the shot the labels exist for, which is
     * the one where all four objects are on screen and the reader is
     * finding out what they are. A 39px shift on a 208px chip is 19% and
     * reads as placement.
     *
     * Bounded at half the box, because past that the nudge stops meaning
     * "this label, slightly moved" and starts meaning "this label, over
     * somebody else's object". Past it the label is dropped.
     */
    const w = half[i] ?? 0;
    const low = reserve + MARK_GAP + w;
    const high = stageW - MARK_GAP - w;
    return {
      at,
      w,
      low,
      high,
      x: low > high ? at.x : Math.min(Math.max(at.x, low), high),
      y: Math.max(at.y, MARK_GAP + tall),
      on: at.on,
    };
  });

  /**
   * Two chips at neighbouring objects can want the same pixels, and at the
   * junction two of them do.
   *
   * Measured at 1440x900: the anchors for 01 and 02 are 191 still pixels
   * apart, which is 172 on screen, and the two chips are 208 and 245 wide.
   * They overlap by about 50px with their type on the same line, which reads
   * as one broken label rather than two. The old scene solved it by moving
   * the objects on their lanes; the objects are baked into the render now,
   * so the layout has to solve it here.
   *
   * A chip is therefore lifted clear of the ones already placed to its left,
   * by its own height at a time, up to twice. Lifting rather than shifting
   * sideways, because sideways is the axis that says WHICH object this
   * names: a chip 50px to the left of its anchor is standing at its
   * neighbour, while a chip a line higher is standing at the same object
   * from a little further up. The lift also passes the drop test below by
   * construction, which only refuses a chip that has been pushed DOWN and
   * away from its object.
   *
   * Two lifts and no more, because the third would be so far above the
   * object that it names nothing. A chip that is still overlapping after
   * them is dropped instead: a missing label is a label a reader can live
   * without, and two labels on top of each other is the failure this whole
   * pass exists to prevent. It should never happen, one lift clears every
   * viewport measured, and the browser suite's clash test is the alarm if a
   * longer name in some future language makes it happen anyway.
   */
  const clashes = (chip: (typeof chips)[number], before: number) =>
    chips.some(
      (other, j) =>
        j < before &&
        other.on &&
        Math.abs(chip.x - other.x) < chip.w + other.w &&
        Math.abs(chip.y - other.y) < tall,
    );

  for (let i = 0; i < chips.length; i += 1) {
    const chip = chips[i];
    if (!chip || !chip.on) continue;
    // Held so a chip dropped below can be put back here: a hidden label has
    // no reason to remember a lift that did not clear the clash it was for.
    const held = chip.y;
    for (let attempt = 0; attempt < 2 && clashes(chip, i); attempt += 1) {
      chip.y = Math.max(chip.y - (tall + 4), MARK_GAP + tall);
    }
    if (clashes(chip, i)) {
      chip.on = false;
      chip.y = held;
    }
  }

  // Rounded here rather than at the DOM write, so the unit suite can assert
  // whole numbers: a label is type and a half pixel of it is a blurred
  // glyph, and that is as true of a number in a test as of a style string.
  return chips.map(({ at, w, low, high, x, y, on }) => ({
    x: Math.round(x),
    y: Math.round(y),
    on:
      on &&
      low <= high &&
      Math.abs(x - at.x) <= w * 0.5 &&
      y - at.y <= tall * 0.5 &&
      y <= stageH - MARK_GAP,
  }));
}

/** Writes placements onto the label elements: one transform and data-on each, nothing else. */
export function applyMarks(
  placements: readonly Placement[],
  els: readonly (HTMLElement | null)[],
): void {
  for (let i = 0; i < placements.length; i += 1) {
    const el = els[i];
    const p = placements[i];
    if (!el || !p) continue;
    el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    el.dataset.on = String(p.on);
  }
}
