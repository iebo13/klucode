import { expect, test } from '@playwright/test';

import {
  FOCUS_HANDOVER,
  buildTargets,
  focusAt,
  progressOf,
  ratchet,
  segmentAt,
} from '../../src/components/crossroads/progress';
import type { Stop } from '../../src/components/crossroads/types';

/**
 * The real shape: a junction, four ways, a closing shot.
 *
 * The four `at` values are the same expression scene.ts uses. They spent a day
 * mapped through an APPROACH_END, because the section opened with „Die
 * Ausgangslage" pinned in front of them, and they are back where they were:
 * that section is ordinary paper above this one again.
 *
 * pos, look and the two half-angles are here because Stop carries them, not
 * because anything under test reads them. Every function in progress.ts works
 * from `at` and `focus` alone, which is exactly why it can be tested with no
 * GPU, no canvas and no browser.
 */
const WAY_AT = (i: number) => 0.18 + i * 0.19;

const STOPS: Stop[] = [
  { at: 0, focus: -1, pos: [0, 6, 13], look: [0, 0, -10], fitH: 35.9, fitV: 15.2 },
  { at: WAY_AT(0), focus: 0, pos: [0, 2.4, 0], look: [0, 2.33, -17], fitH: 24, fitV: 18 },
  { at: WAY_AT(1), focus: 1, pos: [0, 2.4, 0], look: [0, 2.6, -17], fitH: 24, fitV: 18 },
  { at: WAY_AT(2), focus: 2, pos: [0, 2.4, 0], look: [0, 0.98, -17], fitH: 24, fitV: 18 },
  { at: WAY_AT(3), focus: 3, pos: [0, 2.4, 0], look: [0, 2.78, -17], fitH: 24, fitV: 18 },
  { at: 1, focus: -1, pos: [0, 7.2, 15.5], look: [0, 0.2, -10], fitH: 32.8, fitV: 13.5 },
];

test('progress is zero before the section and one after it', () => {
  expect(progressOf(500, 4000, 1000)).toBe(0);
  expect(progressOf(-9999, 4000, 1000)).toBe(1);
});

test('progress is the share of the travel, which excludes one stage', () => {
  // 4000 tall, 1000 of stage, so 3000 of travel. 1500 scrolled is half way.
  expect(progressOf(-1500, 4000, 1000)).toBeCloseTo(0.5, 5);
});

test('a section with no room to travel reports zero rather than dividing by it', () => {
  expect(progressOf(-10, 1000, 1000)).toBe(0);
  expect(progressOf(-10, 500, 1000)).toBe(0);
});

test('the segment at a stop is the one starting there', () => {
  expect(segmentAt(WAY_AT(0), STOPS).from.focus).toBe(0);
  expect(segmentAt(WAY_AT(0), STOPS).t).toBeCloseTo(0, 5);
});

test('the last segment is never overrun', () => {
  const seg = segmentAt(1, STOPS);
  expect(seg.to.at).toBe(1);
  expect(seg.t).toBeCloseTo(1, 5);
});

test('nothing is built at the junction', () => {
  expect(buildTargets(0, STOPS, 4)).toEqual([0, 0, 0, 0]);
});

test('arriving at a way builds that way and no other', () => {
  const t = buildTargets(WAY_AT(0), STOPS, 4);
  expect(t[0]).toBe(1);
  expect(t.slice(1)).toEqual([0, 0, 0]);
});

test('a way whose stop is behind us is built, however we got here', () => {
  // The jumped-scroll case: an anchor link, a restored offset, the End key.
  // None of these pass through the blend, and before this rule they left
  // every skipped way stranded as a line drawing forever.
  expect(buildTargets(1, STOPS, 4)).toEqual([1, 1, 1, 1]);
  expect(buildTargets(WAY_AT(3) + 0.01, STOPS, 4)).toEqual([1, 1, 1, 1]);
});

test('the build runs ahead of the camera, finishing before it arrives', () => {
  // Way 01 is built and way 02 is part way there, half through the segment
  // between them. This is the only assertion that observes the 1.35 factor at
  // all: everywhere else the blend is either zero or already overridden by the
  // passed rule, so a mutated factor would go unnoticed.
  const t = buildTargets((WAY_AT(0) + WAY_AT(1)) / 2, STOPS, 4);
  expect(t[0]).toBe(1);
  expect(t[1]).toBeCloseTo(0.675, 5);
  expect(t.slice(2)).toEqual([0, 0]);
});

test('the ratchet keeps what is already built', () => {
  expect(ratchet([1, 1, 0, 0], [0, 0, 0, 0])).toEqual([1, 1, 0, 0]);
  expect(ratchet([0, 0, 0, 0], [0.4, 0, 0, 0])).toEqual([0.4, 0, 0, 0]);
  expect(ratchet([], [1, 0, 0, 0])).toEqual([1, 0, 0, 0]);
});

test('focus is the junction at both ends and the way in the middle', () => {
  expect(focusAt(0, STOPS, 4)).toBe(-1);
  expect(focusAt(1, STOPS, 4)).toBe(-1);
  expect(focusAt(WAY_AT(0), STOPS, 4)).toBe(0);
  expect(focusAt(WAY_AT(1), STOPS, 4)).toBe(1);
  expect(focusAt(WAY_AT(2), STOPS, 4)).toBe(2);
  expect(focusAt(WAY_AT(3), STOPS, 4)).toBe(3);
});

test('focus hands over at arrival, not at the midpoint', () => {
  // It used to cross wherever the two weights did, which is the middle of every
  // move. That was fine while the name lived in a list 200px to the side and it
  // stopped being fine when the name went into the world: a label swapping from
  // way 01 to way 02 halfway between the two objects names the thing you are
  // looking at as the thing you are not.
  //
  // There is still no dead zone. Exactly one of the two is named at every point
  // of the move, and the switch is a single crossing at FOCUS_HANDOVER.
  const from = WAY_AT(0);
  const to = WAY_AT(1);
  const at = (t: number) => focusAt(from + (to - from) * t, STOPS, 4);
  expect(at(0.5), 'still handing over at the midpoint').toBe(0);
  expect(at(0.9)).toBe(1);
  for (let t = 0; t <= 1; t += 0.02) {
    expect(at(t), `nobody is named at t=${t.toFixed(2)}`).toBeGreaterThanOrEqual(0);
  }
});

test('the handover point is the one exported constant', () => {
  // Not a tautology: segmentAt eases t, so the raw scroll position that
  // corresponds to FOCUS_HANDOVER is not FOCUS_HANDOVER. What this pins is that
  // there is one number and that the crossing is where it says.
  expect(FOCUS_HANDOVER).toBeGreaterThan(0.5);
  expect(FOCUS_HANDOVER).toBeLessThan(1);

  const from = WAY_AT(1);
  const to = WAY_AT(2);
  let crossings = 0;
  let last = focusAt(from, STOPS, 4);
  for (let t = 0; t <= 1; t += 0.005) {
    const now = focusAt(from + (to - from) * t, STOPS, 4);
    if (now !== last) crossings += 1;
    last = now;
  }
  expect(crossings, 'the name changed more than once inside one move').toBe(1);
});

test('the junction names nobody until a way has genuinely been reached', () => {
  // The opening segment leaves the junction, whose focus is -1, so the same
  // handover rule gives the junction its silence with no special case for it.
  // The closing one arrives at the release shot, so way 04 keeps its name
  // until the camera has nearly finished pulling back off it.
  expect(focusAt(0, STOPS, 4)).toBe(-1);
  expect(focusAt(WAY_AT(0) * 0.35, STOPS, 4)).toBe(-1);
  expect(focusAt(WAY_AT(0) * 0.98, STOPS, 4)).toBe(0);
  expect(focusAt(WAY_AT(3) + (1 - WAY_AT(3)) * 0.5, STOPS, 4)).toBe(3);
  expect(focusAt(1, STOPS, 4)).toBe(-1);
});

test('focus never names a way that does not exist', () => {
  for (let p = 0; p <= 1; p += 0.01) {
    const f = focusAt(p, STOPS, 4);
    expect(f, `at ${p.toFixed(2)}`).toBeGreaterThanOrEqual(-1);
    expect(f, `at ${p.toFixed(2)}`).toBeLessThan(4);
  }
});

test('the crossroads keeps the pacing it had before the approach existed', () => {
  // The four ways sat at 0.18, 0.37, 0.56 and 0.75 when this section was only
  // the crossroads. „Die Ausgangslage" was pinned in front of them for a day
  // and they were remapped into what was left; it is paper again and they are
  // back. Same gaps, same order, both ends still clear.
  const gaps = [WAY_AT(1) - WAY_AT(0), WAY_AT(2) - WAY_AT(1), WAY_AT(3) - WAY_AT(2)];
  for (const gap of gaps) expect(gap).toBeCloseTo(0.19, 10);
  expect(WAY_AT(0)).toBeGreaterThan(0);
  expect(WAY_AT(3)).toBeLessThan(1);
});
