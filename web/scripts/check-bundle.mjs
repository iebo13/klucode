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

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const gz = (path) => gzipSync(readFileSync(path)).length;

const html = readFileSync('out/de/index.html', 'utf8');

// The href needs decoding before it is a path. This site routes through
// src/app/[lang], and Next writes that chunk's href URL-encoded as %5Blang%5D
// while the file on disk keeps the literal brackets.
const eagerPaths = [...new Set([...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]))].map(
  (u) => join('out', decodeURIComponent(u).replace(/^\/+/, '')),
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
const sceneChunks = chunks.filter(
  (p) => !eagerSet.has(p) && readFileSync(p, 'utf8').includes(THREE_MARKER),
);
const deferred = sceneChunks.reduce((n, p) => n + gz(p), 0);

console.log(
  `eager    ${kb(eager)} over ${eagerPaths.length} scripts (baseline ${kb(BASE.eagerGzipBytes)})`,
);
console.log(`deferred ${kb(deferred)} over ${sceneChunks.length} chunks (cap ${kb(DEFERRED_CAP)})`);

let failed = false;

if (eager > BASE.eagerGzipBytes + EAGER_SLACK) {
  console.error(
    `::error::eager JS is ${kb(eager)}, baseline ${kb(BASE.eagerGzipBytes)} plus ${kb(EAGER_SLACK)} slack. ` +
      'If this is deliberate, move scripts/bundle-baseline.json and say why in the commit message.',
  );
  failed = true;
}

if (BASE.expectSceneChunk && sceneChunks.length === 0) {
  console.error(
    `::error::no deferred chunk contains "${THREE_MARKER}", so the deferred budget measured nothing. ` +
      'Either three.js stopped emitting that name, or it is no longer being code split.',
  );
  failed = true;
}

if (deferred > DEFERRED_CAP) {
  console.error(`::error::the crossroads chunk is ${kb(deferred)}, cap is ${kb(DEFERRED_CAP)}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
