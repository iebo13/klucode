/**
 * The eager JS budget, and the guarantee that three.js does not come back.
 *
 * The homepage's services section used to boot a three.js scene: a client
 * component wrote a canvas, a deferred chunk carried the renderer, and this
 * script's job was to cap that chunk. The section is five pre-rendered
 * Blender stills now, `<img>` tags with no scene to boot, so there is no
 * deferred chunk to measure and nothing left to cap. What is left to guard is
 * two things: that the page a visitor downloads before scrolling anywhere
 * does not creep past what it costs today, and that three.js never quietly
 * reappears in a built chunk, which is the one way this budget could stop
 * meaning what it says without the number moving at all.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASE = JSON.parse(readFileSync('scripts/bundle-baseline.json', 'utf8'));
const EAGER_SLACK = 2 * 1024;

/**
 * What would prove three.js is back.
 *
 * The class name survives minification as a `.type` string property, which is
 * how the old deferred-chunk gate found three.js chunks in the first place.
 * Nothing in this codebase has any reason to define a class called
 * BufferGeometry, so its presence in ANY built chunk, eager or not, is the
 * renderer having crept back in through a stray import.
 */
const THREE_MARKER = 'BufferGeometry';

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

const threeChunks = chunks.filter((p) => readFileSync(p, 'utf8').includes(THREE_MARKER));

// The stills' own weight, printed rather than gated: WebP with alpha, lazily
// loaded, never part of the eager script graph this gate bounds. Section 3.6
// of the design spec puts the five stills at 1x and 2x under 400 kB in total;
// this line is what a future change to the render would be checked against.
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
  `stills   ${kb(stillBytes)} over ${stillFiles.length + posterFiles.length} files ` +
    `(${stillFiles.length} stills, ${posterFiles.length} posters), not part of the eager budget`,
);

let failed = false;

if (eager > BASE.eagerGzipBytes + EAGER_SLACK) {
  console.error(
    `::error::eager JS is ${kb(eager)}, baseline ${kb(BASE.eagerGzipBytes)} plus ${kb(EAGER_SLACK)} slack. ` +
      'If this is deliberate, move scripts/bundle-baseline.json and say why in the commit message.',
  );
  failed = true;
}

if (threeChunks.length > 0) {
  console.error(
    `::error::${threeChunks.length} built chunk(s) contain "${THREE_MARKER}": ` +
      `${threeChunks.join(', ')}. three.js left this site in the switch to pre-rendered stills ` +
      '(see docs/superpowers/specs/2026-09-02-crossroads-stills-design.md) and must not come back.',
  );
  failed = true;
}

process.exit(failed ? 1 : 0);
