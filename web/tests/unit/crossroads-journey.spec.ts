import { expect, test } from '@playwright/test';

import {
  BUILD_MS,
  BUILD_STAGGER_MS,
  GLIDE_MS,
  blend,
  buildAt,
  buildDone,
  glideAt,
  shotFor,
  smooth,
} from '../../src/components/crossroads/journey';
import type { Shot } from '../../src/components/crossroads/types';

/**
 * The real shape: a junction and four ways.
 *
 * pos, look and the two half-angles are made up, because nothing under test
 * cares what they are, only that they interpolate. Every function in
 * journey.ts works from time and focus alone, which is exactly why it can be
 * tested with no GPU, no canvas and no browser.
 */
const JUNCTION: Shot = { focus: -1, pos: [0, 6, 13], look: [0, 0, -10], fitH: 35.9, fitV: 15.2 };
const way = (i: number): Shot => ({
  focus: i,
  pos: [i * 2, 2.4, 0],
  look: [i * 2, 2, -17],
  fitH: 24,
  fitV: 18,
});
const SHOTS: Shot[] = [JUNCTION, way(0), way(1), way(2), way(3)];

test('a way finds its own shot, and anything else finds the junction', () => {
  expect(shotFor(2, SHOTS)).toBe(SHOTS[3]);
  expect(shotFor(-1, SHOTS)).toBe(JUNCTION);
  // A way this scene does not have: no row highlighted, nothing framed that
  // is not there.
  expect(shotFor(7, SHOTS)).toBe(JUNCTION);
  expect(() => shotFor(0, [way(1)])).toThrow(/junction/);
});

test('a blend starts at one shot and ends at the other', () => {
  const a = way(0);
  const b = way(3);
  expect(blend(a, b, 0)).toEqual({ ...a, focus: b.focus });
  expect(blend(a, b, 1)).toEqual(b);
  const mid = blend(a, b, 0.5);
  expect(mid.pos[0]).toBeCloseTo(3, 10);
  expect(mid.look[0]).toBeCloseTo(3, 10);
  expect(mid.fitH).toBeCloseTo(24, 10);
});

test('the name at the object belongs to the destination for the whole move', () => {
  // The camera arrives at a thing already named. Naming the thing it is
  // leaving for most of the move was the rule while the scroll drove it, and
  // it produced two thirds of every move with the row and the picture
  // disagreeing.
  for (let t = 0; t <= 1; t += 0.05) {
    expect(blend(JUNCTION, way(2), t).focus).toBe(2);
    expect(blend(way(2), JUNCTION, t).focus).toBe(-1);
  }
});

test('a glide leaves on time, eases, and arrives', () => {
  const from = JUNCTION;
  const to = way(1);
  const t0 = 1000;

  const start = glideAt(from, to, t0, t0);
  expect(start.shot.pos).toEqual(from.pos);
  expect(start.done).toBe(false);

  // Eased, not linear: a quarter of the way in time is well under a quarter
  // of the way in space, and the midpoint is the midpoint.
  const quarter = glideAt(from, to, t0, t0 + GLIDE_MS / 4);
  const share = (quarter.shot.pos[1] - from.pos[1]) / (to.pos[1] - from.pos[1]);
  expect(share).toBeCloseTo(smooth(0.25), 10);
  expect(share).toBeLessThan(0.2);
  const half = glideAt(from, to, t0, t0 + GLIDE_MS / 2);
  expect(half.shot.pos[1]).toBeCloseTo((from.pos[1] + to.pos[1]) / 2, 10);

  const end = glideAt(from, to, t0, t0 + GLIDE_MS);
  expect(end.shot).toEqual(to);
  expect(end.done).toBe(true);
  // And it stays there. A glide that keeps moving past its end is a camera
  // that never parks.
  expect(glideAt(from, to, t0, t0 + GLIDE_MS * 5).shot).toEqual(to);
});

test('a glide never goes backwards', () => {
  const from = way(0);
  const to = way(3);
  let last = -Infinity;
  for (let ms = 0; ms <= GLIDE_MS; ms += 5) {
    const x = glideAt(from, to, 0, ms).shot.pos[0];
    expect(x).toBeGreaterThanOrEqual(last);
    last = x;
  }
});

test('a glide with no duration is a cut', () => {
  const cut = glideAt(JUNCTION, way(0), 0, 0, 0);
  expect(cut.shot).toEqual(way(0));
  expect(cut.done).toBe(true);
});

test('nothing is built before the reveal, and everything is built after it', () => {
  const revealedAt = 5000;
  for (let lane = 0; lane < 4; lane += 1) {
    expect(buildAt(revealedAt - 1, revealedAt, lane)).toBe(0);
    expect(buildAt(revealedAt, revealedAt, lane)).toBe(0);
    expect(buildAt(revealedAt + buildDone(4), revealedAt, lane)).toBe(1);
  }
});

test('the four build in the order they stand, one after another', () => {
  const revealedAt = 0;
  // Way 0 starts at once and finishes after one duration.
  expect(buildAt(BUILD_MS, revealedAt, 0)).toBe(1);
  // Way 3 has not started until three staggers have passed.
  expect(buildAt(3 * BUILD_STAGGER_MS - 1, revealedAt, 3)).toBe(0);
  expect(buildAt(3 * BUILD_STAGGER_MS + BUILD_MS, revealedAt, 3)).toBe(1);
  // And at every moment a way is at least as built as the one to its right.
  for (let ms = 0; ms <= buildDone(4); ms += 10) {
    for (let lane = 0; lane < 3; lane += 1) {
      expect(buildAt(ms, revealedAt, lane)).toBeGreaterThanOrEqual(
        buildAt(ms, revealedAt, lane + 1),
      );
    }
  }
});

test('buildDone is when the last one finishes', () => {
  expect(buildDone(4)).toBe(3 * BUILD_STAGGER_MS + BUILD_MS);
  expect(buildDone(1)).toBe(BUILD_MS);
  expect(buildDone(0)).toBe(BUILD_MS);
});
