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

import { BUILDERS, LINE_ALPHA } from './objects';
import { PALETTE } from './palette';
import { buildTargets, focusAt, ratchet, segmentAt } from './progress';
import { createRegistry } from './registry';
import type { Handle, SceneLabels, ServiceKey, Stop, Way } from './types';

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
 *
 * `key` is on the lane for the same reason. `back` and `aimY` are tuned for
 * one particular object, and until they carried a key the only thing pairing
 * them with that object was the order of the array in a different module.
 * Objects are chosen by key and cameras were chosen by position, so reordering
 * ORDER in index.tsx, or booting from a second surface that sorts its own way,
 * would have left every object framed from another object's distance with
 * nothing raised and nothing to see in a stack trace. The check in boot() is
 * what turns that into a loud failure at the first frame.
 */
const LANES = [
  { key: 'website', angle: 0.8, dist: 16, back: 10, aimY: 2.5 },
  { key: 'app', angle: 0.28, dist: 14, back: 11, aimY: 2.8 },
  { key: 'capacity', angle: -0.28, dist: 14, back: 14.5, aimY: 1.7 },
  { key: 'care', angle: -0.8, dist: 16, back: 13, aimY: 4.1 },
  // satisfies rather than a type annotation, so the literal values stay literal
  // for the check in boot() while a mistyped key is still a compile error.
] as const satisfies readonly {
  key: ServiceKey;
  angle: number;
  dist: number;
  back: number;
  aimY: number;
}[];

/**
 * How solid a thing must be before it is drawn at all, and therefore before it
 * casts a shadow.
 *
 * A three.js shadow is binary: the depth material copies `visible` and nothing
 * else, so the shadow cannot fade in with the object and SOME step is
 * unavoidable. All this number chooses is where the step falls.
 *
 * Halfway, measured across way 01's whole ramp against 0.75 and 0.3. At 0.75
 * the frame-to-frame change at the crossing was more than double the largest
 * anywhere else in the move, and the blueprint has faded to 0.16 by then, so
 * the drawing is gone before the thing turns up. At 0.5 the crossing is smaller
 * than the ordinary change between two later frames of the same move, and the
 * blueprint is still at 0.31 and plainly legible when the solid takes over, so
 * the handover has no hole in it. Lower thresholds measure smoother only
 * because way 01 is barely in frame that early, and they put a full-strength
 * shadow under an object that is still a ghost, which is the bug this line
 * exists to fix.
 */
const BUILD_VISIBLE_AT = 0.5;

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

export function boot(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  ways: readonly Way[],
  labels: SceneLabels,
): Handle {
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
  scene.add(new AmbientLight(PALETTE.lightAmbient, 1.0));

  const key = new SpotLight(PALETTE.lightKey, 200, 40, Math.PI / 3.4, 0.65, 1.05);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.002;
  scene.add(key, key.target);
  const fill = new PointLight(PALETTE.lightFill, 26, 40, 1.4);
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

  /** One lane per way: a rotated group, the lit strip, and the thing at the end. */
  const lanes = LANES.map((geom, i) => {
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

    const way = ways[i];
    if (way === undefined) {
      // Unreachable: the length guard at the top of boot() has already refused
      // any ways array that is not exactly LANES.length long. Written out
      // rather than asserted away, because under noUncheckedIndexedAccess an
      // index really is not a promise and this project bans the shortcut.
      throw new Error(`crossroads: lane ${i} was laid out with no way to put on it`);
    }
    // The lane's standoff and look height are tuned for one object, and the
    // object is chosen by key. If the caller hands the ways in another order
    // the two silently disagree: every object appears, framed from the wrong
    // distance, with nothing to notice. boot() takes any four ways and trusts
    // the caller sorted them, so this is where that trust is checked.
    if (way.key !== geom.key) {
      throw new Error(
        `crossroads: lane ${i} is tuned for ${geom.key} but was given ${way.key}. The ways must arrive in the order LANES lays out.`,
      );
    }
    // Keyed by the way, not by position, so a lane can never be handed the
    // object belonging to a different service.
    const units = BUILDERS[way.key]({ lane: group, z: -geom.dist, track: reg.track, labels });

    const target = new Vector3(0, geom.aimY, -geom.dist).applyAxisAngle(Y_AXIS, geom.angle);
    return { group, target, back: geom.back, units, built: 0 };
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
  /**
   * The pending draw, or 0 for none.
   *
   * It doubles as the dirty flag, which is why there is no second boolean: a
   * frame is scheduled exactly when there is something to draw, and frame()
   * clears it as its first act. Two flags saying the same thing is the shape
   * that drifts.
   */
  let raf = 0;
  let alive = true;

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
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

    // Built stays built. The ratchet lives in progress.ts, where it is tested,
    // and the only thing that happens here is painting the result.
    const next = ratchet(
      lanes.map((l) => l.built),
      buildTargets(p, STOPS, lanes.length),
    );
    lanes.forEach((lane, i) => {
      // next is mapped from lanes, so it is the same length by construction and
      // this fallback cannot fire. It is a fallback rather than a throw because
      // layout() runs on every scroll frame, where throwing would turn one bad
      // number into a scene that stops rendering altogether.
      const built = next[i] ?? lane.built;
      lane.built = built;
      for (const u of lane.units) {
        for (const m of u.mats) {
          m.opacity = built;
          // Not decoration. three.js renders shadows from a depth material that
          // copies `visible` and reads `alphaTest`, and never looks at
          // `opacity` or `transparent` at all: WebGLShadowMap gates the whole
          // shadow draw on `material.visible`. Without this an object at
          // opacity 0 lays its full solid silhouette on the floor, so the
          // shadow arrives before the thing does, which is precisely backwards
          // for a scene whose whole argument is that the drawing becomes the
          // object. It also keeps the main pass from drawing meshes nobody can
          // see.
          m.visible = built > BUILD_VISIBLE_AT;
        }
        // The drawing fades out as the thing fades in, so the two are never
        // both at full strength and the object never reads as a wireframe cage
        // around a solid.
        u.line.opacity = LINE_ALPHA * (1 - built);
      }
    });
  }

  function frame() {
    raf = 0;
    // stop() cancels the pending callback, but a cancellation that lands in the
    // same frame the callback was already dispatched in would still draw into a
    // disposed renderer.
    if (!alive) return;
    renderer.render(scene, camera);
  }

  /**
   * Asks for one frame, and parks afterwards.
   *
   * The loop used to reschedule unconditionally, so an rAF callback stayed
   * alive for the whole visit even with the section four viewports away and
   * nothing dirty. That is a permanent cost on a page whose pitch is that it
   * costs the visitor nothing, and it bought nothing: every change to the
   * scene arrives through set() or resize(), and both of them come through
   * here. So nothing is scheduled unless something changed, and one already
   * scheduled frame absorbs any number of further changes before it runs.
   */
  function invalidate() {
    if (!alive || raf !== 0) return;
    raf = requestAnimationFrame(frame);
  }

  resize();
  layout(0);
  invalidate();
  window.addEventListener('resize', resize, { passive: true });

  return {
    set(p) {
      progress = p < 0 ? 0 : p > 1 ? 1 : p;
      layout(progress);
      invalidate();
    },
    focus: () => focusAt(progress, STOPS, lanes.length),
    // A count of finished ways, not a mean of four ramps. Averaging read 2
    // with one way finished and another half done, which is a count of nothing
    // and made data-built a name for something the DOM did not hold.
    built: () => lanes.filter((l) => l.built >= 1).length,
    stop() {
      // Works whether the loop is running or parked: raf is 0 when parked, and
      // clearing alive keeps invalidate() from restarting it if a late scroll
      // frame calls set() after teardown.
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener('resize', resize);
      reg.disposeAll();
      renderer.dispose();
    },
  };
}
