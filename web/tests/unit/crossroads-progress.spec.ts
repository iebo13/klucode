import { expect, test } from '@playwright/test';

import {
  buildTargets,
  focusAt,
  progressOf,
  ratchet,
  segmentAt,
} from '../../src/components/crossroads/progress';
import type { Stop } from '../../src/components/crossroads/types';

/** The real shape: a junction, four ways, a closing shot. */
const STOPS: Stop[] = [
  { at: 0.0, focus: -1, pos: [0, 3.6, 13], look: [0, 2.0, -8] },
  { at: 0.18, focus: 0, pos: [0, 2.7, 0], look: [0, 2.5, -16] },
  { at: 0.37, focus: 1, pos: [0, 2.7, 0], look: [0, 2.8, -14] },
  { at: 0.56, focus: 2, pos: [0, 2.7, 0], look: [0, 1.7, -14] },
  { at: 0.75, focus: 3, pos: [0, 2.7, 0], look: [0, 4.1, -16] },
  { at: 1.0, focus: -1, pos: [0, 5.0, 15], look: [0, 2.0, -9] },
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
  expect(segmentAt(0.18, STOPS).from.focus).toBe(0);
  expect(segmentAt(0.18, STOPS).t).toBeCloseTo(0, 5);
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
  const t = buildTargets(0.18, STOPS, 4);
  expect(t[0]).toBe(1);
  expect(t.slice(1)).toEqual([0, 0, 0]);
});

test('a way whose stop is behind us is built, however we got here', () => {
  // The jumped-scroll case: an anchor link, a restored offset, the End key.
  // None of these pass through the blend, and before this rule they left
  // every skipped way stranded as a line drawing forever.
  expect(buildTargets(1, STOPS, 4)).toEqual([1, 1, 1, 1]);
  expect(buildTargets(0.76, STOPS, 4)).toEqual([1, 1, 1, 1]);
});

test('the ratchet keeps what is already built', () => {
  expect(ratchet([1, 1, 0, 0], [0, 0, 0, 0])).toEqual([1, 1, 0, 0]);
  expect(ratchet([0, 0, 0, 0], [0.4, 0, 0, 0])).toEqual([0.4, 0, 0, 0]);
  expect(ratchet([], [1, 0, 0, 0])).toEqual([1, 0, 0, 0]);
});

test('focus is the junction at both ends and the way in the middle', () => {
  expect(focusAt(0, STOPS, 4)).toBe(-1);
  expect(focusAt(1, STOPS, 4)).toBe(-1);
  expect(focusAt(0.18, STOPS, 4)).toBe(0);
  expect(focusAt(0.75, STOPS, 4)).toBe(3);
});

test('focus hands over between two ways in one clean crossing', () => {
  // Weights are monotonic inside a segment, so the highlight moves from one row
  // to the next around the midpoint and never sits on neither. A dead zone in
  // the middle of every transit would read as a bug, not as restraint.
  const mid = (0.18 + 0.37) / 2;
  expect(focusAt(mid - 0.02, STOPS, 4)).toBe(0);
  expect(focusAt(mid + 0.02, STOPS, 4)).toBe(1);
});

test('the junction names nobody until a way is genuinely being approached', () => {
  expect(focusAt(0.05, STOPS, 4)).toBe(-1);
  expect(focusAt(0.16, STOPS, 4)).toBe(0);
});

test('focus never names a way that does not exist', () => {
  for (let p = 0; p <= 1; p += 0.01) {
    const f = focusAt(p, STOPS, 4);
    expect(f, `at ${p.toFixed(2)}`).toBeGreaterThanOrEqual(-1);
    expect(f, `at ${p.toFixed(2)}`).toBeLessThan(4);
  }
});
