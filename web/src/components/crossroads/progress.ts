import type { Stop } from './types';

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Smoothstep. Eases both ends of every camera move. */
export const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * How far the reader has travelled through the section, 0 to 1.
 *
 * The stage is sticky with a negative bottom margin equal to its own height,
 * so its margin box is zero tall and the section's height is the track's
 * height alone. The distance actually scrollable is therefore the section
 * height minus one stage.
 */
export function progressOf(top: number, height: number, stageHeight: number): number {
  const travel = height - stageHeight;
  if (travel <= 0) return 0;
  const value = clamp01(-top / travel);
  // -0 is neither below 0 nor above 1, so clamp01 lets it through, and
  // Object.is tells it apart from 0. That difference has no meaning here and
  // would only ever surface as a baffling failed assertion.
  return value === 0 ? 0 : value;
}

/**
 * The pair of stops either side of p, and how far between them we are.
 *
 * The comparison is `>=`, not `>`, so landing exactly on a stop puts you at the
 * START of that stop's segment rather than at the end of the previous one. The
 * camera lands in the same place either way, because lerping to t=1 and lerping
 * from t=0 both give the stop itself. What differs is which stop is named as
 * `from`, and focus and the build reveal are both read off that.
 *
 * The undefined checks are not defensive padding. This project compiles with
 * `noUncheckedIndexedAccess`, so an index into a readonly array really is
 * `Stop | undefined`, and the ban on non-null assertions means saying so.
 */
export function segmentAt(p: number, stops: readonly Stop[]): { from: Stop; to: Stop; t: number } {
  let i = 0;
  while (i < stops.length - 2) {
    const next = stops[i + 1];
    if (next === undefined || p < next.at) break;
    i += 1;
  }

  const from = stops[i];
  const to = stops[i + 1];
  if (from === undefined || to === undefined) {
    throw new Error(`crossroads: no camera segment at progress ${p}, given ${stops.length} stops`);
  }

  const span = to.at - from.at;
  return { from, to, t: span === 0 ? 0 : smooth(clamp01((p - from.at) / span)) };
}

/**
 * How solid each way should be at p, 0 to 1, one entry per way.
 *
 * Two rules, and the second is the one that matters. A way builds as the
 * camera arrives at it, which is the blend. A way whose own stop is already
 * behind us is built outright regardless of the blend, because a jumped
 * scroll position never passes through the blend and would otherwise leave
 * that way stranded as a drawing for the rest of the visit.
 *
 * The 1.35 factor finishes the build a little before the camera settles, so
 * the reader arrives at a finished object rather than watching it resolve.
 */
export function buildTargets(p: number, stops: readonly Stop[], ways: number): number[] {
  const { from, to, t } = segmentAt(p, stops);
  const out: number[] = [];
  for (let k = 0; k < ways; k += 1) {
    const w0 = from.focus === k ? 1 : 0;
    const w1 = to.focus === k ? 1 : 0;
    const blend = w0 + (w1 - w0) * t;
    // Found by key rather than by index, so this never assumes way k's stop
    // sits at position k + 1 in the array.
    const own = stops.find((s) => s.focus === k);
    const passed = own !== undefined && p >= own.at ? 1 : 0;
    out.push(Math.max(clamp01(blend * 1.35), passed));
  }
  return out;
}

/** Built stays built. Scrubbing back up does not dismantle a way. */
export function ratchet(current: readonly number[], targets: readonly number[]): number[] {
  return targets.map((t, i) => Math.max(t, current[i] ?? 0));
}

/**
 * Which way the camera is on, or -1 at the junction.
 *
 * Weights are monotonic inside a segment, so exactly one way is ever the
 * highest and focus hands over from one row to the next in a single clean
 * crossing near the segment's midpoint. There is deliberately no dead zone:
 * naming nobody for part of every transit would read as a bug, not as
 * restraint. Which way wins at the exact midpoint is decided by floating point
 * rounding and is not guaranteed in either direction, which is why nothing
 * asserts on that one instant.
 *
 * The 0.45 floor is not about that handover, which the tie-break already
 * settles. It decides the junction. In the opening and closing segments a
 * way's weight ramps from zero, and the floor is where the column starts, or
 * stops, naming it.
 */
export function focusAt(p: number, stops: readonly Stop[], ways: number): number {
  const { from, to, t } = segmentAt(p, stops);
  let best = -1;
  let bestWeight = 0.45;
  for (let k = 0; k < ways; k += 1) {
    const w0 = from.focus === k ? 1 : 0;
    const w = w0 + ((to.focus === k ? 1 : 0) - w0) * t;
    if (w > bestWeight) {
      best = k;
      bestWeight = w;
    }
  }
  return best;
}
