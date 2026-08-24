/**
 * „Vier Wege zur Zusammenarbeit" as a place you walk through.
 *
 * Four lanes fan out from a junction. At the end of each stands the thing you
 * would actually get. Nothing in here is labelled: every word the reader sees
 * is DOM text beside the canvas, so nothing is said twice.
 *
 * Scope, not price, is what the geometry says. Comparing 90 € a month with
 * 680 € a day as volumes would be a lie. Comparing how much machine you get
 * is the truth.
 *
 * This file owns three.js and nothing else. The choreography it runs lives in
 * progress.ts, with no three.js import, which is why it can be unit-tested.
 */
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DoubleSide,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  SpotLight,
  Vector3,
  WebGLRenderer,
} from 'three';

import { PALETTE } from './palette';
import { focusAt, segmentAt } from './progress';
import { createRegistry } from './registry';
import type { Handle, Stop, Way } from './types';

/**
 * The four lanes, left to right across the fan.
 *
 * A positive angle swings a lane to the left, because rotating local -Z about
 * +Y sends it to (-sin a, 0, -cos a). Way 01 is therefore leftmost, and the
 * four read left to right in the order they are priced.
 *
 * `back` is how far the camera stands off the object at the end of a lane, and
 * `aimY` the height it looks at. Both are per-lane because one distance cannot
 * frame a monitor and an office, and one height cannot hold a rack and the
 * cloud above it.
 *
 * One array of objects rather than four parallel arrays: four arrays indexed
 * in lockstep are exactly the shape that drifts, and under this project's
 * `noUncheckedIndexedAccess` every one of those reads would have needed a
 * guard anyway.
 */
const LANES = [
  { angle: 0.8, dist: 16, back: 10, aimY: 2.5 },
  { angle: 0.28, dist: 14, back: 11, aimY: 2.8 },
  { angle: -0.28, dist: 14, back: 14.5, aimY: 1.7 },
  { angle: -0.8, dist: 16, back: 13, aimY: 4.1 },
] as const;

const Y_AXIS = new Vector3(0, 1, 0);

/** Stand `back` short of a target, on its own lane, at eye height. */
function standOff(target: Vector3, back: number): [number, number, number] {
  const flat = new Vector3(target.x, 0, target.z);
  const length = flat.length();
  const p = flat
    .divideScalar(length)
    .multiplyScalar(length - back)
    .setY(2.7);
  return [p.x, p.y, p.z];
}

export function boot(canvas: HTMLCanvasElement, host: HTMLElement, ways: readonly Way[]): Handle {
  // The floor is laid out for exactly four. A fifth service would need its own
  // angle, its own lane length, its own standoff and its own object, so the
  // honest failure is here rather than a lane with nothing at the end of it.
  if (ways.length !== LANES.length) {
    throw new Error(
      `crossroads: the floor is laid out for ${LANES.length} lanes but ${ways.length} ways were given`,
    );
  }

  const reg = createRegistry();
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color(PALETTE.background);
  scene.fog = new FogExp2(PALETTE.background, 0.022);

  const camera = new PerspectiveCamera(50, 2, 0.1, 200);
  scene.add(new AmbientLight(0x44546c, 1.0));

  const key = new SpotLight(0xffd9a4, 200, 40, Math.PI / 3.4, 0.65, 1.05);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.002;
  scene.add(key, key.target);
  const fill = new PointLight(0x7fa8d0, 26, 40, 1.4);
  scene.add(fill);

  const ground = new Mesh(
    reg.track(new PlaneGeometry(120, 120)),
    reg.track(new MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.97 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const hub = new Mesh(
    reg.track(new PlaneGeometry(3.4, 3.4)),
    reg.track(
      new MeshBasicMaterial({
        color: PALETTE.accent,
        transparent: true,
        opacity: 0.16,
        side: DoubleSide,
      }),
    ),
  );
  hub.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
  hub.position.y = 0.012;
  scene.add(hub);

  /** One lane per way: a rotated group and the lit strip running down it. */
  const lanes = LANES.map((geom) => {
    const group = new Group();
    group.rotation.y = geom.angle;
    scene.add(group);

    const strip = new Mesh(
      reg.track(new PlaneGeometry(2.1, geom.dist)),
      reg.track(
        new MeshBasicMaterial({
          color: PALETTE.accent,
          transparent: true,
          opacity: 0.09,
          side: DoubleSide,
        }),
      ),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.014, -geom.dist / 2);
    group.add(strip);

    const target = new Vector3(0, geom.aimY, -geom.dist).applyAxisAngle(Y_AXIS, geom.angle);
    return { group, target, back: geom.back, built: 0 };
  });

  const STOPS: Stop[] = [
    { at: 0, focus: -1, pos: [0, 3.6, 13], look: [0, 2, -8] },
    ...lanes.map((lane, i) => ({
      at: 0.18 + i * 0.19,
      focus: i,
      pos: standOff(lane.target, lane.back),
      look: [lane.target.x, lane.target.y, lane.target.z] as [number, number, number],
    })),
    { at: 1, focus: -1, pos: [0, 5, 15], look: [0, 2, -9] },
  ];

  const pos = new Vector3();
  const look = new Vector3();
  // Named scratch and not `to`, because layout() also has a stop called `to`
  // and one of the two would have to be renamed at the point of use.
  const scratch = new Vector3();

  let progress = 0;
  let dirty = true;
  let raf = 0;
  let alive = true;

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }

  /**
   * Everything except the draw call, run synchronously from set(), so anything
   * asking which way is in focus gets the answer for the scroll position it
   * just handed us rather than the one from the previous frame. The prototype
   * read this from the render loop and named the wrong service for a frame.
   */
  function layout(p: number) {
    const { from, to, t } = segmentAt(p, STOPS);
    pos
      .set(from.pos[0], from.pos[1], from.pos[2])
      .lerp(scratch.set(to.pos[0], to.pos[1], to.pos[2]), t);
    look
      .set(from.look[0], from.look[1], from.look[2])
      .lerp(scratch.set(to.look[0], to.look[1], to.look[2]), t);
    camera.position.copy(pos);
    camera.lookAt(look);

    // Light whatever is being looked at, not the junction it was lit from.
    key.position.set(look.x * 0.75 + pos.x * 0.25, 7, look.z * 0.75 + pos.z * 0.25 + 4.5);
    key.target.position.copy(look);
    key.target.updateMatrixWorld();
    fill.position.set(pos.x, 3.4, pos.z - 1);
  }

  function frame() {
    raf = 0;
    if (dirty) {
      dirty = false;
      renderer.render(scene, camera);
    }
    if (alive) raf = requestAnimationFrame(frame);
  }

  resize();
  layout(0);
  raf = requestAnimationFrame(frame);
  window.addEventListener('resize', resize, { passive: true });

  return {
    set(p) {
      progress = p < 0 ? 0 : p > 1 ? 1 : p;
      layout(progress);
      dirty = true;
    },
    focus: () => focusAt(progress, STOPS, lanes.length),
    built: () => lanes.reduce((n, l) => n + l.built, 0) / lanes.length,
    stop() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      reg.disposeAll();
      renderer.dispose();
    },
  };
}
