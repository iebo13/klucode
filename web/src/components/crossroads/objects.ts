/**
 * What stands at the end of each of the four ways.
 *
 * Everything here is a box, a cylinder or a sphere. That is a constraint, not a
 * taste: every solid gets a `LineSegments` sibling built by `EdgesGeometry`
 * from the very same geometry INSTANCE, so the drawing and the thing can never
 * drift out of register at any camera angle. A shape without clean edges would
 * have no blueprint to arrive as.
 *
 * Scope, never price. The four offers are priced in three different units, a
 * fixed fee, a day rate and a monthly fee, so nothing in this file sizes,
 * counts or weights an object by what it costs. 90 € a month and 680 € a day
 * are not comparable volumes and the geometry does not pretend they are.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type Material,
  type Texture,
} from 'three';

import { PALETTE } from './palette';
import { paint } from './surfaces';
import {
  DASHBOARD_SIZE,
  LANDING_SIZE,
  WORK_SIZE,
  drawDashboard,
  drawLanding,
  drawWorkScreen,
} from './textures';
import type { SceneLabels, ServiceKey } from './types';

/** One thing that builds as a whole: a monitor, a database, a team. */
export type Unit = { mats: Material[]; line: LineBasicMaterial };

export type BuildContext = {
  lane: Group;
  /** How far down the lane the object stands, as a negative z. */
  z: number;
  track: <T extends { dispose(): void }>(item: T) => T;
  labels: SceneLabels;
};

/**
 * The blueprint's alpha when nothing is built. The solid fades in against it.
 *
 * Exported because scene.ts fades it back out again, and two copies of the same
 * number in two files is the drift shape this directory keeps avoiding.
 */
export const LINE_ALPHA = 0.62;

function unit(ctx: BuildContext, color: number, roughness: number, metalness = 0): Unit {
  const solid = ctx.track(
    new MeshStandardMaterial({ color, roughness, metalness, transparent: true, opacity: 0 }),
  );
  const line = ctx.track(
    new LineBasicMaterial({ color: PALETTE.blueprint, transparent: true, opacity: LINE_ALPHA }),
  );
  return { mats: [solid], line };
}

/**
 * Adds one mesh and its blueprint edges. `mat` overrides the unit's shared
 * material, which is how a textured screen joins a unit made of grey boxes.
 */
function piece(
  ctx: BuildContext,
  u: Unit,
  geo: BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  mat?: Material,
  /**
   * Squash on one or more axes. Applied to the blueprint as well as to the
   * solid, which is the only reason it is a parameter here rather than a
   * `mesh.scale.set()` at the call site: the LineSegments below copies the
   * mesh's placement, and a scale set on the mesh alone would leave the drawing
   * describing a shape the solid does not have. That is the one thing this
   * whole directory is built to make impossible.
   */
  scale?: readonly [number, number, number],
) {
  const material = mat ?? u.mats[0];
  if (material === undefined) {
    // Unreachable: unit() seeds mats with its solid before anything can call
    // this. Said out loud rather than asserted away, because letting undefined
    // through would hand Mesh a default material nothing tracks, and an
    // untracked material is the one leak the registry exists to prevent.
    throw new Error('crossroads: a unit reached piece() with no material');
  }
  if (mat && !u.mats.includes(mat)) u.mats.push(mat);

  const mesh = new Mesh(ctx.track(geo), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Built from `geo` itself, not from an equivalent geometry, which is the
  // whole mechanic: the drawing cannot describe a shape the solid does not have.
  const edges = new LineSegments(ctx.track(new EdgesGeometry(geo)), u.line);
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  edges.scale.copy(mesh.scale);

  ctx.lane.add(mesh, edges);
  return mesh;
}

/** A painted surface, unlit and untone-mapped, so a screen reads as emitting. */
const screenMat = (ctx: BuildContext, map: Texture) =>
  ctx.track(
    new MeshBasicMaterial({
      map: ctx.track(map),
      transparent: true,
      opacity: 0,
      toneMapped: false,
    }),
  );

/** One monitor, and on it an actual landing page. One thing, done properly. */
function buildWebsite(ctx: BuildContext): Unit[] {
  const { z } = ctx;
  const frame = unit(ctx, PALETTE.metal, 0.5, 0.2);
  piece(ctx, frame, new BoxGeometry(5.4, 3.5, 0.22), 0, 2.9, z);
  piece(ctx, frame, new BoxGeometry(0.3, 1.1, 0.3), 0, 0.6, z);
  piece(ctx, frame, new BoxGeometry(2.1, 0.14, 1.2), 0, 0.06, z);

  const screen = unit(ctx, PALETTE.screen, 1);
  const map = paint(LANDING_SIZE[0], LANDING_SIZE[1], (g) => drawLanding(g, ctx.labels.landing));
  piece(ctx, screen, new PlaneGeometry(5, 3.13), 0, 2.9, z + 0.13, 0, 0, screenMat(ctx, map));

  return [frame, screen];
}

/** Not a screen: a system. Dashboard, database, server, joined by wire. */
function buildApp(ctx: BuildContext): Unit[] {
  const { z } = ctx;
  const frame = unit(ctx, PALETTE.metal, 0.5, 0.2);
  piece(ctx, frame, new BoxGeometry(6, 3.6, 0.22), 0, 3.4, z);
  piece(ctx, frame, new BoxGeometry(0.32, 1.5, 0.32), 0, 0.85, z);
  piece(ctx, frame, new BoxGeometry(2.3, 0.14, 1.2), 0, 0.06, z);

  const screen = unit(ctx, PALETTE.screen, 1);
  const map = paint(DASHBOARD_SIZE[0], DASHBOARD_SIZE[1], (g) =>
    drawDashboard(g, ctx.labels.dashboard),
  );
  piece(ctx, screen, new PlaneGeometry(5.6, 3.15), 0, 3.4, z + 0.13, 0, 0, screenMat(ctx, map));

  // The database and the server are drawn in from ±3.4 to ±2.75.
  //
  // They set this way's width, and its width set the camera's distance, and
  // that distance is what decides how big the dashboard is on screen. Flung
  // out to ±3.4 they made the unit 8.65 across, so the camera had to stand far
  // enough back to see both of them and the dashboard shrank to fit a frame
  // sized for two objects that are not the point. Pulled in, the same three
  // things read as one system and the screen is the largest thing in the shot,
  // which is the correct order: the dashboard is the argument, the database
  // and the server are what it stands on.
  const db = unit(ctx, PALETTE.metalMid, 0.55, 0.3);
  piece(ctx, db, new CylinderGeometry(0.95, 0.95, 1.4, 24), -2.5, 0.72, z + 0.9);
  piece(ctx, db, new CylinderGeometry(0.97, 0.97, 0.1, 24), -2.5, 1.45, z + 0.9);
  piece(ctx, db, new CylinderGeometry(0.97, 0.97, 0.1, 24), -2.5, 1.05, z + 0.9);

  const server = unit(ctx, PALETTE.metalDark, 0.45, 0.4);
  piece(ctx, server, new BoxGeometry(1.3, 2.3, 1.1), 2.5, 1.15, z + 0.9);
  for (let k = 0; k < 5; k += 1) {
    piece(ctx, server, new BoxGeometry(1.04, 0.1, 0.06), 2.5, 0.5 + k * 0.4, z + 1.47);
  }

  const wire = unit(ctx, PALETTE.accent, 0.4);
  piece(ctx, wire, new BoxGeometry(1.6, 0.07, 0.07), -1.6, 1.5, z + 0.6);
  piece(ctx, wire, new BoxGeometry(1.6, 0.07, 0.07), 1.6, 1.7, z + 0.55);

  return [frame, screen, db, server, wire];
}

/**
 * An office with a team already in it, and one seat free in the middle.
 *
 * The free seat is the offer, and it only reads as an offer because the other
 * two are taken. An empty room would say the opposite of what is being sold.
 */
function buildCapacity(ctx: BuildContext): Unit[] {
  const { z } = ctx;
  const desks = unit(ctx, PALETTE.wood, 0.76);
  const metal = unit(ctx, PALETTE.metalMid, 0.45, 0.35);
  const screens = unit(ctx, PALETTE.screen, 1);
  const people = unit(ctx, PALETTE.people, 0.75);
  const map = paint(WORK_SIZE[0], WORK_SIZE[1], drawWorkScreen);
  const shared = screenMat(ctx, map);

  // `as const`, so destructuring reads two numbers rather than two
  // `number | undefined`s under noUncheckedIndexedAccess.
  const legs = [
    [-1.0, 0.5],
    [1.0, 0.5],
    [-1.0, -0.5],
    [1.0, -0.5],
  ] as const;

  /**
   * Three desks, staggered rather than in a rank.
   *
   * Three desks 2.7 wide at ±3.6 behind a partition 11.5 wide made this way
   * 11.5 across, against the monitor's 5.4 and the rack's 1.9. A row is the
   * widest arrangement three desks have, and the width was the whole problem:
   * the camera had to stand far enough back to see both ends, and from there
   * two neighbouring lanes were in the shot while the office itself filled a
   * third of the frame's height. Narrower desks at ±2.8, with the free one
   * forward of the other two, hold the same three seats in 7.9 and give the
   * room some depth instead of a straight line.
   *
   * The free seat still reads as the offer, and for the same reason: the other
   * two are taken. Standing forward of them only makes it the first thing seen.
   */
  const DESKS = [
    { x: -2.8, dz: -0.55 },
    { x: 0, dz: 0.75 },
    { x: 2.8, dz: -0.55 },
  ] as const;

  DESKS.forEach((desk, k) => {
    const { x } = desk;
    const dz = z + desk.dz;
    piece(ctx, desks, new BoxGeometry(2.3, 0.14, 1.35), x, 0.78, dz);
    for (const [lx, lz] of legs) {
      piece(ctx, desks, new BoxGeometry(0.12, 0.78, 0.12), x + lx, 0.39, dz + lz);
    }
    piece(ctx, metal, new BoxGeometry(1.35, 0.85, 0.07), x, 1.42, dz - 0.28);
    piece(ctx, metal, new BoxGeometry(0.12, 0.28, 0.12), x, 0.99, dz - 0.28);
    piece(ctx, screens, new PlaneGeometry(1.24, 0.76), x, 1.42, dz - 0.235, 0, 0, shared);

    const free = k === 1;
    const cz = dz + (free ? 1.5 : 1.05);
    const turn = free ? 0.4 : 0;
    piece(ctx, metal, new BoxGeometry(0.6, 0.1, 0.6), x, 0.52, cz, 0, turn);
    piece(ctx, metal, new BoxGeometry(0.6, 0.66, 0.09), x, 0.86, cz + 0.28, 0, turn);
    piece(ctx, metal, new CylinderGeometry(0.07, 0.07, 0.44, 10), x, 0.28, cz);
    piece(ctx, metal, new CylinderGeometry(0.34, 0.34, 0.06, 12), x, 0.05, cz);

    if (!free) {
      piece(ctx, people, new CylinderGeometry(0.28, 0.36, 0.9, 14), x, 1.03, cz - 0.05);
      piece(ctx, people, new BoxGeometry(0.82, 0.22, 0.34), x, 1.4, cz - 0.05);
      piece(ctx, people, new SphereGeometry(0.24, 16, 16), x, 1.72, cz - 0.05);
    }
  });

  // A low partition behind, so it reads as a room and not three desks in a void.
  // 7.6 rather than 11.5, which keeps it just inside the desks it stands behind
  // instead of being the widest thing in the scene by half again.
  piece(ctx, desks, new BoxGeometry(7.6, 1.5, 0.16), 0, 0.75, z - 2.1);

  return [desks, metal, screens, people];
}

/** The server, the cloud it is connected to, and the light that says it is up. */
function buildCare(ctx: BuildContext): Unit[] {
  const { z } = ctx;
  const rack = unit(ctx, PALETTE.metalDark, 0.45, 0.4);
  piece(ctx, rack, new BoxGeometry(1.9, 3, 1.2), 0, 1.5, z);
  for (let k = 0; k < 8; k += 1) {
    piece(ctx, rack, new BoxGeometry(1.55, 0.11, 0.06), 0, 0.4 + k * 0.33, z + 0.63);
  }

  /**
   * The cloud, rebuilt: four flattened puffs at 4.9 rather than five round
   * ones at 6.4.
   *
   * Five spheres of near-equal radius stacked into a lump is the shape a
   * cartoon cloud has, and next to a rack and an office drawn as plain
   * rectangular volumes it was the one object on the whole floor that looked
   * illustrated. Squashing each puff to just over half its height takes the
   * lump out: it reads as a bank of cloud rather than as the icon for one.
   *
   * The drop from 6.4 to 4.9 is framing. At 6.4 this way stood 7.55 units tall
   * against the monitor's 4.65, so the camera had to stand off far enough to
   * fit a column two thirds of which was empty air between the rack and the
   * weather, and at that distance the office on the next lane was in the shot.
   * Lowered, the whole way is 5.55 tall and the uplink still separates the two.
   */
  const cloud = unit(ctx, PALETTE.cloud, 0.95);
  const SQUASH = [1, 0.55, 0.85] as const;
  const puffs: [number, number, number, number][] = [
    [0, 4.85, 0, 1.25],
    [-1, 4.7, 0.15, 0.9],
    [1, 4.75, -0.15, 0.95],
    [0.05, 5.15, 0, 0.72],
  ];
  for (const [px, py, pz, r] of puffs) {
    piece(ctx, cloud, new SphereGeometry(r, 18, 14), px, py, z + pz, 0, 0, undefined, SQUASH);
  }

  // The uplink: rungs climbing from the rack into the cloud, so the two read
  // as one system rather than as a box with weather above it.
  //
  // Five rungs over the 1.16 units between them, widening as they go. Three
  // small squares evenly spaced read as three separate marks with gaps twice
  // their own size, which is a dotted line, not a connection. Widening them
  // gives the run a direction: it starts the width of a cable at the rack and
  // arrives the width of the cloud it joins.
  const link = unit(ctx, PALETTE.accent, 0.4);
  for (let k = 0; k < 5; k += 1) {
    const w = 0.22 + k * 0.11;
    piece(ctx, link, new BoxGeometry(w, 0.07, w), 0, 3.22 + k * 0.24, z);
  }

  // The status light, which is the whole proposition of this way in one lamp.
  const status = unit(ctx, PALETTE.status, 1);
  const lamp = ctx.track(
    new MeshBasicMaterial({
      color: PALETTE.status,
      transparent: true,
      opacity: 0,
      toneMapped: false,
    }),
  );
  piece(ctx, status, new SphereGeometry(0.1, 12, 12), 0.7, 2.7, z + 0.66, 0, 0, lamp);

  return [rack, cloud, link, status];
}

export const BUILDERS: Record<ServiceKey, (ctx: BuildContext) => Unit[]> = {
  website: buildWebsite,
  app: buildApp,
  capacity: buildCapacity,
  care: buildCare,
};
