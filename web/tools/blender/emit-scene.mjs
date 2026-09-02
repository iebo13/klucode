/**
 * From a Blender bake to what the live scene loads.
 *
 *   node tools/blender/emit-scene.mjs --bake <dir>
 *
 * `<bake>` is what `crossroads.py --bake` wrote: four `.glb`, four
 * `lightmap-<key>.png` at 2048, `floor.png` at 4096, and `scene.json` with
 * the layout, the poses, the anchors, the bounds and the scale each bake was
 * normalised by. Out of them:
 *
 *   public/crossroads/scene/<key>.glb                the packed models
 *   public/crossroads/scene/lightmap-<key>[@2x].webp the baked light
 *   public/crossroads/scene/floor[@2x].webp          the letter and its light
 *   src/components/crossroads/scene-manifest.ts      the generated module
 *
 * The module is the only place the runtime learns where any of this is, what
 * to multiply it by and where the K stands, and this script is the only thing
 * that writes it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) throw new Error(`emit-scene: ${name} is required`);
  return argv[i + 1];
};
const BAKE = path.resolve(arg('--bake'));

const ORDER = ['website', 'app', 'capacity', 'care'];
/** The two squares crossroads.py bakes at. A file that is not one of these is not that bake. */
const LIGHTMAP_PX = 2048;
const FLOOR_PX = 4096;
/** Spec section 7: what the scene may cost a visitor at 1x, lazily. */
const ASSETS_CAP = 1.5 * 1024 * 1024;

const SITE_DIR = '/crossroads/scene';
const OUT = path.join(WEB, 'public', 'crossroads', 'scene');
mkdirSync(OUT, { recursive: true });

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

const scene = JSON.parse(readFileSync(path.join(BAKE, 'scene.json'), 'utf8'));

/**
 * The models, packed.
 *
 * `-cc` is meshopt compression at the higher ratio, which the runtime decodes
 * with MeshoptDecoder. The four flags after it are all load-bearing: `-kn`
 * keeps the node names, without which gltfpack merges the meshes and the
 * screens and the emitters stop being separate objects the runtime can hand a
 * material to; `-km` keeps the material names; `-ke` keeps the extras, which
 * is where the `kc` tags ride.
 *
 * `-kv` and `-vtf` are the two the plan did not name and the bake cannot do
 * without, both because a baked body's material carries no texture at all.
 *
 * gltfpack strips vertex attributes no material uses: measured on the website
 * way, the packed file came out 5444 bytes with POSITION and NORMAL alone,
 * against 14652 bytes with `-kv` and TEXCOORD_0 and TEXCOORD_1 still on it.
 * The second set is the lightmap unwrap, so without those 9.2 kB the lightmap
 * has no UVs to be read through.
 *
 * And it quantizes what it keeps. Texture coordinates go to 12 bits in a
 * normalised Uint16, which a loader is meant to undo through the
 * KHR_texture_transform gltfpack writes onto the material's textures. There
 * are none to write it onto here, so the numbers arrive uncompensated:
 * measured in the viewer, the screen quad's UVs came back as 0 and 4095 in a
 * Uint16, which normalises to 0.0625 rather than 1, and the quad showed the
 * top left sixteenth of the landing page blown up sixteen times while every
 * body sampled one black corner of its lightmap and rendered black. `-vtf`
 * keeps the coordinates as floats instead. It costs 116 bytes on website,
 * 468 on app, 628 on capacity and 3052 on care, 4.2 kB over the four.
 */
const PACK_FLAGS = ['-cc', '-kn', '-km', '-ke', '-kv', '-vtf'];

const square = async (file, want) => {
  const meta = await sharp(file).metadata();
  if (meta.width !== want || meta.height !== want)
    throw new Error(
      `emit-scene: ${path.relative(BAKE, file)} is ${meta.width}x${meta.height}, not the ` +
        `${want}x${want} square the bake writes. Re-bake rather than shipping a texture the ` +
        'manifest describes wrongly.',
    );
};

/** One texture at 2x and 1x, written as WebP and returned as the pair of site-root paths. */
const picture = async (source, name, px, quality) => {
  const two = await sharp(source)
    .webp({ quality })
    .toFile(path.join(OUT, `${name}@2x.webp`));
  const one = await sharp(source)
    .resize(px / 2, px / 2, { kernel: 'lanczos3' })
    .webp({ quality })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log(
    `${name}: ${one.width}x${one.height} ${kb(one.size)}, 2x ${two.width}x${two.height} ${kb(two.size)}`,
  );
  return {
    picture: { x1: `${SITE_DIR}/${name}.webp`, x2: `${SITE_DIR}/${name}@2x.webp` },
    bytes: one.size,
  };
};

let bytes1x = 0;

const ways = {};
for (const key of ORDER) {
  const meta = scene.ways[key];
  if (!meta) throw new Error(`emit-scene: scene.json has no way for ${key}`);
  const glb = path.join(BAKE, meta.glb);
  const lightmap = path.join(BAKE, meta.lightmap);
  for (const file of [glb, lightmap])
    if (!existsSync(file)) throw new Error(`emit-scene: ${file} is missing`);
  await square(lightmap, LIGHTMAP_PX);

  const packed = path.join(OUT, `${key}.glb`);
  execFileSync('npx', ['gltfpack', '-i', glb, '-o', packed, ...PACK_FLAGS], { cwd: WEB });
  const packedBytes = statSync(packed).size;
  console.log(`${key}.glb: ${kb(statSync(glb).size)} baked, ${kb(packedBytes)} packed`);
  bytes1x += packedBytes;

  const shipped = await picture(lightmap, `lightmap-${key}`, LIGHTMAP_PX, 82);
  bytes1x += shipped.bytes;
  ways[key] = {
    model: `${SITE_DIR}/${key}.glb`,
    lightmap: shipped.picture,
    lightScale: meta.lightScale,
    anchor: scene.anchors[key],
    bounds: scene.bounds[key],
  };
}

const floorSource = path.join(BAKE, scene.floor.texture);
if (!existsSync(floorSource)) throw new Error(`emit-scene: ${floorSource} is missing`);
await square(floorSource, FLOOR_PX);
const floorShipped = await picture(floorSource, 'floor', FLOOR_PX, 80);
bytes1x += floorShipped.bytes;

console.log(`the scene at 1x: ${kb(bytes1x)} of the ${kb(ASSETS_CAP)} cap`);
if (bytes1x > ASSETS_CAP)
  throw new Error(
    `emit-scene: the 1x set is ${kb(bytes1x)}, past the ${kb(ASSETS_CAP)} the spec allows. ` +
      'Nothing was written to the manifest, so the site still points at the last set that fit.',
  );

const json = (value) => JSON.stringify(value, null, 2);
const lines = [
  '// Generated by tools/blender/emit-scene.mjs from a Blender bake. Do not edit by hand:',
  '// re-bake and run the emitter, so the numbers and the files never disagree.',
  '',
  "import type { Pose, ServiceKey, Vec3 } from './types';",
  '',
  "export type PoseKey = 'junction' | 'hub' | ServiceKey;",
  '',
  '/** One texture at 1x and 2x, as site-root paths. The runtime picks by device pixel ratio. */',
  'export type Picture = { x1: string; x2: string };',
  '',
  '/** One way of the K, in three.js coordinates: the angle it leaves the hub at and how far its node stands. */',
  'export type Lane = {',
  '  key: ServiceKey;',
  '  angle: number;',
  '  dist: number;',
  '  node: Vec3;',
  '  back: number;',
  '  aimY: number;',
  '};',
  '',
  'export type WayAsset = {',
  '  model: string;',
  '  lightmap: Picture;',
  "  /** Multiplies the 0..1 lightmap back into the bake's own light (lightMapIntensity). */",
  '  lightScale: number;',
  '  anchor: Vec3;',
  '  bounds: { min: Vec3; max: Vec3 };',
  '};',
  '',
  `export const SCENE_ORDER: readonly ServiceKey[] = ${json(ORDER)};`,
  '',
  '/** The letter itself: what crossroads.py drew the floor from, so the runtime lays chips and lights on the same graph. */',
  'export const LAYOUT: {',
  '  rotate: number;',
  '  strokeWidth: number;',
  '  hub: number;',
  '  node: number;',
  '  floorSize: number;',
  '  fade: readonly [number, number];',
  '  lanes: readonly Lane[];',
  `} = ${json({
    rotate: scene.rotate,
    strokeWidth: scene.strokeWidth,
    hub: scene.hub,
    node: scene.node,
    floorSize: scene.floorSize,
    fade: scene.fade,
    lanes: scene.lanes,
  })};`,
  '',
  `export const POSES: Record<PoseKey, Pose> = ${json(scene.poses)};`,
  '',
  `export const WAYS: Record<ServiceKey, WayAsset> = ${json(ways)};`,
  '',
  `export const FLOOR: { texture: Picture; scale: number } = ${json({
    texture: floorShipped.picture,
    scale: scene.floor.scale,
  })};`,
  '',
  '/** Bytes of every 1x file above together: what a visitor at 1x fetches. */',
  `export const BYTES_1X = ${bytes1x};`,
  '',
];
const module = path.join(WEB, 'src', 'components', 'crossroads', 'scene-manifest.ts');
writeFileSync(module, lines.join('\n'));
execFileSync('npx', ['prettier', '--write', module], { cwd: WEB, stdio: 'ignore' });
console.log(`wrote ${path.relative(WEB, module)}`);
