import { expect, test } from '@playwright/test';
import { Vector3 } from 'three';

import { stateOf } from '../../src/components/crossroads/camera';
import { POSES, SCENE_ORDER } from '../../src/components/crossroads/scene-manifest';
import { buildFlight } from '../../src/components/crossroads/spline';
import type { CameraState } from '../../src/components/crossroads/types';

const fresh = (): CameraState => ({
  pos: new Vector3(),
  look: new Vector3(),
  fitH: 0,
  fitV: 0,
  fstop: 1,
});
const stands = SCENE_ORDER.map((key) => POSES[key]);
const flight = buildFlight(POSES.junction, POSES.hub, stands);

test('every stop is exactly its pose', () => {
  expect(flight.stops).toBe(4);
  const poses = [POSES.junction, ...stands];
  poses.forEach((pose, k) => {
    const s = flight.at(k, fresh());
    const want = stateOf(pose);
    expect(s.pos.distanceTo(want.pos)).toBeLessThan(1e-6);
    expect(s.look.distanceTo(want.look)).toBeLessThan(1e-6);
    expect(s.fitH).toBeCloseTo(pose.fitH, 6);
    expect(s.fitV).toBeCloseTo(pose.fitV, 6);
    expect(s.fstop).toBeCloseTo(pose.fstop, 6);
  });
});

test('between two stops the camera passes over the hub, looking down the next stroke', () => {
  for (let k = 0; k < 4; k += 1) {
    const s = flight.at(k + 0.5, fresh());
    expect(s.pos.distanceTo(new Vector3(...POSES.hub.pos))).toBeLessThan(1e-6);
    const next = stateOf(stands[k]!);
    expect(s.look.distanceTo(next.look)).toBeLessThan(1e-6);
  }
});

test('the parameter is monotone and the camera never jumps', () => {
  let last = flight.at(0, fresh());
  let longest = 0;
  for (let t = 0.005; t <= 4; t += 0.005) {
    const now = flight.at(t, fresh());
    const step = now.pos.distanceTo(last.pos);
    expect(Number.isFinite(step)).toBe(true);
    longest = Math.max(longest, step);
    expect(now.look.distanceTo(now.pos), `the look point met the camera at t=${t}`).toBeGreaterThan(
      2,
    );
    last = now;
  }
  // The longest stroke is 26.2 units and a half band covers it: about 0.3
  // units per 0.005 of t on a straight line, a bit more on the curve.
  expect(longest).toBeLessThan(0.8);
  expect(flight.at(-1, fresh()).pos.distanceTo(flight.at(0, fresh()).pos)).toBe(0);
  expect(flight.at(9, fresh()).pos.distanceTo(flight.at(4, fresh()).pos)).toBe(0);
});
