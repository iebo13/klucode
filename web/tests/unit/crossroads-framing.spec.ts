import { expect, test } from '@playwright/test';
import { Vector3 } from 'three';

import { GLIDE_MS, glideAt } from '../../src/components/crossroads/journey';
import { LANES, SHOTS, fovFor } from '../../src/components/crossroads/scene';
import type { Shot } from '../../src/components/crossroads/types';
import { buildLanes, type Lane } from './support/scene';

/**
 * The framing suite: what is actually inside the frame, at every shot, at every
 * canvas this scene ever mounts on.
 *
 * This exists because the alternative is looking at it. A field of view here is
 * computed per frame from the shot's two half-angles and the aspect the canvas
 * happens to have, and the canvas runs from 540px wide to 1050px, so a shot
 * that frames its subject on one laptop can crop it on another and no
 * screenshot of the first one would say so. Every standoff in LANES was solved
 * against these numbers once, by hand, and then nothing held them.
 *
 * It runs with no GPU and no browser. three.js geometry, matrices and bounding
 * boxes are all plain maths, and the only thing a WebGL context would have
 * added is the part that is not being asserted.
 */

/**
 * The three stages, and how much of each one the copy panel is standing on.
 *
 * The canvas is the whole stage, and the stage is the section's own height:
 * the panel plus the section rhythm, which is why the height is not the
 * viewport's. `reserve` is the panel's right edge measured from the stage's
 * left, which is the number scene.ts computes at runtime with reserveOf() and
 * the number every shot is composed against. Measured in Chromium against the
 * built site by tools/shoot.mjs, at three viewport widths the mount predicate
 * allows: the container is 72rem capped and centred with 2rem of padding, and
 * the panel is 28rem of it, so the reserve is a layout consequence rather than
 * a constant anybody chose. Re-run the tool after a copy change to the rows,
 * because the height follows the copy.
 */
const CANVASES = [
  { name: '1024 wide', w: 1024, h: 925, reserve: 512 },
  { name: '1440 wide', w: 1440, h: 930, reserve: 656 },
  { name: '1920 wide', w: 1920, h: 930, reserve: 896 },
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

type CameraShot = { pos: Vector3; look: Vector3; fitH: number; fitV: number };
type Canvas = { readonly name: string; readonly w: number; readonly h: number; readonly reserve: number }; // prettier-ignore

const shotOf = (s: Shot): CameraShot => ({
  pos: new Vector3(s.pos[0], s.pos[1], s.pos[2]),
  look: new Vector3(s.look[0], s.look[1], s.look[2]),
  fitH: s.fitH,
  fitV: s.fitV,
});

/**
 * How far outside the COMPOSED region a solid reaches, and how much of that
 * region it fills, at one shot on one stage.
 *
 * The composed region is the part of the canvas the copy panel is not standing
 * on, and it is the only part any of this is about. Under a full-bleed stage
 * the frustum is much wider than the shot: at 1440 wide a lane close-up spans
 * far more world horizontally than the shot itself is composed inside, and the
 * difference is floor, fog and whatever else happens to be out there.
 * Measuring against the canvas would fail every shot for objects nobody is
 * being shown.
 *
 * So both numbers are in units of the composed half-frame: 1 is exactly its
 * edge, `reach` above 1 is a subject clipped by the panel or by the canvas,
 * and `area` is the share of it a neighbour takes.
 *
 * The projection is scene.ts's, including the view offset. The frustum spans
 * [-(1+r), (1-r)] half-widths in tan space where r is the reserve as a
 * fraction of the canvas, which is what setViewOffset(-reserve/2) does, and a
 * point on the camera's axis therefore lands at r rather than at the middle.
 */
function frame(shot: CameraShot, solid: Lane, canvas: Canvas) {
  const { x, y, z } = basis(shot.pos, shot.look);
  const free = Math.max(1, canvas.w - canvas.reserve);
  const vHalf = (fovFor(shot.fitH, shot.fitV, free / canvas.h) / 2) * DEG;
  const tanV = Math.tan(vHalf);
  const tanH = tanV * (canvas.w / canvas.h);
  const r = canvas.reserve / canvas.w;
  // The composed region's left edge in NDC, and half its width, so a point can
  // be reported in composed-frame units where -1 and 1 are its own edges.
  const leftEdge = 2 * r - 1;
  const halfSpan = (1 - leftEdge) / 2;

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
    const ndcX = v.dot(x) / depth / tanH + r;
    const nx = (ndcX - leftEdge) / halfSpan - 1;
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

/* --- which shot is about what -------------------------------------------- */

const WAY_KEYS = LANES.map((l) => l.key);

/**
 * What a shot must hold whole, and what it must not hold at all.
 *
 * A close-up holds its own way and bans the other three. The junction holds
 * all four and bans nothing: that is the whole job of a wide shot here.
 */
function rolesOf(shot: Shot): { holds: string[]; bans: string[] } {
  if (shot.focus < 0) return { holds: [...WAY_KEYS], bans: [] };
  const key = WAY_KEYS[shot.focus];
  return {
    holds: key === undefined ? [] : [key],
    bans: WAY_KEYS.filter((k) => k !== key),
  };
}

const label = (shot: Shot, i: number) => `shot ${i} (${rolesOf(shot).holds.join('+')})`;

/* --- the assertions ------------------------------------------------------- */

const SOLIDS = buildLanes();
const find = (id: string): Lane => {
  const s = SOLIDS.find((o) => o.key === id);
  if (!s) throw new Error(`crossroads: no solid built for ${id}`);
  return s;
};

test('every shot holds its own subject with nothing cropped', () => {
  const report: string[] = [];
  const cropped: string[] = [];
  for (const [i, stop] of SHOTS.entries()) {
    const shot = shotOf(stop);
    for (const canvas of CANVASES) {
      for (const id of rolesOf(stop).holds) {
        const f = frame(shot, find(id), canvas);
        const line = `${label(stop, i)} ${canvas.name} ${id}: reach ${f.reach.toFixed(3)}${f.behind ? ' BEHIND' : ''}`; // prettier-ignore
        report.push(line);
        if (f.behind || f.reach > 1) cropped.push(line);
      }
    }
  }
  // Collected and asserted at the end rather than thrown at the first one, so a
  // run that fails still prints every number. A framing failure is never fixed
  // by looking at the first shot that broke.
  console.log(report.join('\n'));
  expect(cropped, 'cropped or behind the camera').toEqual([]);
});

test('no close-up has a neighbour standing in its shot', () => {
  const seen: string[] = [];
  const loud: string[] = [];
  for (const [i, stop] of SHOTS.entries()) {
    const shot = shotOf(stop);
    const banned = new Set(rolesOf(stop).bans);
    for (const canvas of CANVASES) {
      for (const solid of SOLIDS) {
        if (!banned.has(solid.key)) continue;
        const f = frame(shot, solid, canvas);
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
 * How fast the camera turns, per hundredth of a glide.
 *
 * This scene interpolates the LOOK POINT rather than the angle, which is fine
 * while every look point is in front of the camera and roughly the same
 * distance away, and a trap the moment one is not: a path between two look
 * points either side of the camera passes close to it, and the closer it
 * passes the faster the camera spins. At the limit it passes through the
 * camera and the view flips.
 *
 * Every ordered pair of shots is walked, because the camera can now be asked
 * to go from any shot to any other: a pointer leaving way 01's row for way
 * 04's sends it straight across the fan, which the scroll track never did.
 */
test('the camera never swings faster than this scene already does', () => {
  const STEP = 0.001;
  const yawAt = (from: Shot, to: Shot, t: number) => {
    const shot = glideAt(from, to, 0, t * GLIDE_MS).shot;
    const pos = new Vector3(shot.pos[0], shot.pos[1], shot.pos[2]);
    const look = new Vector3(shot.look[0], shot.look[1], shot.look[2]);
    const d = new Vector3().subVectors(look, pos);
    return { yaw: Math.atan2(d.x, d.z) / DEG, reach: d.length() };
  };

  let worst = 0;
  let worstPair = '';
  let nearest = Infinity;
  for (const [i, from] of SHOTS.entries()) {
    for (const [j, to] of SHOTS.entries()) {
      if (i === j) continue;
      for (let t = 0; t < 1 - STEP; t += STEP) {
        const a = yawAt(from, to, t);
        const b = yawAt(from, to, t + STEP);
        let d = b.yaw - a.yaw;
        // Shortest way round, so a crossing of the +-180 seam is not read as
        // a 359 degree spin. The camera has no idea the seam is there.
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        const rate = Math.abs(d);
        if (rate > worst) {
          worst = rate;
          worstPair = `${label(from, i)} to ${label(to, j)} at t=${t.toFixed(3)}`;
        }
        nearest = Math.min(nearest, a.reach, b.reach);
      }
    }
  }

  const perCent = (worst * 0.01) / STEP;
  console.log(
    `worst swing: ${perCent.toFixed(2)} deg per 1% of a glide, ${worstPair}\n` +
      `closest the aim point ever comes to the camera: ${nearest.toFixed(2)} units`,
  );

  /**
   * A recorded budget rather than a target anybody aimed at. The fastest move
   * is the one straight across the fan, from way 01 to way 04, and its peak
   * is the middle of a smoothstep. Half again on top of what it spends today
   * is room for a re-timed glide and no room at all for a whip pan.
   */
  expect(perCent, 'the camera got faster').toBeLessThanOrEqual(3);

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
