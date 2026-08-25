import { expect, test } from '@playwright/test';
import { Vector3 } from 'three';

import { LANES, STOPS, fovFor } from '../../src/components/crossroads/scene';
import { segmentAt } from '../../src/components/crossroads/progress';
import type { Stop } from '../../src/components/crossroads/types';
import { buildLanes, type Lane } from './support/scene';

/**
 * The framing suite: what is actually inside the frame, at every stop, at every
 * canvas this scene ever mounts on.
 *
 * This exists because the alternative is looking at it. A field of view here is
 * computed per frame from the stop's two half-angles and the aspect the canvas
 * happens to have, and the canvas runs from 470px wide to 980px, so a stop that
 * frames its subject on one laptop can crop it on another and no screenshot of
 * the first one would say so. Every standoff in LANES was solved against these
 * numbers once, by hand, and then nothing held them.
 *
 * It runs with no GPU and no browser. three.js geometry, matrices and bounding
 * boxes are all plain maths, and the only thing a WebGL context would have
 * added is the part that is not being asserted.
 */

/** The three canvases the copy column leaves, at the three viewports that mount. */
const CANVASES = [
  { name: '1024x736', w: 470, h: 584 },
  { name: '1440x900', w: 640, h: 796 },
  { name: '1920x1080', w: 980, h: 976 },
] as const;

/* --- the camera, exactly as scene.ts drives it --------------------------- */

const DEG = Math.PI / 180;

/** The camera basis three.js builds from a position and a look point. */
function basis(pos: Vector3, look: Vector3) {
  const z = new Vector3().subVectors(pos, look).normalize();
  const x = new Vector3().crossVectors(new Vector3(0, 1, 0), z).normalize();
  const y = new Vector3().crossVectors(z, x);
  return { x, y, z };
}

type Shot = { pos: Vector3; look: Vector3; fitH: number; fitV: number };

const shotOf = (s: Stop): Shot => ({
  pos: new Vector3(s.pos[0], s.pos[1], s.pos[2]),
  look: new Vector3(s.look[0], s.look[1], s.look[2]),
  fitH: s.fitH,
  fitV: s.fitV,
});

/**
 * How far outside the frame edge a solid reaches, and how much of the frame it
 * fills, at one shot on one canvas.
 *
 * Reported in units of the half frame, so 1 is exactly the edge: `reach` above
 * 1 is cropped, and it is the number the standoffs are solved against. `area`
 * is the share of the whole frame the solid's projected extent covers after
 * clipping, which is what „no neighbouring object in shot" is measured with.
 */
function frame(shot: Shot, solid: Lane, aspect: number) {
  const { x, y, z } = basis(shot.pos, shot.look);
  const vHalf = (fovFor(shot.fitH, shot.fitV, aspect) / 2) * DEG;
  const tanV = Math.tan(vHalf);
  const tanH = Math.tan(Math.atan(tanV * aspect));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let ahead = 0;
  const v = new Vector3();
  for (const corner of solid.corners) {
    v.subVectors(corner, shot.pos);
    const depth = -v.dot(z);
    // Behind the camera, where a perspective divide means nothing. Skipped
    // rather than mirrored, which is what a naive divide by a negative depth
    // does and it puts objects on screen that are standing behind you.
    if (depth <= 0.001) continue;
    ahead += 1;
    const nx = v.dot(x) / depth / tanH;
    const ny = v.dot(y) / depth / tanV;
    if (nx < minX) minX = nx;
    if (nx > maxX) maxX = nx;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
  }
  if (ahead === 0) return { reach: 0, area: 0, behind: true };

  const clipW = Math.max(0, Math.min(maxX, 1) - Math.max(minX, -1));
  const clipH = Math.max(0, Math.min(maxY, 1) - Math.max(minY, -1));
  return {
    reach: Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minY), Math.abs(maxY)),
    area: (clipW * clipH) / 4,
    behind: false,
  };
}

/* --- which stop is about what -------------------------------------------- */

const WAY_KEYS = LANES.map((l) => l.key);

/**
 * What a stop must hold whole, and what it must not hold at all.
 *
 * A close-up holds its own way and bans the other three. A wide shot, which is
 * the approach, the junction and the closing release, holds all four and bans
 * nothing: that is the whole job of a wide shot here.
 */
function rolesOf(stop: Stop): { holds: string[]; bans: string[] } {
  if (stop.focus < 0) return { holds: [...WAY_KEYS], bans: [] };
  const key = WAY_KEYS[stop.focus];
  return {
    holds: key === undefined ? [] : [key],
    bans: WAY_KEYS.filter((k) => k !== key),
  };
}

const label = (stop: Stop, i: number) =>
  `stop ${i} at p=${stop.at.toFixed(3)} (${rolesOf(stop).holds.join('+')})`;

/* --- the assertions ------------------------------------------------------- */

const SOLIDS = buildLanes();
const find = (id: string): Lane => {
  const s = SOLIDS.find((o) => o.key === id);
  if (!s) throw new Error(`crossroads: no solid built for ${id}`);
  return s;
};

test('every stop holds its own subject with nothing cropped', () => {
  const report: string[] = [];
  const cropped: string[] = [];
  for (const [i, stop] of STOPS.entries()) {
    const shot = shotOf(stop);
    for (const canvas of CANVASES) {
      const aspect = canvas.w / canvas.h;
      for (const id of rolesOf(stop).holds) {
        const f = frame(shot, find(id), aspect);
        const line = `${label(stop, i)} ${canvas.name} ${id}: reach ${f.reach.toFixed(3)}${f.behind ? ' BEHIND' : ''}`; // prettier-ignore
        report.push(line);
        if (f.behind || f.reach > 1) cropped.push(line);
      }
    }
  }
  // Collected and asserted at the end rather than thrown at the first one, so a
  // run that fails still prints every number. A framing failure is never fixed
  // by looking at the first stop that broke.
  console.log(report.join('\n'));
  expect(cropped, 'cropped or behind the camera').toEqual([]);
});

test('no stop has a neighbour standing in its shot', () => {
  const seen: string[] = [];
  const loud: string[] = [];
  for (const [i, stop] of STOPS.entries()) {
    const shot = shotOf(stop);
    const banned = new Set(rolesOf(stop).bans);
    for (const canvas of CANVASES) {
      const aspect = canvas.w / canvas.h;
      for (const solid of SOLIDS) {
        if (!banned.has(solid.key)) continue;
        const f = frame(shot, solid, aspect);
        if (f.area <= 0) continue;
        const line = `${label(stop, i)} ${canvas.name}: ${solid.key} ${(f.area * 100).toFixed(2)}%`;
        seen.push(line);
        // A hair of a neighbour at one corner is what this scene has always
        // shipped, measured at 0.6% when the standoffs were solved. Anything a
        // reader would actually notice is a different thing and fails.
        if (f.area >= 0.01) loud.push(line);
      }
    }
  }
  console.log(seen.length === 0 ? 'no intruders anywhere' : seen.join('\n'));
  expect(loud, 'a neighbour is in shot').toEqual([]);
});

/**
 * How fast the camera turns, per hundredth of the section.
 *
 * This scene interpolates the LOOK POINT rather than the angle, which is fine
 * while every look point is in front of the camera and roughly the same
 * distance away, and a trap the moment one is not: a path between two look
 * points either side of the camera passes close to it, and the closer it
 * passes the faster the camera spins. At the limit it passes through the
 * camera and the view flips.
 *
 * Nothing in the journey as it ships does that. The number is recorded here so
 * that a future stop which does gets caught by arithmetic rather than by
 * somebody noticing a whip pan.
 */
test('the camera never swings faster than this journey already does', () => {
  const STEP = 0.001;
  const yawAt = (p: number) => {
    const { from, to, t } = segmentAt(p, STOPS);
    const lerp = (a: readonly number[], b: readonly number[], k: number) =>
      new Vector3(
        (a[0] ?? 0) + ((b[0] ?? 0) - (a[0] ?? 0)) * k,
        (a[1] ?? 0) + ((b[1] ?? 0) - (a[1] ?? 0)) * k,
        (a[2] ?? 0) + ((b[2] ?? 0) - (a[2] ?? 0)) * k,
      );
    const pos = lerp(from.pos, to.pos, t);
    const look = lerp(from.look, to.look, t);
    const d = new Vector3().subVectors(look, pos);
    return { yaw: Math.atan2(d.x, d.z) / DEG, reach: d.length() };
  };

  const step = (p: number) => {
    const a = yawAt(p);
    const b = yawAt(p + STEP);
    let d = b.yaw - a.yaw;
    // Shortest way round, so a crossing of the +-180 seam is not read as a
    // 359 degree spin. The camera has no idea the seam is there.
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return { rate: Math.abs(d), reach: Math.min(a.reach, b.reach) };
  };

  let worst = 0;
  let worstAt = 0;
  let nearest = Infinity;
  for (let p = 0; p < 1 - STEP; p += STEP) {
    const { rate, reach } = step(p);
    if (rate > worst) {
      worst = rate;
      worstAt = p;
    }
    nearest = Math.min(nearest, reach);
  }

  const perCent = ((worst * 0.01) / STEP).toFixed(1);
  console.log(
    `worst swing: ${perCent} deg per 1% of section, at p=${worstAt.toFixed(3)}\n` +
      `closest the aim point ever comes to the camera: ${nearest.toFixed(2)} units`,
  );

  /**
   * 10, against a journey that measures 7.9.
   *
   * A recorded budget rather than a target anybody aimed at. The four ways
   * hand over from one to the next across the fan, and that hand-over is the
   * fastest the camera ever moves; everything else is a dolly straight down
   * the middle. Half again on top of what it spends today is room for a fifth
   * object or a re-timed stop and no room at all for a whip pan.
   *
   * For scale: the rear-fan experiment on claude/crossroads-dead-ends put a
   * 160 degree about-face into this section and measured 37.7, which is where
   * the number stops being a matter of taste.
   */
  expect((worst * 0.01) / STEP, 'the camera got faster').toBeLessThanOrEqual(10);

  // The look point passing through the camera is the failure this bounds, and
  // it is a hard geometric one rather than a matter of taste.
  expect(nearest, 'the aim point passes through the camera').toBeGreaterThan(2);
});

/**
 * aimY is not a free parameter.
 *
 * standOff() never reads it, so all it does is pitch the camera, and the pitch
 * that frames a thing points at the middle of it. That was a rule somebody
 * held in their head while the four standoffs were solved, and nothing else
 * catches breaking it: a mis-set aimY leaves the object in frame, sitting in
 * the top or the bottom of it with the floor or the dark taking the rest.
 */
test('every lane aims at the middle of what stands on it', () => {
  const report: string[] = [];
  for (const lane of LANES) {
    const box = find(lane.key).box;
    const middle = (box.min.y + box.max.y) / 2;
    report.push(
      `${lane.key}: y ${box.min.y.toFixed(2)} to ${box.max.y.toFixed(2)}, middle ${middle.toFixed(2)}, aimY ${lane.aimY}`,
    );
  }
  console.log(report.join('\n'));
  for (const lane of LANES) {
    const box = find(lane.key).box;
    const middle = (box.min.y + box.max.y) / 2;
    // A quarter of a unit, which at these standoffs is under three degrees of
    // pitch. Tight enough to catch a number typed from the wrong object and
    // loose enough that a deliberate lift towards a screen is still allowed.
    expect(Math.abs(lane.aimY - middle), `${lane.key} aims off centre`).toBeLessThan(0.42);
  }
});
