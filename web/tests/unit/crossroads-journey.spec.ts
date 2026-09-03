import { expect, test } from '@playwright/test';
import { Vector3 } from 'three';

import {
  GLIDE_MS,
  PARALLAX_X,
  PARALLAX_Y,
  SETTLE_MS,
  blend,
  copyState,
  glideAt,
  isSettled,
  offsetPosition,
  parallaxOf,
  settle,
  settleState,
  smooth,
  stateSettled,
} from '../../src/components/crossroads/journey';
import type { CameraState } from '../../src/components/crossroads/types';

const state = (x: number, fitH = 24): CameraState => ({
  pos: new Vector3(x, 2, 10),
  look: new Vector3(x, 1, 0),
  fitH,
  fitV: 18,
  fstop: 2,
});
const fresh = (): CameraState => ({
  pos: new Vector3(),
  look: new Vector3(),
  fitH: 0,
  fitV: 0,
  fstop: 1,
});

test('a glide eases both ends and arrives exactly', () => {
  const from = state(0);
  const to = state(10, 30);
  const out = fresh();
  expect(glideAt(from, to, 1000, 1000, out)).toBe(false);
  expect(out.pos.x).toBe(0);
  glideAt(from, to, 1000, 1000 + GLIDE_MS / 2, out);
  expect(out.pos.x).toBeCloseTo(5, 6);
  expect(out.fitH).toBeCloseTo(27, 6);
  expect(glideAt(from, to, 1000, 1000 + GLIDE_MS, out)).toBe(true);
  expect(out.pos.x).toBe(10);
  expect(glideAt(from, to, 1000, 1000 + 5 * GLIDE_MS, out)).toBe(true);
  expect(smooth(0.25)).toBeLessThan(0.25);
  expect(smooth(0.75)).toBeGreaterThan(0.75);
  expect(glideAt(from, to, 0, 0, out, 0)).toBe(true);
  expect(out.pos.x).toBe(10);
});

test('settle is the same after any slicing of the same time', () => {
  const whole = settle(0, 1, 300);
  let sliced = 0;
  for (let i = 0; i < 30; i += 1) sliced = settle(sliced, 1, 10);
  expect(sliced).toBeCloseTo(whole, 6);
  expect(settle(0, 1, 0)).toBe(0);
  expect(settle(0, 1, 3 * SETTLE_MS)).toBeGreaterThan(0.95);
  expect(isSettled(0.9995, 1)).toBe(true);
  expect(isSettled(0.9, 1)).toBe(false);
  const a = state(0);
  settleState(a, state(10, 30), 10 * SETTLE_MS, SETTLE_MS);
  expect(stateSettled(a, state(10, 30))).toBe(true);
});

test('blend at 0 and 1 is its ends, in place', () => {
  const out = fresh();
  blend(state(0), state(10, 30), 0, out);
  expect(out.pos.x).toBe(0);
  expect(out.fitH).toBe(24);
  blend(state(0), state(10, 30), 1, out);
  expect(out.pos.x).toBe(10);
  expect(out.fitH).toBe(30);
  const copy = copyState(state(3, 20), fresh());
  expect(copy.pos.x).toBe(3);
  expect(copy.fitH).toBe(20);
  expect(stateSettled(copy, state(3, 20))).toBe(true);
});

test('the hand moves the camera in its own screen plane and never further than the reach', () => {
  expect(parallaxOf(0, 0)).toEqual([0, 0]);
  expect(parallaxOf(1, 1)).toEqual([PARALLAX_X, -PARALLAX_Y]);
  expect(parallaxOf(5, -5)).toEqual([PARALLAX_X, PARALLAX_Y]);
  const pos = new Vector3(0, 2, 10);
  const look = new Vector3(0, 1, 0);
  const out = new Vector3();
  offsetPosition(pos, look, 1, 0, out);
  // Looking down -z, right is +x.
  expect(out.x).toBeCloseTo(1, 6);
  expect(out.z).toBeCloseTo(10, 6);
  offsetPosition(pos, look, 0, 1, out);
  expect(out.y).toBeGreaterThan(2);
  expect(out.distanceTo(pos)).toBeCloseTo(1, 6);
  offsetPosition(pos, look, 0, 0, out);
  expect(out.equals(pos)).toBe(true);
});
