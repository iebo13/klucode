import { expect, test } from '@playwright/test';

import { BAND_SVH, scrollWay } from '../../src/components/crossroads/track';

test('the track selects a way per band, the junction first, and clamps past the end', () => {
  const band = 270;
  expect(BAND_SVH).toBe(30);
  expect(scrollWay(0, band)).toBe(-1);
  expect(scrollWay(band - 1, band)).toBe(-1);
  expect(scrollWay(band, band)).toBe(0);
  expect(scrollWay(2 * band - 1, band)).toBe(0);
  expect(scrollWay(2 * band, band)).toBe(1);
  expect(scrollWay(3 * band, band)).toBe(2);
  expect(scrollWay(4 * band, band)).toBe(3);
  expect(scrollWay(5 * band, band)).toBe(3);
  expect(scrollWay(99 * band, band)).toBe(3);
  expect(scrollWay(-50, band)).toBe(-1);
  expect(scrollWay(100, 0)).toBe(-1);
});
