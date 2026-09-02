import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  BYTES_1X,
  FLOOR,
  LAYOUT,
  POSES,
  SCENE_ORDER,
  WAYS,
} from '../../src/components/crossroads/scene-manifest';

const PUBLIC = path.join(__dirname, '..', '..', 'public');
/** Spec section 7: what the scene may cost a visitor at 1x, lazily. */
const ASSETS_CAP = 1.5 * 1024 * 1024;
const ARM = Math.atan2(19, 18);

test("the K has the mark's proportions, in the order the rows stand", () => {
  expect(LAYOUT.lanes.map((l) => l.key)).toEqual([...SCENE_ORDER]);
  const R = LAYOUT.rotate;
  const want = [
    { dist: 18, angle: R },
    { dist: 26.2, angle: R - ARM },
    { dist: 26.2, angle: R - (Math.PI - ARM) },
    { dist: 18, angle: R + Math.PI },
  ];
  LAYOUT.lanes.forEach((lane, i) => {
    expect(lane.dist).toBeCloseTo(want[i]!.dist, 5);
    expect(lane.angle).toBeCloseTo(want[i]!.angle, 5);
    expect(lane.node[0]).toBeCloseTo(-lane.dist * Math.sin(lane.angle), 2);
    expect(lane.node[1]).toBe(0);
    expect(lane.node[2]).toBeCloseTo(-lane.dist * Math.cos(lane.angle), 2);
  });
  expect(LAYOUT.strokeWidth).toBe(2.1);
  expect(LAYOUT.hub).toBe(2.7);
  expect(LAYOUT.node).toBe(1.9);
});

test('every asset the manifest names exists, and the 1x set is under the cap', () => {
  const files = [FLOOR.texture.x1, FLOOR.texture.x2];
  let bytes = statSync(path.join(PUBLIC, FLOOR.texture.x1)).size;
  for (const key of SCENE_ORDER) {
    const way = WAYS[key];
    files.push(way.model, way.lightmap.x1, way.lightmap.x2);
    bytes += statSync(path.join(PUBLIC, way.model)).size;
    bytes += statSync(path.join(PUBLIC, way.lightmap.x1)).size;
  }
  for (const f of files) {
    expect(f).toMatch(/^\/crossroads\/scene\/[\w@.-]+$/);
    expect(existsSync(path.join(PUBLIC, f)), `${f} is missing`).toBe(true);
  }
  expect(bytes).toBe(BYTES_1X);
  expect(bytes).toBeLessThan(ASSETS_CAP);
});

test('six poses, every stand on its own lane looking at its own node', () => {
  expect(Object.keys(POSES).sort()).toEqual([
    'app',
    'capacity',
    'care',
    'hub',
    'junction',
    'website',
  ]);
  for (const lane of LAYOUT.lanes) {
    const pose = POSES[lane.key];
    expect(pose.look[0]).toBeCloseTo(lane.node[0], 2);
    expect(pose.look[2]).toBeCloseTo(lane.node[2], 2);
    expect(pose.look[1]).toBeCloseTo(lane.aimY, 2);
    // On the lane: the camera's floor point is the node scaled towards the hub.
    const cross = pose.pos[0] * lane.node[2] - pose.pos[2] * lane.node[0];
    expect(Math.abs(cross)).toBeLessThan(0.05);
    const standing = Math.hypot(pose.pos[0] - lane.node[0], pose.pos[2] - lane.node[2]);
    expect(standing).toBeCloseTo(lane.back, 2);
  }
  expect(POSES.hub.pos).toEqual([0, 6, 0]);
});

test('every anchor floats above its own bounds', () => {
  for (const key of SCENE_ORDER) {
    const { anchor, bounds } = WAYS[key];
    expect(anchor[1]).toBeGreaterThan(bounds.max[1]);
    expect(anchor[0]).toBeGreaterThanOrEqual(bounds.min[0]);
    expect(anchor[0]).toBeLessThanOrEqual(bounds.max[0]);
    expect(anchor[2]).toBeGreaterThanOrEqual(bounds.min[2]);
    expect(anchor[2]).toBeLessThanOrEqual(bounds.max[2]);
    expect(WAYS[key].lightScale).toBeGreaterThan(0);
  }
});
