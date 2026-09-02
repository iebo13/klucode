/**
 * Four budgets, because the crossroads costs four different things and only
 * one of them is a number anybody would notice on their own.
 *
 * EAGER is what a visitor downloads before scrolling anywhere: every script
 * out/de/index.html references directly. three.js must never appear in it. The
 * day a stray import drags the renderer into the eager graph this number jumps
 * and the build fails, which is the only reliable way to notice.
 *
 * DEFERRED is the scene: three.js, its addons and the crossroads modules built
 * on them, fetched only where the live world mounts. It is allowed to be
 * large. It is not allowed to be unbounded, and what makes it unbounded is one
 * careless import pulling in a loader, a control or a second post pass.
 *
 * ASSETS is the place itself: four glTF bodies, a lightmap each and one floor
 * texture, at 1x. Bytes on disk rather than gzipped, because they are already
 * compressed formats and a second pass buys nothing.
 *
 * STILLS is the fallback and the poster, which no other budget here would ever
 * see move.
 *
 * The chunks are found by matching strings that survive minification, because
 * comments do not and file names are hashed. Every marker below carries the
 * reason it was chosen and, where there is one, the leak it was added after.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASE = JSON.parse(readFileSync('scripts/bundle-baseline.json', 'utf8'));
const EAGER_SLACK = 2 * 1024;

/**
 * What the scene's JavaScript may weigh, gzipped, all of it together.
 *
 * 260 kB, from section 7 of the design spec. It is a ceiling and not a target:
 * the August scene lived under 170 with geometry it built itself, and this one
 * loads its geometry instead but brings GLTFLoader, the meshopt decoder and a
 * second post pass (the depth of field) to do it. The line this script prints
 * is the measurement; move the cap only with a reason in the commit.
 */
const DEFERRED_CAP = 260 * 1024;

/**
 * What the place may weigh at 1x: the four bodies, their lightmaps and the
 * floor, as a visitor on an ordinary screen fetches them.
 *
 * 1.5 MB, from section 7 of the design spec. 1x only, because the 2x textures
 * are the retina reader's extra and assets.ts picks between the two by device
 * pixel ratio: counting both would bill every visitor for a set no visitor
 * ever fetches. The models have no 2x, so they are in this number either way.
 *
 * Measured at this commit: the line below prints it, and scene-manifest.ts
 * carries the same total as BYTES_1X, written by the emitter from the same
 * files.
 */
const ASSETS_CAP = 1.5 * 1024 * 1024;

/**
 * What the five stills and the two poster crops may weigh, all twelve files
 * together, on disk.
 *
 * Measured 2 September 2026 after the K re-render (the floor plan is the
 * mark's own graph now, and the wide poster is the whole 1600x1000 frame
 * rather than a band across it, because the four objects stand at the four
 * ends of the letter): 753.3 kB over the twelve files, of which a visitor
 * loads at most five, 216.9 kB at 1x or 454.2 kB at 2x. It was 710.5 kB on
 * the fan, and the 43 kB is almost all the wide poster growing from 516 to
 * 1000 rows. So the cap is that plus 46.7 kB of room, one more still's worth
 * at 1x, on the same reasoning as before.
 *
 * Re-measure it after a re-render rather than raising it by reflex, and move
 * section 3.6 of the stills design spec with it.
 */
const STILLS_CAP = 800 * 1024;

/**
 * What identifies three.js itself.
 *
 * NOT the scene's own `kc-crossroads` marker. That is a DOM attribute written
 * by live-world.tsx, which is a client component and therefore lives in the
 * EAGER page chunk. Matching on it once measured 2 kB of component and
 * reported it as the deferred budget: a gate that could not fail, which is
 * worse than no gate.
 *
 * The class name survives minification as a `.type` string property, and
 * nothing in this codebase has any reason to define a class called
 * BufferGeometry. In a deferred chunk it is the renderer, counted. In an eager
 * one it is a First Load JS leak, which belongs to the other budget and is
 * refused there rather than quietly added up here.
 */
const THREE_MARKER = 'BufferGeometry';

/**
 * What identifies the scene's OWN deferred chunk, as against three.js.
 *
 * Added on the August branch because the deferred budget was measuring
 * three.js and nothing else. Next splits the crossroads modules into a chunk
 * of their own, separate from the vendor chunks, and that chunk contains no
 * three.js class name at all: it imports them. So every line of scene.ts,
 * assets.ts and textures.ts was outside the budget that exists to bound them.
 * Measured where it was found, the uncounted chunk was 4.9 kB and the reported
 * deferred total was 5.0 kB short of the truth.
 *
 * `lightScale` is a property name on every entry of WAYS in scene-manifest.ts,
 * which is generated by the bake's emitter and imported by assets.ts and
 * scene.ts and by nothing else in the repo. Property names survive
 * minification, so the chunk carrying the scene's modules carries this. It
 * replaced August's `lightAmbient`, a key on PALETTE, because palette.ts is
 * now read by the Blender pipeline as well and a key that could be pulled
 * eager by some future non-scene import would make this marker lie.
 */
const OWN_MARKER = 'lightScale';

/**
 * What identifies the addon chunk, as against three.js and the scene's own
 * code.
 *
 * Every three.js addon this scene imports (EffectComposer, RenderPass,
 * UnrealBloomPass, BokehPass and OutputPass from post.ts, GLTFLoader and the
 * meshopt decoder from assets.ts) lands in a webpack chunk of its own, because
 * addons come from `three/examples/jsm` rather than three's own entry point.
 * That chunk never touches the manifest, so it never contains "lightScale",
 * and on the August branch it contained no three.js class name either: neither
 * other marker saw it, and the 5.2 kB it weighed was entirely uncounted, which
 * is why these markers exist.
 *
 * It does contain "BufferGeometry" here, measured at this commit on the 25.6 kB
 * chunk that holds all seven addons above: FullScreenQuad and the bloom's own
 * geometry put the name in it. So these markers are claimed BEFORE
 * THREE_MARKER (see the classification below) and are not an alarm of their
 * own: which chunk an addon lands in is webpack's business, and the budget's
 * business is that all of it is added up exactly once.
 *
 * Four markers, because no single addon is guaranteed to survive whatever the
 * scene imports next, and each survives minification for its own reason.
 * `LuminosityHighPassShader` and `BokehShader` are shader objects' `name`
 * fields, so the bloom and the depth of field are each found on their own.
 * `KHR_draco_mesh_compression` is an extension name GLTFLoader carries as a
 * string whether or not anything uses it. `decodeGltfBuffer` is a method the
 * meshopt decoder exposes on the object it exports, and property names survive
 * minification.
 */
const ADDON_MARKERS = [
  'LuminosityHighPassShader',
  'BokehShader',
  'KHR_draco_mesh_compression',
  'decodeGltfBuffer',
];

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const gz = (path) => gzipSync(readFileSync(path)).length;

const html = readFileSync('out/de/index.html', 'utf8');

/**
 * Turns a script href into the file it was written from.
 *
 * Two things get in the way. The href is URL-encoded, and this site routes
 * through src/app/[lang], so that chunk arrives as %5Blang%5D while the file on
 * disk keeps its literal brackets. And a base-path build writes hrefs like
 * /basepath-check/_next/static/... while the files stay at out/_next/static/...
 * because a basePath is a serving prefix, not a directory. The deploy workflow
 * only ever builds with one, so a script that assumed a domain root failed
 * every deploy rather than catching anything.
 *
 * Taking the path from `_next/` onwards handles both shapes.
 */
const toPath = (href) => {
  const decoded = decodeURIComponent(href);
  const marker = decoded.indexOf('_next/');
  return join('out', marker === -1 ? decoded.replace(/^\/+/, '') : decoded.slice(marker));
};

const eagerPaths = [...new Set([...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]))].map(
  toPath,
);

if (eagerPaths.length === 0) {
  console.error('::error::found no scripts in out/de/index.html, so the parser is wrong');
  process.exit(1);
}

// A script tag pointing at a file that is not there means the mapping above has
// drifted from what Next emits. Say so, rather than dying on an ENOENT stack
// trace that names neither the href nor the cause.
for (const path of eagerPaths) {
  if (!existsSync(path)) {
    console.error(
      `::error::out/de/index.html references ${path}, which does not exist. The href to path mapping in this script is wrong.`,
    );
    process.exit(1);
  }
}

const eager = eagerPaths.reduce((n, p) => n + gz(p), 0);
const eagerThree = eagerPaths.filter((p) => readFileSync(p, 'utf8').includes(THREE_MARKER));

const chunks = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) chunks.push(p);
  }
};
walk('out/_next/static/chunks');

const eagerSet = new Set(eagerPaths);
const deferredChunks = chunks.filter((p) => !eagerSet.has(p));
const bodies = new Map(deferredChunks.map((p) => [p, readFileSync(p, 'utf8')]));
const has = (p, marker) => bodies.get(p)?.includes(marker) ?? false;
const isOwn = (p) => has(p, OWN_MARKER);
const isAddon = (p) => ADDON_MARKERS.some((marker) => has(p, marker));
const isThree = (p) => has(p, THREE_MARKER);

/**
 * The three sets overlap, so the order they are claimed in is the whole of
 * what the printed split means.
 *
 * Narrowest first. `lightScale` is written by one generated module and read by
 * two, so a chunk carrying it is the scene's own. The addon markers are next,
 * because an addon chunk carries three.js class names as well: measured at
 * this commit, the 25.6 kB chunk holding EffectComposer, UnrealBloomPass,
 * BokehPass, GLTFLoader and the meshopt decoder also contains the string
 * "BufferGeometry", so claiming three.js first reported the addons as vendor
 * code and then failed a build for finding no addon chunk. Three.js itself is
 * last and takes what is left.
 *
 * The total is the same whichever order they are claimed in, because every
 * chunk is counted exactly once. What changes is which of the three numbers a
 * reader is told the addons cost.
 */
const ownChunks = deferredChunks.filter(isOwn);
const addonChunks = deferredChunks.filter((p) => !isOwn(p) && isAddon(p));
const vendorChunks = deferredChunks.filter((p) => !isOwn(p) && !isAddon(p) && isThree(p));
const sceneChunks = [...vendorChunks, ...ownChunks, ...addonChunks];
const deferred = sceneChunks.reduce((n, p) => n + gz(p), 0);

/**
 * The place on disk, read out of the manifest rather than off the directory.
 *
 * The manifest is what the runtime fetches from, so it is what the budget has
 * to be taken over: a file in public/crossroads/scene that no entry names is a
 * leftover from a previous bake and costs a visitor nothing, and an entry that
 * names a file which is not there is a scene that will not boot. The second is
 * a build failure here rather than a 404 in somebody's browser.
 */
const manifest = readFileSync('src/components/crossroads/scene-manifest.ts', 'utf8');
const assetPaths = [
  ...new Set([...manifest.matchAll(/'(\/crossroads\/scene\/[^']+)'/g)].map((m) => m[1])),
];
const missing = assetPaths.filter((p) => !existsSync(join('public', p)));
// The 1x set: everything the manifest names except the retina textures, which
// assets.ts fetches instead of, never as well as, the ones counted here.
const oneX = assetPaths.filter((p) => !p.includes('@2x'));
const assetBytes = missing.length
  ? 0
  : oneX.reduce((n, p) => n + statSync(join('public', p)).size, 0);

// The stills' own weight, held to STILLS_CAP above: WebP with alpha, lazily
// loaded, never part of the eager script budget, which is why they get a
// budget of their own rather than sharing that one. readdirSync does not
// recurse, so the scene's textures under crossroads/scene are the assets
// budget's and are not counted twice here.
const crossroadsDir = 'public/crossroads';
const stillFiles = existsSync(crossroadsDir)
  ? readdirSync(crossroadsDir)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => join(crossroadsDir, f))
  : [];
const posterFiles = ['public/crossroads.webp', 'public/crossroads-phone.webp'].filter(existsSync);
const stillBytes = [...stillFiles, ...posterFiles].reduce((n, p) => n + statSync(p).size, 0);

console.log(
  `eager    ${kb(eager)} over ${eagerPaths.length} scripts (baseline ${kb(BASE.eagerGzipBytes)})`,
);
console.log(
  `deferred ${kb(deferred)} over ${sceneChunks.length} chunks (cap ${kb(DEFERRED_CAP)}), ` +
    `of which ${kb(ownChunks.reduce((n, p) => n + gz(p), 0))} is the scene's own code and ` +
    `${kb(addonChunks.reduce((n, p) => n + gz(p), 0))} is addon code`,
);
console.log(
  `assets   ${kb(assetBytes)} at 1x over ${oneX.length} files (cap ${kb(ASSETS_CAP)}), ` +
    `${assetPaths.length} named by the manifest in all`,
);
console.log(
  `stills   ${kb(stillBytes)} over ${stillFiles.length + posterFiles.length} files ` +
    `(${stillFiles.length} stills, ${posterFiles.length} posters, cap ${kb(STILLS_CAP)})`,
);

let failed = false;

if (eager > BASE.eagerGzipBytes + EAGER_SLACK) {
  console.error(
    `::error::eager JS is ${kb(eager)}, baseline ${kb(BASE.eagerGzipBytes)} plus ${kb(EAGER_SLACK)} slack. ` +
      'If this is deliberate, move scripts/bundle-baseline.json and say why in the commit message.',
  );
  failed = true;
}

if (eagerThree.length > 0) {
  console.error(
    `::error::${eagerThree.length} of the scripts out/de/index.html references contain ` +
      `"${THREE_MARKER}": ${eagerThree.join(', ')}. three.js belongs on the deferred chunk the ` +
      'live world fetches when it mounts, and in an eager script it is First Load JS for every ' +
      'phone that never mounts one (spec section 7).',
  );
  failed = true;
}

/**
 * Two alarms and not three.
 *
 * three.js and the scene's own code each get one, because either of them
 * missing means the budget is measuring the wrong thing: a build with no
 * vendor chunk is measuring nothing at all, and one with no own chunk is
 * measuring three.js and not the scene built on it. Both are asked of the
 * whole deferred set rather than of the sets above, because the classification
 * is about which number to print and this is about whether there is a number.
 *
 * The addons get none, and that is the difference from the August gate. Their
 * markers are a classifier here, not an alarm: they land in whatever chunk
 * webpack puts them in, which at this commit is one that carries three.js's
 * own class names too, so "no chunk matched an addon marker" says something
 * about webpack's splitting and nothing about what shipped.
 */
if (BASE.expectSceneChunk && !deferredChunks.some(isThree)) {
  console.error(
    `::error::no deferred chunk contains "${THREE_MARKER}", so the deferred budget measured nothing. ` +
      'Either three.js stopped emitting that name, or it is no longer being code split.',
  );
  failed = true;
}

if (BASE.expectSceneChunk && !deferredChunks.some(isOwn)) {
  console.error(
    `::error::no deferred chunk contains "${OWN_MARKER}", so the budget is measuring three.js and ` +
      "not the scene built on it. Either scene-manifest.ts stopped carrying that key, or the scene's " +
      'own modules have been folded into a chunk this script already counts as eager.',
  );
  failed = true;
}

if (deferred > DEFERRED_CAP) {
  console.error(`::error::the crossroads chunk is ${kb(deferred)}, cap is ${kb(DEFERRED_CAP)}`);
  failed = true;
}

if (missing.length > 0) {
  console.error(
    `::error::scene-manifest.ts names ${missing.length} file(s) that are not under public/: ` +
      `${missing.join(', ')}. Re-run the bake's emitter, or the live world will 404 and drop to ` +
      'the stills for everybody.',
  );
  failed = true;
}

if (assetBytes > ASSETS_CAP) {
  console.error(
    `::error::the scene's 1x assets are ${kb(assetBytes)} over ${oneX.length} files, past the ` +
      `${kb(ASSETS_CAP)} cap. Decimate a model further, encode a lightmap smaller, or, if the ` +
      'weight is deliberate, move ASSETS_CAP in this script and section 7 of the design spec ' +
      'together and say why in the commit.',
  );
  failed = true;
}

if (stillBytes > STILLS_CAP) {
  console.error(
    `::error::the crossroads pictures are ${kb(stillBytes)} over ` +
      `${stillFiles.length + posterFiles.length} files, past the ${kb(STILLS_CAP)} cap. ` +
      'Render or encode them smaller, or, if the weight is deliberate, move STILLS_CAP in ' +
      'this script and section 3.6 of the stills design spec together and say why in the commit.',
  );
  failed = true;
}

process.exit(failed ? 1 : 0);
