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
 * What the five stills and the two poster crops may weigh, all twelve files
 * together, on disk.
 *
 * Measured, not chosen: at this commit the twelve are 601.1 kB (the line this
 * script prints below), so the cap is that plus about 39 kB of room, which is
 * one more shot's worth of detail or a quality bump, and not a second render
 * pass sneaking in. They are lazily loaded WebP and never part of the eager
 * script budget above, which is exactly why they need a number of their own:
 * nothing else on this page would notice them growing.
 *
 * Re-measure it after a re-render rather than raising it by reflex, and move
 * section 3.6 of the design spec with it.
 */
// Measured 2 September 2026 after the K re-render (the floor plan is the
// mark's own graph now, and the wide poster is the whole 1600x1000 frame
// rather than a band across it, because the four objects stand at the four
// ends of the letter): 753.3 kB over the twelve files, of which a visitor
// loads at most five, 216.9 kB at 1x or 454.2 kB at 2x. It was 710.5 kB on
// the fan, and the 43 kB is almost all the wide poster growing from 516 to
// 1000 rows. So the cap is that plus 46.7 kB of room, one more still's worth
// at 1x, on the same reasoning as before.
const STILLS_CAP = 800 * 1024;

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

// The stills' own weight, held to STILLS_CAP above: WebP with alpha, lazily
// loaded, never part of the eager script graph the rest of this gate bounds,
// which is why they get a budget of their own rather than sharing that one.
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

if (stillBytes > STILLS_CAP) {
  console.error(
    `::error::the crossroads pictures are ${kb(stillBytes)} over ` +
      `${stillFiles.length + posterFiles.length} files, past the ${kb(STILLS_CAP)} cap. ` +
      'Render or encode them smaller, or, if the weight is deliberate, move STILLS_CAP in ' +
      'this script and section 3.6 of the design spec together and say why in the commit.',
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
