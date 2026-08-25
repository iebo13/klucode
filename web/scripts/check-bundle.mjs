/**
 * Two budgets.
 *
 * EAGER is what a visitor downloads before scrolling anywhere: every script
 * out/de/index.html references directly. three.js must never appear here. The
 * day a stray import drags it into the eager graph, this number jumps and the
 * build fails, which is the only reliable way to notice.
 *
 * DEFERRED is the crossroads chunk, fetched only when the scene mounts. It is
 * allowed to be large. It is not allowed to be unbounded, and what makes it
 * unbounded is one careless import pulling in a three.js loader or control.
 *
 * Those chunks are found by matching three.js itself, because comments do not
 * survive minification and file names are hashed. See THREE_MARKER below for
 * why the scene's own DOM marker is the wrong thing to match on.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASE = JSON.parse(readFileSync('scripts/bundle-baseline.json', 'utf8'));
const EAGER_SLACK = 2 * 1024;
const DEFERRED_CAP = 155 * 1024;

/**
 * What identifies a deferred chunk.
 *
 * NOT the scene's own `kc-crossroads` marker. That is a DOM attribute written
 * by index.tsx, which is a client component and therefore lives in the EAGER
 * page chunk. Matching on it measured 2 kB of component and reported it as the
 * deferred budget: a gate that could not fail, which is worse than no gate.
 *
 * three.js is what this budget exists to bound, so match three.js. The class
 * name survives minification as a `.type` string. Chunks the eager HTML already
 * references are excluded, because three.js appearing there is a First Load JS
 * leak and belongs to the other gate, not quietly counted here.
 */
const THREE_MARKER = 'BufferGeometry';

/**
 * What identifies the scene's OWN deferred chunk, as against three.js.
 *
 * Added because the deferred budget was measuring three.js and nothing else.
 * Next splits the crossroads modules into a chunk of their own, separate from
 * the two vendor chunks, and that chunk contains no three.js class name at all:
 * it imports them. So every line of scene.ts, objects.ts and textures.ts was
 * outside the budget that exists to bound them. Measured on
 * claude/crossroads-dead-ends, where it was found, the uncounted chunk was
 * 4.9 kB and the reported deferred total was 5.0 kB short of the truth.
 *
 * That is the same failure the note above THREE_MARKER records for the DOM
 * marker, in the other direction: a gate that measures the wrong thing reports
 * a number nobody should trust. The budget is what the scene costs, so it
 * counts what the scene ships.
 *
 * `lightAmbient` is a key on the PALETTE object in palette.ts. Property names
 * survive minification, this one exists nowhere else in the repo, and
 * palette.ts is imported by every module in the scene, so the chunk carrying
 * any of them carries this. An `expectSceneChunk` build that stops finding it
 * fails loudly rather than quietly measuring less.
 */
const SCENE_MARKER = 'lightAmbient';

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
const vendorChunks = deferredChunks.filter((p) => bodies.get(p)?.includes(THREE_MARKER));
const ownChunks = deferredChunks.filter(
  (p) => !vendorChunks.includes(p) && bodies.get(p)?.includes(SCENE_MARKER),
);
const sceneChunks = [...vendorChunks, ...ownChunks];
const deferred = sceneChunks.reduce((n, p) => n + gz(p), 0);

console.log(
  `eager    ${kb(eager)} over ${eagerPaths.length} scripts (baseline ${kb(BASE.eagerGzipBytes)})`,
);
console.log(
  `deferred ${kb(deferred)} over ${sceneChunks.length} chunks (cap ${kb(DEFERRED_CAP)}), ` +
    `of which ${kb(ownChunks.reduce((n, p) => n + gz(p), 0))} is the scene's own code`,
);

let failed = false;

if (eager > BASE.eagerGzipBytes + EAGER_SLACK) {
  console.error(
    `::error::eager JS is ${kb(eager)}, baseline ${kb(BASE.eagerGzipBytes)} plus ${kb(EAGER_SLACK)} slack. ` +
      'If this is deliberate, move scripts/bundle-baseline.json and say why in the commit message.',
  );
  failed = true;
}

if (BASE.expectSceneChunk && vendorChunks.length === 0) {
  console.error(
    `::error::no deferred chunk contains "${THREE_MARKER}", so the deferred budget measured nothing. ` +
      'Either three.js stopped emitting that name, or it is no longer being code split.',
  );
  failed = true;
}

if (BASE.expectSceneChunk && ownChunks.length === 0) {
  console.error(
    `::error::no deferred chunk contains "${SCENE_MARKER}", so the budget is measuring three.js and ` +
      "not the scene built on it. Either palette.ts stopped carrying that key, or the scene's own " +
      'modules have been folded into a chunk this script already counts as eager.',
  );
  failed = true;
}

if (deferred > DEFERRED_CAP) {
  console.error(`::error::the crossroads chunk is ${kb(deferred)}, cap is ${kb(DEFERRED_CAP)}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
