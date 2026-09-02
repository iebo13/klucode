import { expect, test } from '@playwright/test';

import {
  BAND_SVH,
  WAYS,
  nearestStop,
  scrollT,
  scrollWay,
  shownWays,
} from '../../src/components/crossroads/track';

test('the scroll places the camera continuously, 0 at the map and k at stop k', () => {
  const band = 270;
  expect(BAND_SVH).toBe(30);
  expect(WAYS).toBe(4);
  expect(scrollT(0, band)).toBe(0);
  expect(scrollT(135, band)).toBeCloseTo(0.5);
  expect(scrollT(band, band)).toBe(1);
  expect(scrollT(4 * band, band)).toBe(4);
  // Past the last stop the track runs out: the camera stays at the last stop.
  expect(scrollT(99 * band, band)).toBe(4);
  expect(scrollT(-50, band)).toBe(0);
  expect(scrollT(100, 0)).toBe(0);
  expect(scrollT(Number.NaN, band)).toBe(0);
});

test('the row lights when the camera is nearer its stop than the last one', () => {
  const band = 270;
  expect(nearestStop(0.49)).toBe(0);
  expect(nearestStop(0.5)).toBe(1);
  expect(nearestStop(3.6)).toBe(4);
  expect(nearestStop(9)).toBe(4);
  expect(scrollWay(0, band)).toBe(-1);
  expect(scrollWay(band / 2 - 1, band)).toBe(-1);
  expect(scrollWay(band / 2 + 1, band)).toBe(0);
  expect(scrollWay(band + 2, band)).toBe(0);
  expect(scrollWay(2 * band + 2, band)).toBe(1);
  expect(scrollWay(4 * band + 2, band)).toBe(3);
  expect(scrollWay(9 * band, band)).toBe(3);
  expect(scrollWay(100, 0)).toBe(-1);
});

test('the map names all four, a stop names its own, a hovered row names only itself', () => {
  expect(shownWays(0, -1)).toEqual([true, true, true, true]);
  expect(shownWays(0.4, -1)).toEqual([true, true, true, true]);
  expect(shownWays(0.6, -1)).toEqual([true, false, false, false]);
  expect(shownWays(2, -1)).toEqual([false, true, false, false]);
  expect(shownWays(4, -1)).toEqual([false, false, false, true]);
  expect(shownWays(0, 2)).toEqual([false, false, true, false]);
  expect(shownWays(3, 0)).toEqual([true, false, false, false]);
});
