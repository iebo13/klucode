import { expect, test } from '@playwright/test';

import {
  APPROACH_END,
  approachBeat,
  buildTargets,
  focusAt,
  progressOf,
  ratchet,
  segmentAt,
} from '../../src/components/crossroads/progress';
import type { Stop } from '../../src/components/crossroads/types';

/**
 * The real shape: an approach, a junction, four ways, a closing shot.
 *
 * The four `at` values are not typed out. They are the same expression scene.ts
 * uses, because the point of them is that the crossroads keeps the pacing it
 * had before the section grew an opening argument, and a hand-copied 0.426 is
 * a number that agrees with scene.ts today and drifts from it on the first
 * change to APPROACH_END.
 *
 * pos, look and the two half-angles are here because Stop carries them, not
 * because anything under test reads them. Every function in progress.ts works
 * from `at` and `focus` alone, which is exactly why it can be tested with no
 * GPU, no canvas and no browser.
 */
const WAY_AT = (i: number) => APPROACH_END + (0.18 + i * 0.19) * (1 - APPROACH_END);

const STOPS: Stop[] = [
  { at: 0, focus: -1, pos: [0, 9, 28], look: [0, 0, -8], fitH: 35.9, fitV: 15.2 },
  {
    at: APPROACH_END * 0.55,
    focus: -1,
    pos: [0, 7.5, 20],
    look: [0, 0, -9],
    fitH: 35.9,
    fitV: 15.2,
  },
  { at: APPROACH_END, focus: -1, pos: [0, 6, 13], look: [0, 0, -10], fitH: 35.9, fitV: 15.2 },
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
  expect(buildTargets(APPROACH_END, STOPS, 4)).toEqual([0, 0, 0, 0]);
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

test('focus hands over between two ways in one clean crossing', () => {
  // Weights are monotonic inside a segment, so the highlight moves from one row
  // to the next around the midpoint and never sits on neither. A dead zone in
  // the middle of every transit would read as a bug, not as restraint.
  const mid = (WAY_AT(0) + WAY_AT(1)) / 2;
  expect(focusAt(mid - 0.02, STOPS, 4)).toBe(0);
  expect(focusAt(mid + 0.02, STOPS, 4)).toBe(1);
});

test('the junction names nobody until a way is genuinely being approached', () => {
  expect(focusAt(0.05, STOPS, 4)).toBe(-1);
  // A third of the way from the junction to way 01, which is inside its segment
  // and still short of the 0.45 floor.
  expect(focusAt(APPROACH_END + (WAY_AT(0) - APPROACH_END) * 0.35, STOPS, 4)).toBe(-1);
  expect(focusAt(APPROACH_END + (WAY_AT(0) - APPROACH_END) * 0.9, STOPS, 4)).toBe(0);
});

test('focus never names a way that does not exist', () => {
  for (let p = 0; p <= 1; p += 0.01) {
    const f = focusAt(p, STOPS, 4);
    expect(f, `at ${p.toFixed(2)}`).toBeGreaterThanOrEqual(-1);
    expect(f, `at ${p.toFixed(2)}`).toBeLessThan(4);
  }
});

/* --- the approach --------------------------------------------------------
   The section now opens short of the junction, and the copy column reads the
   same progress the camera does. Which half of the column is showing, and
   whether anything has begun to build while the argument is still being made,
   are the two things that decide whether the merge reads as one story. */

test('the approach ends exactly where the camera says it does', () => {
  // Not a tautology. The point is that the boundary is one exported constant,
  // so scene.ts cannot lay its stops out around one number while index.tsx
  // switches the copy on another.
  expect(approachBeat(APPROACH_END - 0.001)).toBe(4);
  expect(approachBeat(APPROACH_END)).toBe(-1);
  expect(approachBeat(0.99)).toBe(-1);
});

test('the five opening blocks divide the approach evenly', () => {
  const fifth = APPROACH_END / 5;
  for (let i = 0; i < 5; i += 1) {
    expect(approachBeat(fifth * i + fifth / 2), `block ${i}`).toBe(i);
  }
});

test('the opening never names a block that does not exist', () => {
  for (let p = 0; p <= 1; p += 0.005) {
    const b = approachBeat(p);
    expect(b, `at ${p.toFixed(3)}`).toBeGreaterThanOrEqual(-1);
    expect(b, `at ${p.toFixed(3)}`).toBeLessThan(5);
  }
});

test('nothing is built while the camera is still approaching', () => {
  // Every one of the four sits past APPROACH_END, so every build target through
  // the whole opening argument has to be zero. A way that began assembling
  // itself while the column was still explaining why agencies do not fit would
  // answer the question before it had been asked.
  for (let p = 0; p < APPROACH_END; p += 0.005) {
    for (const target of buildTargets(p, STOPS, 4)) {
      expect(target, `at ${p.toFixed(3)}`).toBe(0);
    }
  }
});

test('the crossroads keeps the pacing it had before the approach existed', () => {
  // The four ways used to sit at 0.18, 0.37, 0.56 and 0.75 of a section that
  // was only the crossroads. Remapped into what is left after the approach,
  // the gaps between them stay in the same proportion to each other and to the
  // journey they belong to, which is the whole reason scene.ts maps them
  // rather than writing four new literals.
  const gaps = [WAY_AT(1) - WAY_AT(0), WAY_AT(2) - WAY_AT(1), WAY_AT(3) - WAY_AT(2)];
  for (const gap of gaps) expect(gap).toBeCloseTo(0.19 * (1 - APPROACH_END), 10);
  expect(WAY_AT(0)).toBeGreaterThan(APPROACH_END);
  expect(WAY_AT(3)).toBeLessThan(1);
});
