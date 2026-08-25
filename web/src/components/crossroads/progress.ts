import type { Stop } from './types';

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * The pin carries the crossroads and nothing else.
 *
 * There used to be an APPROACH_END here, and an approachBeat() beside it: the
 * section opened a long way short of the junction and spent its first 38%
 * closing the distance while the copy column argued that agencies and website
 * kits do not fit. Both are gone, and „Die Ausgangslage" is an ordinary paper
 * section above this one again.
 *
 * What decided it was measurement rather than taste. Scrollytelling's one rule
 * is that a step is a step because something changes, and through the whole
 * approach the picture was a slow dolly towards four blue wireframes while the
 * words were about three things that were not in the scene at all. The
 * experiment on claude/crossroads-dead-ends put them in it: three objects on a
 * second fan the visitor passes on the way in. It works, and it costs a 160
 * degree about-face measured at 37.7 degrees per 1% of section against the 7.9
 * this journey spends, which is 1.13x the arithmetic floor for that move in
 * that budget. Only a 720svh track brings it down, on a section already too
 * long. Issue #18 carries the numbers.
 *
 * So the argument is not in the picture, and 122svh of pinned scroll was being
 * spent saying so. Unpinned it reads at the reader's own pace, the three
 * options strike through as they fail for every visitor rather than only in
 * the fallback, and the answer hands straight over to the junction, which is
 * where the camera now starts.
 */

/** Smoothstep. Eases both ends of every camera move. */
export const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * How far the reader has travelled through the section, 0 to 1.
 *
 * The stage is sticky inside the track, and the track is the only thing in
 * the section with a height of its own. The distance the stage can actually
 * travel is therefore the section's height minus one stage.
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
 * How far into a camera move the name hands over, as eased segment time.
 *
 * It used to hand over at the midpoint, decided by whichever way had the
 * higher weight, and that was fine while the name lived in a list 200px to the
 * side: a row brightening halfway through a move reads as the list keeping up.
 * It stopped being fine when the name went into the world. A label that swaps
 * from „01 Website & Landingpage" to „02 Individuelle Web-Anwendung" while the
 * camera is still halfway between the two objects is naming the thing you are
 * looking at as the thing you are not.
 *
 * So the camera arrives first and the name follows. 0.78 of the eased segment
 * is about 0.66 of the raw scroll, which is late enough that the destination
 * object is plainly the subject and early enough that the name is settled
 * before the camera is.
 */
export const FOCUS_HANDOVER = 0.78;

/**
 * Which way the camera is on, or -1 at the junction.
 *
 * The way it is LEAVING for most of a move, and the way it is arriving at for
 * the last fifth of one. There is deliberately no dead zone: naming nobody for
 * part of every transit would read as a bug rather than as restraint, and the
 * label at the object would blink out and back on every move.
 *
 * -1 comes out of the same rule rather than out of a special case. The opening
 * segment leaves the junction, whose focus is -1, so nothing is named until
 * the camera is most of the way to way 01. The closing segment arrives at the
 * release shot, whose focus is -1, so way 04 keeps its name until the camera
 * has nearly finished pulling back off it.
 */
export function focusAt(p: number, stops: readonly Stop[], ways: number): number {
  const { from, to, t } = segmentAt(p, stops);
  const key = t >= FOCUS_HANDOVER ? to.focus : from.focus;
  // A stop naming a way this scene does not have is a content error rather
  // than a camera one, and -1 is the honest answer to it: no row highlighted,
  // no label raised, and nothing pointing at an object that is not there.
  return key >= 0 && key < ways ? key : -1;
}
