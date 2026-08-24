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
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Built from `geo` itself, not from an equivalent geometry, which is the
  // whole mechanic: the drawing cannot describe a shape the solid does not have.
  const edges = new LineSegments(ctx.track(new EdgesGeometry(geo)), u.line);
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);

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

  const db = unit(ctx, PALETTE.metalMid, 0.55, 0.3);
  piece(ctx, db, new CylinderGeometry(1.05, 1.05, 1.4, 24), -3.4, 0.72, z + 1.8);
  piece(ctx, db, new CylinderGeometry(1.07, 1.07, 0.1, 24), -3.4, 1.45, z + 1.8);
  piece(ctx, db, new CylinderGeometry(1.07, 1.07, 0.1, 24), -3.4, 1.05, z + 1.8);

  const server = unit(ctx, PALETTE.metalDark, 0.45, 0.4);
  piece(ctx, server, new BoxGeometry(1.4, 2.3, 1.1), 3.5, 1.15, z + 1.7);
  for (let k = 0; k < 5; k += 1) {
    piece(ctx, server, new BoxGeometry(1.12, 0.1, 0.06), 3.5, 0.5 + k * 0.4, z + 2.27);
  }

  const wire = unit(ctx, PALETTE.accent, 0.4);
  piece(ctx, wire, new BoxGeometry(2.3, 0.07, 0.07), -1.9, 1.5, z + 1.2);
  piece(ctx, wire, new BoxGeometry(2.3, 0.07, 0.07), 2, 1.7, z + 1.1);

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
    [-1.2, 0.5],
    [1.2, 0.5],
    [-1.2, -0.5],
    [1.2, -0.5],
  ] as const;

  [-3.6, 0, 3.6].forEach((x, k) => {
    piece(ctx, desks, new BoxGeometry(2.7, 0.14, 1.35), x, 0.78, z);
    for (const [dx, dz] of legs) {
      piece(ctx, desks, new BoxGeometry(0.12, 0.78, 0.12), x + dx, 0.39, z + dz);
    }
    piece(ctx, metal, new BoxGeometry(1.35, 0.85, 0.07), x, 1.42, z - 0.28);
    piece(ctx, metal, new BoxGeometry(0.12, 0.28, 0.12), x, 0.99, z - 0.28);
    piece(ctx, screens, new PlaneGeometry(1.24, 0.76), x, 1.42, z - 0.235, 0, 0, shared);

    const free = k === 1;
    const cz = z + (free ? 1.5 : 1.05);
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
  piece(ctx, desks, new BoxGeometry(11.5, 1.5, 0.16), 0, 0.75, z - 1.5);

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

  const cloud = unit(ctx, PALETTE.cloud, 0.95);
  const puffs: [number, number, number, number][] = [
    [0, 6.4, 0, 1.15],
    [-1.35, 6.15, 0.2, 0.85],
    [1.35, 6.2, -0.15, 0.92],
    [-0.7, 6.75, -0.3, 0.75],
    [0.8, 6.8, 0.25, 0.7],
  ];
  for (const [px, py, pz, r] of puffs) {
    piece(ctx, cloud, new SphereGeometry(r, 18, 14), px, py, z + pz);
  }

  // The uplink: rungs climbing from the rack into the cloud, so the two read
  // as one system rather than as a box with weather above it.
  const link = unit(ctx, PALETTE.accent, 0.4);
  for (let k = 0; k < 6; k += 1) {
    piece(ctx, link, new BoxGeometry(0.26, 0.09, 0.26), 0, 3.25 + k * 0.42, z);
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
