/**
 * „Vier Wege zur Zusammenarbeit" as a place you look into, in real time.
 *
 * The floor plan is the KluCode K. Four strokes leave a hub, and at the end of
 * each stands the thing you would actually get. The camera flies the letter as
 * the reader scrolls and steps aside to a way's close-up when its row is
 * hovered or focused.
 *
 * Three things are different from the August scene this file is written after,
 * and all three are why it is short.
 *
 * THE PLACE IS LOADED, NOT BUILT. There is no geometry in this module and no
 * material either: assets.ts fetches four glTF bodies, a lightmap each and one
 * floor texture, and hands back groups, bounds and anchors. Nothing here
 * decides how anything looks.
 *
 * THE LIGHT IS BAKED, so the only runtime light in the scene is the cursor's.
 * Cycles found every bounce offline and it rides in the lightmaps, which means
 * no key, no fill, no ambient, no shadow map and no exposure: a lamp added
 * here would be a second sun the bake never saw. What is left for a lamp to do
 * is the one thing a bake cannot, which is follow the reader's hand.
 *
 * THE CAMERA HAS TWO MASTERS. The track places it along the flight, 0 at the
 * map and k at stop k, and it SETTLES there, so a wheel notch reads as travel.
 * A row aims it at that way's pose, and it GLIDES there, so a hover reads as a
 * decision. Whichever spoke last owns the camera, and a re-aim mid-move starts
 * from wherever the camera actually is, so a pointer sweeping down four rows
 * draws one continuous path rather than four cuts.
 *
 * marks() is the join with the DOM: it projects each way's anchor to a pixel
 * and the component moves a small HTML label there. Every word the reader sees
 * is DOM text. The only words inside the world are the two mock interfaces,
 * which are furniture rather than site copy and were drawn into their textures
 * offline.
 *
 * This file owns three.js and nothing else. The choreography it runs lives in
 * journey.ts, spline.ts and camera.ts, none of which schedules a frame, which
 * is why the unit suite can hold the framing and the flight with no GPU.
 */
import {
  Color,
  Fog,
  NoToneMapping,
  PerspectiveCamera,
  PointLight,
  Ray,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

import { ENVIRONMENT_INTENSITY, RETINA, loadScene } from './assets';
import { applyPose, projectTo, stateOf } from './camera';
import {
  GLIDE_MS,
  LIGHT_FADE_MS,
  SCROLL_TAU_MS,
  copyState,
  glideAt,
  isSettled,
  offsetPosition,
  parallaxOf,
  settle,
  settleState,
  stateSettled,
} from './journey';
import { PALETTE } from './palette';
import { floorPoint, hitBox, hitOf, rayThrough } from './pointer';
import { createPost } from './post';
import { createRegistry } from './registry';
import { POSES, SCENE_ORDER } from './scene-manifest';
import { buildFlight } from './spline';
import { bakeStudio } from './studio';
import { nearestStop } from './track';
import type { BootOptions, CameraState, Handle, Mark } from './types';

// The two the component needs, re-exported so everything above this seam takes
// the scene and the shape of its handle from one module and never reaches past
// it into the three.js side of the section.
export type { BootOptions, Handle } from './types';

/**
 * The cursor light: a dim cool pool that follows the hand across the floor.
 *
 * Its job is the reveal. At the map a pointer sweeping the letter lifts each
 * stroke out of the dark as it passes, which gives the establishing shot
 * something to do with a hand on it. Dim on purpose: the bake carries the
 * scene, and this adds a pool a reader notices only because it follows them.
 * lightFill rather than the accent, because a viridian pool reads as a game.
 *
 * It is the one lamp in the scene, and the only surface it can reach is the
 * floor: every body's diffuse channel is lit by its lightmap and the floor's
 * bake rides in the emissive channel instead, precisely so its diffuse is left
 * dark and empty for this to arrive on (see assets.ts).
 */
const CURSOR_LIGHT = 10;
const CURSOR_LIGHT_DISTANCE = 9;
const CURSOR_LIGHT_HEIGHT = 1.4;
/** Further than this from the camera, a floor point is distance and the light stays put. */
const CURSOR_LIGHT_REACH = 60;

/**
 * Where the distance fade starts and how long it takes, in world units.
 *
 * The plan said no fog, on the grounds that the floor's own alphaMap already
 * fades it to the background. That line is superseded by a ruling recorded in
 * the ledger on 2 September, and the reason is that the two fades are about
 * different things. crossroads.py fades every still through the compositor's
 * mist, which starts 6 units past what the shot is focused on and is complete
 * 20 units later; the alphaMap ends the PLANE, 34 to 48 units from the hub.
 * The first says how far you can see and the second says where the floor
 * stops. A linear Fog in the background colour, near at the camera's distance
 * to its look point plus MIST_START and far MIST_DEPTH beyond it, is the
 * render's own fade drawn per fragment, and it is what tools/blender/viewer
 * already shows beside the Cycles frames.
 *
 * What it is worth was measured for the viewer and is small, because the two
 * overlap: over a grid of the frame with the fade pushed out to a million
 * units and back, the most it moves anything is 3 points of luminance, on the
 * map's floor around the hub, 96 without it and 94 with it. It is kept for the
 * transits, which are the frames the stills never showed: the camera crosses
 * the middle of the letter at six units up with the far arm 40 units out, and
 * that is where a floor with no distance in it looks like a printed sheet.
 */
const MIST_START = 6;
const MIST_DEPTH = 20;

/**
 * How much of the canvas the copy panel is standing on, in CSS pixels.
 *
 * The scene is full bleed: the canvas is the whole stage and the copy sits on
 * a glass panel over the left of it. So the subject cannot be centred in the
 * canvas, it has to be centred in what is LEFT of the canvas, and the camera
 * has to be told which part that is. camera.ts does both halves of that with
 * this number: the field of view is computed against the free region's aspect,
 * and the projection is then shifted by half the reserve.
 *
 * Capped at 60% of the canvas, which is not a layout this site produces and is
 * the difference between a bad frame and a division that hands the camera a
 * field of view of zero.
 */
function reserveOf(host: HTMLElement, panel: HTMLElement | null): number {
  if (!panel) return 0;
  const stage = host.getBoundingClientRect();
  const box = panel.getBoundingClientRect();
  if (box.width === 0 || stage.width === 0) return 0;
  return Math.max(0, Math.min(stage.width * 0.6, box.right - stage.left));
}

export async function boot(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: BootOptions,
): Promise<Handle> {
  const { panel, ways, labels, background, reduced, url, onFrame } = options;

  // The letter is laid out for exactly four, and each stand's standoff, aim
  // height and lens were solved in Blender against one particular body. If the
  // caller hands the ways in another order the two silently disagree: every
  // body appears, framed from another body's distance, with nothing to notice
  // and nothing in a stack trace. boot() takes the ways the component sorted,
  // so this is where that trust is checked, loudly, before a frame is drawn.
  if (ways.length !== SCENE_ORDER.length) {
    throw new Error(
      `crossroads: the floor is laid out for ${SCENE_ORDER.length} ways but ${ways.length} were given`,
    );
  }
  for (let i = 0; i < SCENE_ORDER.length; i += 1) {
    const want = SCENE_ORDER[i];
    const got = ways[i];
    if (got === undefined || got.key !== want) {
      throw new Error(
        `crossroads: stop ${i} is the ${want} stroke but was given ${got?.key ?? 'nothing'}. The ways must arrive in the order SCENE_ORDER lays out.`,
      );
    }
  }

  const reg = createRegistry();
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  /**
   * The pixel ratio, capped at RETINA, which is 1.5.
   *
   * Everything the composer does after the scene is a full-resolution pass
   * over the frame, and the depth of field is the expensive one. At 1440x900
   * that is 1.30 megapixels a pass at a ratio of 1, 2.92 at 1.5 and 5.18 at 2,
   * so the cap is the difference between one frame and four. Task 6 holds the
   * frame rate this machine actually reaches.
   *
   * It is the same number assets.ts switches textures on, and deliberately so:
   * above it the 2x lightmaps are fetched, below it the 1x, and a renderer
   * drawing at a ratio the textures were not chosen for would spend the bytes
   * or the pixels of one screen and show the other.
   */
  renderer.setPixelRatio(Math.min(RETINA, window.devicePixelRatio || 1));
  /**
   * No tone mapping, and no shadow map either.
   *
   * The look of this scene was decided in Cycles and baked through Blender's
   * Standard view transform, which is the sRGB transfer function and no more,
   * so a filmic curve here would be the picture graded twice. post.ts sets
   * this again on the renderer it is handed, because the OutputPass is what
   * actually applies it once rendering goes through a target; it is set here
   * as well so a frame drawn before the composer exists is the same frame.
   *
   * The shadows are in the lightmaps. Nothing in the scene casts, because the
   * one lamp is the cursor's pool on the floor and a real-time shadow under a
   * baked one would be the same shadow twice, at two softnesses.
   */
  renderer.toneMapping = NoToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  const scene = new Scene();
  /**
   * The ink the world stands in, as one Color the background and the fade
   * share.
   *
   * The scene is full bleed and the ink hero sits directly on top of it, so
   * the section's background and the canvas are one surface as far as a reader
   * is concerned. The component hands over whatever that section computes to
   * and setBackground() follows a theme switch. Fog's constructor copies the
   * colour it is given, so the copy is thrown away and this one put back in
   * its place: a theme that repaints the background repaints the fade with it
   * and the two can never disagree.
   */
  const ink = new Color(background);
  scene.background = ink;
  const fog = new Fog(ink, 1, 2);
  fog.color = ink;
  scene.fog = fog;

  // The room the metals reflect, baked once and tracked so stop() frees it.
  scene.environment = reg.track(bakeStudio(renderer));
  /**
   * And what it is worth, which today reaches nothing and is set anyway.
   *
   * WebGLRenderer applies scene.environmentIntensity only to a material whose
   * own envMap is null (WebGLRenderer.js line 2694 in r185), and assets.ts
   * gives every body the environment as its own envMap at this same intensity.
   * So this line is the floor's and any future body's: without it a material
   * that arrives without an envMap would take the studio at full strength on
   * top of a bake that already holds every bounce, and flatten it. The viewer
   * sets the same two lines, which is what makes its frames comparable with
   * the ones this file draws.
   */
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;

  const loaded = await loadScene({
    dpr: renderer.getPixelRatio(),
    labels,
    url,
    environment: scene.environment,
  });
  scene.add(loaded.floor);
  for (const way of loaded.ways) scene.add(way.group);

  // The 50 and the 2 are placeholders. Every field of view in this scene is
  // computed in apply() from the pose's half-angles and the aspect of the free
  // region, and apply() runs before the first frame. The far plane at 400
  // holds the whole floor from every pose: the map stands at (14, 32, 30), 44.6
  // units off its own look point, and the furthest corner of the 100 by 100
  // plane is 107.3 units from it.
  const camera = new PerspectiveCamera(50, 2, 0.1, 400);

  // Every frame goes through this rather than renderer.render(). It is sized
  // in resize() and freed in stop() through the registry.
  const post = reg.track(createPost(renderer, scene, camera));

  const cursor = new PointLight(PALETTE.lightFill, 0, CURSOR_LIGHT_DISTANCE, 2);
  cursor.position.y = CURSOR_LIGHT_HEIGHT;
  scene.add(cursor);

  /**
   * The two things the camera can be asked for: a position along the flight,
   * and a stand.
   *
   * Both are built once. The flight is the spline through the map, the hub and
   * the four stands, and the stands are the same poses as CameraStates the
   * blend can be run against without allocating one per frame.
   */
  const flight = buildFlight(
    POSES.junction,
    POSES.hub,
    SCENE_ORDER.map((key) => POSES[key]),
  );
  const stands = SCENE_ORDER.map((key) => stateOf(POSES[key]));

  /**
   * The canvas, in CSS pixels, and how much of its left edge the copy panel is
   * standing on. Read by apply() on every frame and by marks() straight after,
   * so both work from one measurement rather than two.
   */
  let viewW = 0;
  let viewH = 0;
  let reserved = 0;
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
  let drawn = 0;
  /** What the last advance() said: whether anything is still moving. */
  let moving = true;

  /**
   * The journey. `current` is where the camera is this frame, `goal` where
   * whichever master owns it wants it, and `from` the end a glide left.
   * Re-aiming mid-glide copies `current` into `from` and restarts the clock.
   * All three are allocated here and rewritten in place: this runs every
   * frame, and a CameraState a frame is the kind of garbage that turns a
   * parked loop into a busy one.
   */
  const current = stateOf(POSES.junction);
  const goal = stateOf(POSES.junction);
  const from = stateOf(POSES.junction);
  let tNow = 0;
  let aimed = -1;
  let gliding = false;
  let startedAt = -Infinity;
  let lastAdvance = -Infinity;
  let revealed = false;

  /**
   * The hand. The parallax is an offset the camera carries on top of `current`
   * in its own screen plane, so a glide is unchanged by it and a re-aim still
   * starts from where the camera is. Both it and the light ease towards their
   * targets on the loop's own clock and report themselves from advance() until
   * they have settled, which is what lets the loop park with a hand resting on
   * the stage.
   */
  const hits = loaded.ways.map((way) => hitBox(way.box));
  const pointerRay = new Ray();
  const floorHit = new Vector3();
  const parallaxTarget: [number, number] = [0, 0];
  const parallax: [number, number] = [0, 0];
  const lightTarget = new Vector3(0, CURSOR_LIGHT_HEIGHT, 0);
  const lightAt = new Vector3(0, CURSOR_LIGHT_HEIGHT, 0);
  let lightOn = 0;
  let light = 0;

  /**
   * The camera's position with the hand added, and the pose applyPose is
   * handed. `posed.pos` IS `eye`, deliberately: offsetPosition writes the
   * moved position straight into the pose the camera is then set from, so a
   * frame costs no Vector3 and there is no second copy to forget.
   */
  const eye = new Vector3();
  const posed: CameraState = {
    pos: eye,
    look: new Vector3(),
    fitH: 0,
    fitV: 0,
    fstop: 1,
  };

  /**
   * Where the camera belongs right now, into `out`: the row's stand if a row
   * owns it, otherwise the track's own position on the flight.
   *
   * Reduced motion rounds t to the nearest stop, so the camera stands only at
   * the map and the four stands and cuts between them. The flight is still
   * what places it: one list of poses, whether or not the reader wants to be
   * flown between them.
   */
  function goalNow(out: CameraState): CameraState {
    const stand = aimed >= 0 ? stands[aimed] : undefined;
    if (stand !== undefined) return copyState(stand, out);
    return flight.at(reduced ? nearestStop(tNow) : tNow, out);
  }

  /**
   * Puts the camera, the lens, the plane of focus, the distance fade and the
   * one lamp where `state` says. Everything except the draw call, run once per
   * frame from advance().
   */
  function apply(state: CameraState, dx: number, dy: number): void {
    // The eye is the pose moved by the hand; the look point is the pose's own.
    // The hand moves the camera, not what it is looking at, which is what
    // makes the subject hold still and everything at another depth swing.
    offsetPosition(state.pos, state.look, dx, dy, eye);
    posed.look.copy(state.look);
    posed.fitH = state.fitH;
    posed.fitV = state.fitV;
    posed.fstop = state.fstop;
    applyPose(camera, posed, viewW, viewH, reserved);

    const distance = eye.distanceTo(state.look);
    post.setFocus(distance, state.fstop);
    fog.near = distance + MIST_START;
    fog.far = fog.near + MIST_DEPTH;

    // No lights to move: the light is in the textures. This one is the hand's.
    cursor.position.copy(lightAt);
    cursor.intensity = CURSOR_LIGHT * light;
  }

  /**
   * Moves everything to where it is at `now`, and says whether anything is
   * still moving. The eases are read off journey.ts and the path off
   * spline.ts, so this function owns no numbers of its own.
   */
  function advance(now: number): boolean {
    // Clamped, so a loop that parked for a minute and wakes on a pointer does
    // not take one hundred-millisecond step and land the camera in a jump.
    const dt = lastAdvance === -Infinity ? 0 : Math.min(100, now - lastAdvance);
    lastAdvance = now;

    // The hand, as August: parallax and the light settle towards their
    // targets. In reduced motion both targets are held at rest by pointer(),
    // so these are no-ops rather than a second code path.
    parallax[0] = settle(parallax[0], parallaxTarget[0], dt);
    parallax[1] = settle(parallax[1], parallaxTarget[1], dt);
    lightAt.x = settle(lightAt.x, lightTarget.x, dt);
    lightAt.z = settle(lightAt.z, lightTarget.z, dt);
    light = settle(light, lightOn, dt, LIGHT_FADE_MS);
    const hand =
      !isSettled(parallax[0], parallaxTarget[0]) ||
      !isSettled(parallax[1], parallaxTarget[1]) ||
      !isSettled(lightAt.x, lightTarget.x) ||
      !isSettled(lightAt.z, lightTarget.z) ||
      !isSettled(light, lightOn);

    goalNow(goal);
    if (gliding) {
      // A glide of no duration is a cut, which is what reduced motion asks
      // for: glideAt lands on `goal` at once and reports itself done.
      const done = glideAt(from, goal, startedAt, now, current, reduced ? 0 : GLIDE_MS);
      if (done) gliding = false;
    } else if (reduced) {
      copyState(goal, current);
    } else {
      settleState(current, goal, dt, SCROLL_TAU_MS);
      // An exponential ease never arrives, so the last thousandth is taken in
      // one step. Without it the loop would never park while the reader rests
      // between two stops.
      if (stateSettled(current, goal)) copyState(goal, current);
    }
    apply(current, parallax[0], parallax[1]);
    return gliding || !stateSettled(current, goal) || hand;
  }

  /**
   * Where each way's name belongs on screen, in CSS pixels inside the view.
   *
   * The whole of „text integrated into the model", and it is four projections
   * a frame rather than a second renderer. Type in the DOM is indexable,
   * selectable, localised through the same content files, carries its own
   * contrast and can be read aloud. What it cannot do is be occluded by
   * geometry, and nothing in this scene ever stands between the camera and a
   * point above another body.
   *
   * Position and nothing else. Whether a label FITS where it lands is
   * marks.ts's question, because it is a question about a box of text.
   *
   * The array is allocated once and rewritten in place, for the same reason
   * the camera states are.
   */
  const marked: Mark[] = loaded.ways.map(() => ({ x: 0, y: 0, front: false }));

  function marks(): readonly Mark[] {
    for (let i = 0; i < loaded.ways.length; i += 1) {
      const way = loaded.ways[i];
      const out = marked[i];
      if (way === undefined || out === undefined) continue;
      projectTo(camera, way.anchor, viewW, viewH, out);
    }
    return marked;
  }

  /**
   * Asks for one frame, and parks afterwards unless frame() asks again.
   *
   * Every change to the scene arrives through aim(), scroll(), reveal(),
   * pointer() or resize(), and all of them come through here. One already
   * scheduled frame absorbs any number of further changes before it runs, so
   * a page with the section four viewports away costs no frames at all.
   */
  function invalidate(): void {
    if (!alive || raf !== 0) return;
    raf = requestAnimationFrame(frame);
  }

  function frame(now: number): void {
    raf = 0;
    // stop() cancels the pending callback, but a cancellation that lands in
    // the same frame the callback was already dispatched in would still draw
    // into a disposed renderer.
    if (!alive) return;
    moving = advance(now);
    post.render();
    drawn += 1;
    onFrame();
    // The loop runs exactly as long as something is moving and parks the
    // moment nothing is, which is most of the visit: resting between two stops
    // and between hovers the section costs no frames at all. The frame that
    // parks calls onFrame twice, which is what the handle promises. The
    // numbers are the same both times, and what the second buys is a notice a
    // listener can treat as the end of a move rather than as another frame of
    // one, without having to poll parked() on a timer to find out.
    if (moving) invalidate();
    else onFrame();
  }

  function resize(): void {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    viewW = w;
    viewH = h;
    reserved = reserveOf(host, panel);
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    // apply() computes the field of view from the new aspect and calls
    // updateProjectionMatrix through applyPose, so there is deliberately no
    // second call here: a resize that only set the aspect would leave the
    // camera holding the lens worked out for the previous shape of the canvas.
    apply(current, parallax[0], parallax[1]);
    invalidate();
  }

  // The camera boots where the track says it is, which with nothing aimed and
  // t at 0 is the map. Taken from the flight rather than assumed, so the pose
  // the first frame draws is the pose the track would settle it to.
  goalNow(current);
  resize();
  moving = advance(performance.now());
  invalidate();
  window.addEventListener('resize', resize, { passive: true });

  return {
    aim(way) {
      if (way === aimed) return;
      aimed = way;
      copyState(current, from);
      startedAt = performance.now();
      gliding = true;
      invalidate();
    },
    scroll(t) {
      const next = Math.min(flight.stops, Math.max(0, Number.isFinite(t) ? t : 0));
      if (next === tNow) return;
      tNow = next;
      invalidate();
    },
    reveal() {
      // The canvas's own opacity is the component's, through data-revealed.
      // What the scene owes a section that has just come into view is a frame,
      // because the loop may well have parked before anyone could see it.
      if (revealed) return;
      revealed = true;
      invalidate();
    },
    pointer(x, y) {
      if (viewW === 0 || viewH === 0) return -1;
      rayThrough(x, y, viewW, viewH, camera, pointerRay);
      const hit = hitOf(pointerRay, hits);
      // Reduced motion gets the hit and nothing else: the row still lights and
      // the camera still cuts to it, but the stage does not lean and no pool
      // of light follows the hand across the floor.
      if (reduced) return hit;
      // Normalised across the FREE region, which is the frame the reader is
      // looking at: across the whole canvas the panel's third would push every
      // reachable value to the right and the camera would never stand left.
      const free = Math.max(1, viewW - reserved);
      const [dx, dy] = parallaxOf(((x - reserved) / free) * 2 - 1, (y / viewH) * 2 - 1);
      parallaxTarget[0] = dx;
      parallaxTarget[1] = dy;
      if (
        floorPoint(pointerRay, floorHit) &&
        floorHit.distanceToSquared(camera.position) < CURSOR_LIGHT_REACH * CURSOR_LIGHT_REACH
      ) {
        lightTarget.set(floorHit.x, CURSOR_LIGHT_HEIGHT, floorHit.z);
      }
      lightOn = 1;
      invalidate();
      return hit;
    },
    pointerLeave() {
      parallaxTarget[0] = 0;
      parallaxTarget[1] = 0;
      lightOn = 0;
      invalidate();
    },
    marks,
    setBackground(css) {
      // One Color, mutated. scene.background and the fog hold the same object,
      // so this moves both, and the far floor cannot be left fading to the
      // previous theme's dark.
      ink.set(css);
      invalidate();
    },
    parked: () => raf === 0 && !moving,
    frames: () => drawn,
    stop() {
      // Works whether the loop is running or parked: raf is 0 when parked, and
      // clearing alive keeps invalidate() from restarting it if a late call
      // arrives after teardown.
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      moving = false;
      window.removeEventListener('resize', resize);
      // The registry holds the composer and the studio bake; the loaded place
      // owns its own registry, which is what its dispose() empties. three.js
      // frees nothing when a mesh leaves a scene and nothing when the renderer
      // is disposed either, so a component that unmounts on a route change
      // leaks an entire scene unless both of these run.
      reg.disposeAll();
      loaded.dispose();
      renderer.dispose();
    },
  };
}
