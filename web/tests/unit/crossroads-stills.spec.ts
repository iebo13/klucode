import { existsSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { STILL, STILL_ORDER, STILLS } from '../../src/components/crossroads/stills';

const WAYS = ['website', 'app', 'capacity', 'care'] as const;

test('there are five stills, the junction first, then the four ways in the order the rows stand', () => {
  expect(STILL_ORDER).toEqual(['junction', ...WAYS]);
  expect(Object.keys(STILLS).sort()).toEqual([...STILL_ORDER].sort());
});

test('every still ships at 1x and 2x, and both files exist', () => {
  for (const key of STILL_ORDER) {
    const still = STILLS[key];
    expect(still.src, `${key} has no 1x`).toMatch(/^\/crossroads\/[a-z]+\.webp$/);
    expect(still.src2x, `${key} has no 2x`).toMatch(/^\/crossroads\/[a-z]+@2x\.webp$/);
    for (const src of [still.src, still.src2x]) {
      expect(existsSync(path.join(__dirname, '..', '..', 'public', src)), `${src} is missing`).toBe(
        true,
      );
    }
  }
});

test('every anchor stands inside its still', () => {
  for (const key of STILL_ORDER) {
    for (const way of WAYS) {
      const a = STILLS[key].marks[way];
      expect(a, `${key} has no anchor for ${way}`).toBeDefined();
      if (!a.on) continue;
      // A label that is shown has to be somewhere a chip can stand: inside the
      // still, with room above it for the chip itself.
      expect(a.x, `${key}: ${way} is off the left`).toBeGreaterThan(0);
      expect(a.x, `${key}: ${way} is off the right`).toBeLessThan(STILL.width);
      expect(a.y, `${key}: ${way} is off the top`).toBeGreaterThan(24);
      expect(a.y, `${key}: ${way} is off the bottom`).toBeLessThan(STILL.height);
    }
  }
});

test('the junction names all four, and a close-up names only its own way', () => {
  for (const way of WAYS)
    expect(STILLS.junction.marks[way].on, `${way} is unnamed at the junction`).toBe(true);
  for (const key of WAYS) {
    for (const way of WAYS) {
      expect(STILLS[key].marks[way].on, `${key} shows the label for ${way}`).toBe(key === way);
    }
  }
});

test('at the junction no two labels stand on top of each other', () => {
  /**
   * The property the chips need, and all of it.
   *
   * This used to assert the four anchors ran left to right in the order of
   * the rows, which held on the fan because the fan was an arc across the
   * frame. The floor plan is the mark's own K now, and from the map camera
   * the far and near ends of the stem stand one above the other: measured on
   * these stills the four run care, website, app, capacity across the screen,
   * so an ordering test would fail on a scene that is perfectly readable.
   *
   * What actually matters is that two chips never land on the same spot. 60
   * still pixels is a little over a chip's own height and comfortably under
   * what the layouts give: the closest pair was 191 px on the fan stills and
   * is 210 px on the K, website to app, both far side of the bar.
   */
  for (let a = 0; a < WAYS.length; a++) {
    for (let b = a + 1; b < WAYS.length; b++) {
      const p = STILLS.junction.marks[WAYS[a]!];
      const q = STILLS.junction.marks[WAYS[b]!];
      const apart = Math.hypot(p.x - q.x, p.y - q.y);
      expect(
        apart,
        `${WAYS[a]} and ${WAYS[b]} stand ${Math.round(apart)} px apart`,
      ).toBeGreaterThanOrEqual(60);
    }
  }
});
