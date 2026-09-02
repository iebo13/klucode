/**
 * Draws the crossroads' two mock interfaces and its work screen exactly as
 * the site would, and saves them as the three PNGs tools/blender/crossroads.py
 * loads as screen textures.
 *
 *     npm run build
 *     python3 -m http.server 4173 --bind 127.0.0.1 --directory out &
 *     node tools/blender/capture-textures.mjs tools/blender/textures
 *
 * The drawing code lives in src/components/crossroads/textures.ts and the
 * words in labels.ts. Both are TypeScript, and the fonts they draw with
 * (Archivo, IBM Plex Sans, IBM Plex Mono) are the site's own webfonts, which
 * only exist loaded on a real page. So rather than run node-canvas or some
 * other headless substitute, this script compiles the drawing code with tsc,
 * ships the two files to the ALREADY BUILT AND SERVED page, and asks the
 * page's own browser to run them: same glyphs, same hinting, same output a
 * visitor's screen would show if this were ever drawn live instead of baked
 * into a render.
 *
 * Nothing under out/ is committed, so this leaves no trace once it is done:
 * the compiled JS is copied into out/_blender/ for the page to import and
 * that directory is removed again before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..', '..');
const OUT = process.argv[2];
if (!OUT) throw new Error('capture-textures: pass the directory to write the three PNGs into');

/**
 * The four modules the render needs, and no more.
 *
 * types.ts pulls in `ServiceKey` from src/content/types.ts and labels.ts pulls
 * in `Lang` from src/lib/routes.ts, both as `import type`, so both erase to
 * nothing at emit time under --isolatedModules: neither file needs compiling
 * alongside these four, and neither ends up in the output JS. Verified below
 * rather than assumed, because a later edit that turned either into a value
 * import would otherwise fail silently in the browser with no clue why.
 */
const NAMES = ['types.ts', 'textures.ts', 'labels.ts', 'palette.ts'];
const SOURCES = NAMES.map((f) => path.join(WEB, 'src', 'components', 'crossroads', f));

const tscOut = mkdtempSync(path.join(tmpdir(), 'kc-blender-'));

/**
 * Explicit files on the command line, not `-p tsconfig.json`: tsc only
 * searches for a project file when no files are named on the command line, so
 * this reads none of this repo's tsconfig and therefore knows nothing about
 * the `@/*` path alias it declares there. That is what raises the two
 * "Cannot find module '@/...'" diagnostics caught below, and it is also what
 * keeps this compile fast and free of the app's own strictness settings,
 * which have nothing to say about drawing on a canvas.
 */
const TSC_ARGS = [
  'tsc',
  ...SOURCES,
  '--module',
  'es2020',
  '--target',
  'es2022',
  '--moduleResolution',
  'bundler',
  '--outDir',
  tscOut,
  '--skipLibCheck',
  '--isolatedModules',
];

/**
 * Two, and only these two, diagnostics are expected: the `@/lib/routes` and
 * `@/content/types` imports above, unresolvable with no tsconfig in play.
 * Both are `import type`, so both are erased on emit and never reach the JS
 * this script goes on to serve, which is confirmed again below by grepping
 * the emitted files. Anything else in tsc's output is a real problem and this
 * throws with the full text rather than swallowing it.
 */
const EXPECTED_ERRORS = [
  /error TS2307: Cannot find module '@\/lib\/routes'/,
  /error TS2307: Cannot find module '@\/content\/types'/,
];

try {
  execFileSync('npx', TSC_ARGS, { cwd: WEB, encoding: 'utf8', stdio: 'pipe' });
} catch (err) {
  const out = String(err.stdout ?? '');
  const lines = out.split('\n').filter((l) => l.trim().length > 0);
  const unexpected = lines.filter((l) => !EXPECTED_ERRORS.some((re) => re.test(l)));
  if (unexpected.length > 0) {
    throw new Error(`capture-textures: tsc failed with unexpected output:\n${out}`);
  }
}

for (const name of NAMES) {
  const js = path.join(tscOut, name.replace(/\.ts$/, '.js'));
  const body = readFileSync(js, 'utf8');
  // Native ESM in a browser needs the file extension a bundler's
  // `moduleResolution: bundler` lets a source file omit. None of these four
  // modules currently import each other at the value level (their only
  // cross-module imports are the erased `import type`s above), so this is a
  // no-op today; it is here so the day one of them gains a real import of
  // another, that import works instead of 404ing in the browser console.
  const fixed = body.replace(/from (['"])(\.[^'"]+)\1/g, (m, q, spec) =>
    spec.endsWith('.js') ? m : `from ${q}${spec}.js${q}`,
  );
  if (/from ['"]@\//.test(fixed)) {
    throw new Error(
      `capture-textures: ${name} still imports through the '@/' alias after compiling. ` +
        'Add the aliased file to SOURCES above (module resolution still needs the alias solved ' +
        'some other way, since tsc on explicit files reads no paths mapping) or confirm the ' +
        'import is type-only so it erases instead.',
    );
  }
  writeFileSync(path.join(tscOut, path.basename(js)), fixed);
}

const blenderDir = path.join(WEB, 'out', '_blender');
mkdirSync(blenderDir, { recursive: true });
for (const name of NAMES) {
  const js = name.replace(/\.ts$/, '.js');
  writeFileSync(path.join(blenderDir, js), readFileSync(path.join(tscOut, js), 'utf8'));
}
rmSync(tscOut, { recursive: true, force: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:4173/de/');
  // The mock screens use the site's own webfonts (Archivo, IBM Plex Sans, IBM
  // Plex Mono), which is the entire reason this runs in a real page rather
  // than node-canvas: drawn before the fonts land, every line of text is a
  // fallback-face width and the layout the coordinates in textures.ts were
  // tuned against is wrong.
  await page.evaluate(() => document.fonts.ready);

  const content = `
    import { LANDING_SIZE, DASHBOARD_SIZE, WORK_SIZE, drawLanding, drawDashboard, drawWorkScreen }
      from '/_blender/textures.js';
    import { LABELS } from '/_blender/labels.js';

    function draw(size, paint) {
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = size;
      paint(canvas.getContext('2d'));
      return { width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL('image/png') };
    }

    window.__textures = {
      landing: draw(LANDING_SIZE, (ctx) => drawLanding(ctx, LABELS.de.landing)),
      dashboard: draw(DASHBOARD_SIZE, (ctx) => drawDashboard(ctx, LABELS.de.dashboard)),
      work: draw(WORK_SIZE, (ctx) => drawWorkScreen(ctx)),
    };
  `;
  await page.addScriptTag({ type: 'module', content });
  await page.waitForFunction(() => Boolean(window.__textures));
  const textures = await page.evaluate(() => window.__textures);

  mkdirSync(OUT, { recursive: true });
  for (const key of ['landing', 'dashboard', 'work']) {
    const { width, height, dataUrl } = textures[key];
    const file = path.join(OUT, `canvas-${width}x${height}.png`);
    writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`${key}: ${width}x${height} -> ${path.relative(WEB, file)}`);
  }
} finally {
  await browser.close();
  rmSync(blenderDir, { recursive: true, force: true });
}
