/**
 * The viewer's page.
 *
 * One renderer, one scene, the six poses of the manifest, and the Cycles
 * render of whichever pose is showing underneath the canvas. Nothing here is
 * the site: the page's own scene arrives in a later task, and this exists to
 * answer one question, which is whether the baked place lit in a browser
 * looks like the place Cycles rendered.
 */
import { Color, Fog, NoToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

import { ENVIRONMENT_INTENSITY, loadScene } from './_build/assets.js';
import { applyPose, stateOf } from './_build/camera.js';
import { LABELS } from './_build/labels.js';
import { createPost } from './_build/post.js';
import { PALETTE } from './_build/palette.js';
import { POSES } from './_build/scene-manifest.js';
import { bakeStudio } from './_build/studio.js';

/** The full frame crossroads.py renders, and the panel's reserve inside it. */
const W = 1440;
const H = 998;
const RESERVE = 632;

/**
 * Where the distance fade starts and how long it takes, in world units.
 *
 * The same two numbers crossroads.py gives the compositor's mist: start at the
 * shot's own focus distance plus 6, gone 20 further on. They are written here
 * rather than in the manifest because they are a property of the look and not
 * of the bake.
 */
const MIST_START = 6;
const MIST_DEPTH = 20;

const canvas = document.getElementById('view');
const cycles = document.getElementById('cycles');
const chooser = document.getElementById('pose');

const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = NoToneMapping;

const scene = new Scene();
const ink = new Color(PALETTE.background);
scene.background = ink;

/**
 * The distance fade, as the render composites it.
 *
 * crossroads.py fades a still through the compositor's mist, which starts 6
 * units past what the shot is focused on and is complete 20 units later,
 * taking the colour and the alpha with it so the far floor ends in the
 * section's own ink. A linear fog in that same ink is the same fade drawn per
 * fragment instead of per composite, and it is what scene.ts sets per frame in
 * Task 4: near is the camera's distance to its look point plus MIST_START, far
 * is MIST_DEPTH beyond that.
 *
 * The floor's radial alphaMap stays exactly as it is. That is the floor's own
 * edge, 34 to 48 units from the hub, and this is distance from the eye: the
 * first says where the plane stops, the second says how far you can see. The
 * two overlap, which is why this fade is a small correction rather than a big
 * one. Measured over a grid of the frame with the fade pushed out to a million
 * units and then back: the most it moves anything is 3 points of luminance,
 * on the map's floor around the hub, which is 96 without it and 94 with it.
 * Past the alpha edge the floor is already the ink and there is nothing left
 * for it to take.
 *
 * Fog's constructor copies the colour it is given, so the copy is thrown away
 * and the background's own Color put back in its place: a theme that repaints
 * the background then repaints the fade with it and the two can never
 * disagree. Both material classes in this scene take fog by default, checked
 * in the browser rather than assumed: every screen and emitter material comes
 * back with fog true and so does the floor. Nothing that emits is dimmed at a
 * stand, also measured: the nearest lit thing stands 11.2 units off at
 * website, 11.9 at app, 10.0 at capacity and 9.9 at care, against a fade that
 * does not begin until 15.1, 17.4, 19.3 and 17.2, so the closest margin in the
 * four is 3.9 units.
 */
scene.fog = new Fog(ink, 1, 2);
scene.fog.color = ink;
const environment = bakeStudio(renderer);
scene.environment = environment;
scene.environmentIntensity = ENVIRONMENT_INTENSITY;

/**
 * The three faces the screens are drawn in, loaded before anything draws.
 *
 * A stylesheet only declares a face; the browser fetches it when something
 * asks to draw in it, and a canvas that asks first draws in the fallback and
 * never comes back. Every weight here is one textures.ts names.
 */
await document.fonts.ready;
await Promise.all(
  [
    '700 16px Archivo',
    '800 16px Archivo',
    '400 16px "IBM Plex Sans"',
    '500 16px "IBM Plex Sans"',
    '600 16px "IBM Plex Sans"',
    '400 16px "IBM Plex Mono"',
    '500 16px "IBM Plex Mono"',
  ].map((spec) => document.fonts.load(spec)),
);

const loaded = await loadScene({
  dpr: 1,
  labels: LABELS.de,
  url: (p) => `/public${p}`,
  environment,
});
scene.add(loaded.floor);
for (const way of loaded.ways) scene.add(way.group);

const camera = new PerspectiveCamera(50, W / H, 0.1, 400);
const post = createPost(renderer, scene, camera);
post.setSize(W, H);

function show(key) {
  const state = stateOf(POSES[key]);
  // The hub is a via point with no subject of its own, so the manifest gives
  // it the first way's look and the runtime replaces it per transit. The two
  // are the same point today, and this is where that stops being true.
  if (key === 'hub')
    state.look.set(POSES.website.look[0], POSES.website.look[1], POSES.website.look[2]);
  applyPose(camera, state, W, H, RESERVE);
  const distance = state.pos.distanceTo(state.look);
  scene.fog.near = distance + MIST_START;
  scene.fog.far = scene.fog.near + MIST_DEPTH;
  post.setFocus(distance, state.fstop);
  post.render();
  cycles.src = `/tools/blender/renders/review/${key}.png`;
  window.__frames = (window.__frames ?? 0) + 1;
}

/** Handles for a console and for shoot.mjs, which is the whole point of a viewer. */
window.__viewer = { renderer, scene, camera, post, loaded, show };

chooser.addEventListener('change', () => show(chooser.value));
const keys = ['junction', 'hub', 'website', 'app', 'capacity', 'care'];
window.addEventListener('keydown', (e) => {
  const i = '123456'.indexOf(e.key);
  if (i < 0) return;
  chooser.value = keys[i];
  show(keys[i]);
});

show(chooser.value);
