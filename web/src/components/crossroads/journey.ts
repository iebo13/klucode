import type { Shot } from './types';

/**
 * The choreography, with no three.js in it.
 *
 * This file replaces progress.ts, which mapped a scroll position to a camera
 * position along a track of six stops. The track is gone. The section is an
 * ordinary height, the camera idles at the junction, and it glides to a way's
 * close-up when that way's row is hovered or focused. So what is left to
 * decide is small: where the camera is partway through a glide, and how far
 * each object has built since the section came into view. Both are functions
 * of time rather than of scroll, and both are pure, which is why they can be
 * tested with no GPU, no canvas and no browser.
 *
 * Why the pin went, in one paragraph, since this file is where it used to be
 * argued for. Scroll-driven, the four stops were four instants in 1,800px of
 * travel and the rest was transit, in which the open row and the framed
 * object disagreed for two thirds of every move. The enhanced state showed
 * ONE detail at a time where the phone fallback showed all four. The mount
 * floor of 1024x736 excluded every phone, every portrait tablet and the most
 * common Windows laptop. And it cost eighteen wheel notches to read what
 * fits on one screen. NN/g's strongest warning about scroll-jacking is
 * scroll-jacking combined with text the reader has to read, and the section
 * was exactly that, on the section with the prices. Hover-driven, the reader
 * spends no scroll, the details are always open, keyboard focus is the same
 * input as the pointer, and the craft survives.
 */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Smoothstep. Eases both ends of every camera move. */
export const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * How long a glide between two shots takes, in milliseconds.
 *
 * Long enough that the camera reads as travelling through a place rather
 * than cutting, short enough that a pointer sweeping down four rows arrives
 * before the reader's eye has moved on. Measured against the 40svh a move used
 * to take at a normal wheel pace, which was about this.
 */
export const GLIDE_MS = 720;

/** How long one object takes to build, from drawing to solid. */
export const BUILD_MS = 900;

/** How much later each successive object starts building than the one before. */
export const BUILD_STAGGER_MS = 160;

/**
 * The shot for a way, or the junction for anything that is not one.
 *
 * Found by focus rather than by index, so this never assumes way k's shot
 * sits at position k + 1 in the array. A way this scene does not have gets
 * the junction, which is the honest answer to it: nothing framed that is not
 * there.
 */
export function shotFor(way: number, shots: readonly Shot[]): Shot {
  const own = shots.find((s) => s.focus === way);
  if (own !== undefined) return own;
  const junction = shots.find((s) => s.focus < 0);
  if (junction === undefined) {
    throw new Error(`crossroads: no junction shot among ${shots.length} shots`);
  }
  return junction;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerp3 = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * The shot part way between two shots. Position, look point and both
 * half-angles all interpolate, so a move between two shots with different
 * lenses is one continuous change rather than a cut. `focus` is the
 * destination's throughout: the label at the object hands over when the
 * glide starts, and the camera arrives at the thing already named.
 */
export function blend(from: Shot, to: Shot, t: number): Shot {
  return {
    focus: to.focus,
    pos: lerp3(from.pos, to.pos, t),
    look: lerp3(from.look, to.look, t),
    fitH: lerp(from.fitH, to.fitH, t),
    fitV: lerp(from.fitV, to.fitV, t),
  };
}

/**
 * Where the camera is at `now`, on a glide that left `from` for `to` at
 * `startedAt`. `done` once it has arrived, which is what tells the loop it
 * can park.
 */
export function glideAt(
  from: Shot,
  to: Shot,
  startedAt: number,
  now: number,
  duration: number = GLIDE_MS,
): { shot: Shot; done: boolean } {
  const raw = duration <= 0 ? 1 : clamp01((now - startedAt) / duration);
  return { shot: blend(from, to, smooth(raw)), done: raw >= 1 };
}

/**
 * How solid way `lane` is at `now`, 0 to 1, given the reveal began at
 * `revealedAt`. Way 0 starts at once and each later way `stagger` after the
 * one before it, so the four resolve in the order they stand, left to right.
 */
export function buildAt(
  now: number,
  revealedAt: number,
  lane: number,
  duration: number = BUILD_MS,
  stagger: number = BUILD_STAGGER_MS,
): number {
  return clamp01((now - revealedAt - lane * stagger) / duration);
}

/** When the last of `ways` objects has finished building, relative to the reveal. */
export function buildDone(
  ways: number,
  duration: number = BUILD_MS,
  stagger: number = BUILD_STAGGER_MS,
): number {
  return Math.max(0, ways - 1) * stagger + duration;
}
