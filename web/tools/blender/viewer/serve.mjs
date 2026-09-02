/**
 * The live scene, served beside the Cycles renders it was baked from.
 *
 *     node tools/blender/viewer/serve.mjs
 *     node tools/blender/viewer/shoot.mjs      # in another shell
 *
 * This is the only way to look at what the bake and the loader produce before
 * the page itself learns to mount a scene, and it is how the six poses were
 * compared against `tools/blender/renders/review/*.png` frame by frame.
 *
 * It compiles the scene modules with tsc exactly as `capture-textures.mjs`
 * does, for the same reason: explicit files on the command line, no tsconfig,
 * no `@/*` alias, so the compile is fast and knows nothing about the app's
 * own settings. It then serves `web/` itself, so the page can reach the
 * compiled modules, `node_modules/three`, the assets under `public/` and the
 * renders under `tools/blender/renders/` from one origin with no build.
 */
import { execFileSync } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..', '..', '..');
const BUILD = path.join(HERE, '_build');
const PORT = 4174;

/**
 * The ten modules the viewer needs, and no more.
 *
 * types.ts pulls in `ServiceKey` from src/content/types.ts and labels.ts pulls
 * in `Lang` from src/lib/routes.ts, both as `import type`, so both erase at
 * emit time under --isolatedModules and neither file needs compiling
 * alongside these. `three` and its addons resolve out of node_modules and are
 * left as bare specifiers for the import map in index.html to answer.
 */
const NAMES = [
  'types.ts',
  'palette.ts',
  'labels.ts',
  'textures.ts',
  'scene-manifest.ts',
  'registry.ts',
  'camera.ts',
  'studio.ts',
  'post.ts',
  'assets.ts',
];
const SOURCES = NAMES.map((f) => path.join(WEB, 'src', 'components', 'crossroads', f));

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
  BUILD,
  '--skipLibCheck',
  '--isolatedModules',
];

/**
 * Two, and only these two, diagnostics are expected: the `@/lib/routes` and
 * `@/content/types` imports above, unresolvable with no tsconfig in play.
 * Both are `import type`, so both are erased on emit. Anything else in tsc's
 * output is a real problem and this throws with the full text.
 */
const EXPECTED_ERRORS = [
  /error TS2307: Cannot find module '@\/lib\/routes'/,
  /error TS2307: Cannot find module '@\/content\/types'/,
];

rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
try {
  execFileSync('npx', TSC_ARGS, { cwd: WEB, encoding: 'utf8', stdio: 'pipe' });
} catch (err) {
  const out = String(err.stdout ?? '');
  const unexpected = out
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .filter((l) => !EXPECTED_ERRORS.some((re) => re.test(l)));
  if (unexpected.length > 0) throw new Error(`viewer: tsc failed with unexpected output:\n${out}`);
}

for (const name of NAMES) {
  const js = path.join(BUILD, name.replace(/\.ts$/, '.js'));
  const body = readFileSync(js, 'utf8');
  // Native ESM in a browser needs the file extension a bundler's
  // `moduleResolution: bundler` lets a source file omit. Only relative
  // specifiers are touched: `three` and `three/examples/jsm/...` are answered
  // by the import map and must stay exactly as they are.
  const fixed = body.replace(/from (['"])(\.[^'"]+)\1/g, (m, q, spec) =>
    spec.endsWith('.js') ? m : `from ${q}${spec}.js${q}`,
  );
  if (/from ['"]@\//.test(fixed))
    throw new Error(
      `viewer: ${name} still imports through the '@/' alias after compiling. Add the aliased ` +
        'file to NAMES above, or confirm the import is type-only so it erases instead.',
    );
  writeFileSync(js, fixed);
}
console.log(`compiled ${NAMES.length} modules into ${path.relative(WEB, BUILD)}`);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = path.join(WEB, url);
  // A directory means its index.html, which is how /tools/blender/viewer/
  // reaches the page without naming the file.
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  // Nothing outside web/, whatever a request asks for.
  if (!file.startsWith(WEB) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end(`not here: ${url}`);
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`the crossroads viewer is at http://127.0.0.1:${PORT}/tools/blender/viewer/`);
});
