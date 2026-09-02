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

test('at the junction the four labels stand left to right in the order of the rows', () => {
  const xs = WAYS.map((way) => STILLS.junction.marks[way].x);
  expect([...xs].sort((a, b) => a - b)).toEqual(xs);
});
