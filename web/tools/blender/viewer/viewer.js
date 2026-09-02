/**
 * The viewer's page.
 *
 * One renderer, one scene, the six poses of the manifest, and the Cycles
 * render of whichever pose is showing underneath the canvas. Nothing here is
 * the site: the page's own scene arrives in a later task, and this exists to
 * answer one question, which is whether the baked place lit in a browser
 * looks like the place Cycles rendered.
 */
import { Color, NoToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

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

const canvas = document.getElementById('view');
const cycles = document.getElementById('cycles');
const chooser = document.getElementById('pose');

const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = NoToneMapping;

const scene = new Scene();
scene.background = new Color(PALETTE.background);
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
  post.setFocus(state.pos.distanceTo(state.look), state.fstop);
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
