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
  MathUtils,
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
  { key: 'website', angle: 0.8, dist: 17, back: 9.1, aimY: 2.33 },
  { key: 'app', angle: 0.28, dist: 17, back: 11.4, aimY: 2.6 },
  { key: 'capacity', angle: -0.28, dist: 17, back: 13.2, aimY: 0.98 },
  { key: 'care', angle: -0.8, dist: 17, back: 11.2, aimY: 2.78 },
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
 * The lane lens, as the half-angles every close-up has to cover.
 *
 * One lens for all four stops, and the standoff above does the framing. Giving
 * each stop the field of view that suits its own object frames all four
 * perfectly and makes the world breathe: measured, the journey ran 40°, 64°,
 * 67°, 37° across four adjacent stops, a two-to-one change of focal length
 * while the camera is already moving. A prime lens and a different standoff is
 * what a camera operator does instead, and it leaves exactly one deliberate
 * change of lens in the sequence, at either end, for the wide shot.
 *
 * Every object sits inside 85% of this on its binding axis, which is where the
 * standoffs come from: measured at 1024x736, 1440x900 and 1920x1080, nothing is
 * cropped and the only neighbouring object that appears anywhere is 0.6% of the
 * frame at one corner of the care stop.
 */
const LANE_FIT_H = 24;
const LANE_FIT_V = 18;

/** Eye height for the four close-ups. Roughly standing, in this world's scale. */
const CAM_Y = 2.4;

/**
 * Field of view for a shot that must cover these half-angles at this aspect.
 *
 * Vertical, because that is the only fov three.js takes. Whichever of the two
 * requirements the aspect makes harder is the one that sets it, so both are
 * always satisfied and a wide monitor spends its extra width on air around the
 * subject rather than on a different composition.
 */
const fovFor = (fitH: number, fitV: number, aspect: number) =>
  2 * Math.max(fitV, MathUtils.radToDeg(Math.atan(Math.tan(MathUtils.degToRad(fitH)) / aspect)));

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
    .setY(CAM_Y);
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
  /**
   * 0.72, and it was 1.08.
   *
   * The old exposure sat far enough into the ACES shoulder that the palette
   * stopped meaning anything. Sampled off the rendered canvas at each lane
   * stop: the metalDark rack, token #5C605C, came out #ADA183, three times the
   * token's luminance and plainly cream. The metalMid database, token #757975,
   * came out #C0B294, and the metal monitor frame, token #A8ADA9, came out
   * #E3DDCD, close enough to white that the shoulder had eaten most of its hue.
   * Three materials that separate the rack from the database from the bezel
   * were reading as one warm cream at three brightnesses, so the token
   * guarantee in section 5.7 of the spec was decorative here.
   *
   * At 0.72 the same three sample #616462, #6D6B63 and #AEA38A. The rack is
   * within six points a channel of its token, and the three are 39 and 65
   * points apart, so they read as three greys rather than three creams.
   *
   * This is the level. The cast is the light balance below.
   */
  renderer.toneMappingExposure = 0.72;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color(PALETTE.background);
  // 0.014, and it was 0.022. The wide shot at either end now stands 34 units
  // off the far lanes so it can hold all four without a lens wide enough to
  // bend them, and at 0.022 that distance washed 47% of the contrast out of the
  // two outer objects. At 0.014 it costs 20%, which still reads as depth, and
  // the floor's far edge is still 51% gone by the time it arrives.
  scene.fog = new FogExp2(PALETTE.background, 0.014);

  // The 50 is a placeholder. Every field of view in this scene is computed in
  // layout() from the stop's half-angles and the canvas aspect, and layout()
  // runs before the first frame.
  const camera = new PerspectiveCamera(50, 2, 0.1, 200);

  /**
   * Three lights, and what matters is the ratio between two of them.
   *
   * lightKey is #FFD9A4, which is tungsten. Lit by that alone, a neutral grey
   * is not grey, it is khaki, and no amount of exposure fixes a cast. The key
   * used to run at 200 against a fill of 26, and at the standoff distances the
   * camera actually uses that put the key roughly ten times the fill: every
   * surface in the scene was the key's colour. The metalDark rack sampled
   * #ADA183 against its #5C605C token, warm by 37 points between red and blue.
   *
   * The fix is the cool fill, not the ambient. AmbientLight multiplies a
   * colour that is already dark in linear terms, so at any sane intensity it
   * is a rounding error next to a spotlight: raising it from 1.0 to 0.85 and
   * back moved the rack by two points a channel. The fill is #7FA8D0 and sits
   * at the camera, so key at 70 against fill at 80 lands close to neutral
   * where it counts and leaves the rack at #616462, six points a channel off
   * its token.
   *
   * What it cost: the warmth is now in the pool of light on the floor and on
   * the wood, which is where a warm key belongs, rather than on every surface
   * at once. The scene is dimmer. The drama survives because the key is still
   * directional, still the only thing casting a shadow, and still swings to
   * whatever the camera is looking at.
   *
   * What it did not cost: the build. Measured on the same frame, a built
   * surface against the blueprint standing beside it was 2.46 times its
   * luminance before and is 2.53 times after. The lines themselves read bluer
   * for it: sampled #83988E before, #4A7078 now, against a #5CC2F0 token.
   */
  scene.add(new AmbientLight(PALETTE.lightAmbient, 0.6));

  const key = new SpotLight(PALETTE.lightKey, 70, 40, Math.PI / 3.4, 0.65, 1.05);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.002;
  /**
   * A soft edge, and it had none.
   *
   * One spotlight with a hard shadow put a black trapezoid on the floor behind
   * every object, edge as sharp as the geometry that cast it, which reads as a
   * hole rather than as shade. A real light of that apparent size has a
   * penumbra, and PCFSoftShadowMap will draw one, but only as wide as `radius`
   * says, and the default is 1: barely a pixel at this map size.
   *
   * 4 against a 2048 map is roughly the softness 2 would have given at 1024,
   * plus the extra resolution, so the edge is soft without the blur turning
   * into visible steps. The map costs 16 MB of depth texture once, and it is
   * redrawn only on the frames the scroll actually changes something.
   */
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new PointLight(PALETTE.lightFill, 80, 40, 1.4);
  scene.add(fill);

  // 300 across, and it was 120.
  //
  // The floor has no edge in the fiction, so the fog has to be what ends it. At
  // the old density 0.022 the edge at 60 units was 69% gone and nobody saw it.
  // Lowering the density to 0.014 for the wide shot left it only 38% gone, and
  // it turned up in the close-ups as a hard horizontal line with flat black
  // above: a wall behind the scene rather than distance. At 150 units out the
  // fog has taken 99% of it before it arrives, whatever the camera is doing,
  // and the camera's far plane at 200 finishes the job on the corners.
  //
  // It costs nothing. One plane, two triangles, and no more pixels than before,
  // because every pixel it added is fog-coloured.
  const ground = new Mesh(
    reg.track(new PlaneGeometry(300, 300)),
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

  /**
   * The two wide shots, which stand off the fan far enough to hold all four
   * lanes at once. Their half-angles are wider than a close-up's by design:
   * this is the establishing shot and the only change of lens in the sequence.
   *
   * They are also tilted well down, and that is the part that took measuring.
   * Four objects on a flat floor occupy a band 36° across and 15° tall, and the
   * canvas is a portrait column, so a lens wide enough for the band always
   * leaves the height over-supplied. No camera position fixes that: raising the
   * camera spreads the fan horizontally by as much as it gains vertically, and
   * the best height in a sweep of 169,000 still had the objects covering barely
   * a fifth of the frame.
   *
   * What fills the frame is the floor, and how much floor there is depends on
   * the tilt alone. At the first draft's 6° the horizon sat near the middle and
   * the whole top half was flat unlit background. At 15° down the floor and its
   * four lit lanes carry 67% of the height and the objects sit on them rather
   * than floating in the dark.
   */
  const WIDE_FIT_H = 35.9;
  const WIDE_FIT_V = 15.2;

  const STOPS: Stop[] = [
    { at: 0, focus: -1, pos: [0, 6, 13], look: [0, 0, -10], fitH: WIDE_FIT_H, fitV: WIDE_FIT_V },
    ...lanes.map((lane, i) => ({
      at: 0.18 + i * 0.19,
      focus: i,
      pos: standOff(lane.target, lane.back),
      look: [lane.target.x, lane.target.y, lane.target.z] as [number, number, number],
      fitH: LANE_FIT_H,
      fitV: LANE_FIT_V,
    })),
    // The same shot from further back and a touch higher, so the section ends
    // by releasing the place rather than by cutting away from it.
    { at: 1, focus: -1, pos: [0, 7.2, 15.5], look: [0, 0.2, -10], fitH: 32.8, fitV: 13.5 },
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
    // layout() computes the field of view from the new aspect and calls
    // updateProjectionMatrix itself, so there is deliberately no second call
    // here: a resize that only set the aspect would leave the camera holding
    // the field of view worked out for the previous shape of the canvas.
    layout(progress);
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

    // The lens, from what this shot has to cover and the aspect the canvas
    // currently has. Interpolated across the segment like the position is, so a
    // move between two shots with different half-angles is one continuous
    // change rather than a cut.
    camera.fov = fovFor(
      from.fitH + (to.fitH - from.fitH) * t,
      from.fitV + (to.fitV - from.fitV) * t,
      camera.aspect,
    );
    camera.updateProjectionMatrix();

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
