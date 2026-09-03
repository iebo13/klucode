/**
 * From a Blender render to what the site ships.
 *
 *   node tools/blender/emit-stills.mjs --renders <dir> --poster <dir>
 *
 * `<renders>` holds the five free-frame stills at 2x and their anchors.json,
 * `<poster>` the wide junction render (junction.png, which carries alpha of
 * its own wherever the render has no light). Out of them:
 *
 *   public/crossroads/<shot>@2x.webp and <shot>.webp   the stills, with alpha
 *   public/crossroads.webp, public/crossroads-phone.webp the poster's two crops
 *   src/components/crossroads/stills.ts                  the generated module
 *
 * The module is the only place the page learns the stills' size, files and
 * label anchors, and this script is the only thing that writes it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) throw new Error(`emit-stills: ${name} is required`);
  return argv[i + 1];
};
const RENDERS = path.resolve(arg('--renders'));
const POSTER = path.resolve(arg('--poster'));

const ORDER = ['junction', 'website', 'app', 'capacity', 'care'];
const WAYS = ['website', 'app', 'capacity', 'care'];
const OUT = path.join(WEB, 'public', 'crossroads');
mkdirSync(OUT, { recursive: true });

const anchors = JSON.parse(readFileSync(path.join(RENDERS, 'anchors.json'), 'utf8'));
const first = anchors[ORDER[0]];
if (!first) throw new Error(`emit-stills: anchors.json has no entry for ${ORDER[0]}`);
// The box every still is placed in and the 1x file is resized to. Taken from
// the first shot and then required of all five, below.
const { width, height } = first;
const SCALE = 2;

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
let total = 0;

const stills = {};
for (const shot of ORDER) {
  const meta = anchors[shot];
  if (!meta) throw new Error(`emit-stills: no render for ${shot}`);
  const png = path.join(RENDERS, `${shot}.png`);
  if (!existsSync(png)) throw new Error(`emit-stills: ${png} is missing`);

  /**
   * What a shot has to be before it becomes something the site ships: the
   * free frame rather than the poster's, rendered at 2x, and exactly twice
   * the box in pixels.
   *
   * Per shot, not once for the first one. crossroads.py merges anchors.json
   * so that re-rendering a single shot keeps the other four's entries, which
   * is the whole point of that merge and also the way a mixed directory
   * happens: one shot re-rendered at --scale 1 or --frame poster leaves four
   * correct entries in front of it. The page then places a picture that is
   * not the size its anchors were measured in, and every label on that shot
   * stands somewhere else.
   */
  if (meta.frame !== 'free')
    throw new Error(`emit-stills: ${shot} was rendered at frame '${meta.frame}', not 'free'`);
  if (meta.scale !== SCALE)
    throw new Error(`emit-stills: ${shot} was rendered at scale ${meta.scale}, not ${SCALE}`);
  const px = await sharp(png).metadata();
  if (px.width !== SCALE * width || px.height !== SCALE * height)
    throw new Error(
      `emit-stills: ${shot}.png is ${px.width}x${px.height}, not the ` +
        `${SCALE * width}x${SCALE * height} that ${SCALE}x of the ${width}x${height} box is`,
    );

  const two = await sharp(png)
    .webp({ quality: 80, alphaQuality: 88 })
    .toFile(path.join(OUT, `${shot}@2x.webp`));
  const one = await sharp(png)
    .resize(width, height, { kernel: 'lanczos3' })
    .webp({ quality: 80, alphaQuality: 88 })
    .toFile(path.join(OUT, `${shot}.webp`));
  total += two.size + one.size;
  console.log(
    `${shot}: ${one.width}x${one.height} ${kb(one.size)}, 2x ${two.width}x${two.height} ${kb(two.size)}`,
  );

  const marks = {};
  for (const way of WAYS) {
    const [x, y] = meta.marks[way];
    marks[way] = { x, y, on: shot === 'junction' || shot === way };
  }
  stills[shot] = { src: `/crossroads/${shot}.webp`, src2x: `/crossroads/${shot}@2x.webp`, marks };
}
console.log(`stills: ${kb(total)} in total`);

/**
 * The poster's two pictures: the whole render, and the two monitors out of it.
 *
 * Measured by projecting each way's bounds through the poster camera, which
 * is the map's camera in a 1600x1000 frame at a vertical field of 43.88
 * degrees: on the K the website monitor occupies x 590 to 720 and y 92 to
 * 220, the app's monitor and server x 972 to 1146 and y 60 to 233, the care
 * rack and its cloud x 475 to 697 and y 767 to 1016, and the capacity desks
 * x 1218 to 1504 and y 749 to 1119, which the render's own bottom edge
 * already ends. The hub disc is at (642, 470).
 *
 * So the four of them together span y 60 to 1119, and no band shorter than
 * the whole frame holds them: the fan's band from 0.2 to 0.716 of the height
 * was cut for an arc of objects across the middle, and on the letter it lands
 * on the hub and the strokes with not one object in it. The wide picture is
 * therefore the render itself, which is what `sceneAlt` promises, four ways
 * as a place.
 *
 * The upright crop keeps its 0.55 by 0.657 of the frame and moves to hold the
 * two monitors whole, which is what `scenePhoneAlt` promises: from 0.27 of
 * the width it runs x 432 to 1312, and from 0.02 of the height y 20 to 677,
 * which contains both boxes above with room and reaches neither the cloud at
 * 767 nor the desks at 749.
 */
const poster = path.join(POSTER, 'junction.png');
if (!existsSync(poster)) throw new Error(`emit-stills: ${poster} is missing`);
const pm = await sharp(poster).metadata();
const strip = await sharp(poster)
  .webp({ quality: 80 })
  .toFile(path.join(WEB, 'public', 'crossroads.webp'));
console.log(`poster wide: ${strip.width}x${strip.height} ${kb(strip.size)}`);
const phone = await sharp(poster)
  .extract({
    left: Math.round(pm.width * 0.27),
    top: Math.round(pm.height * 0.02),
    width: Math.round(pm.width * 0.55),
    height: Math.round(pm.height * 0.657),
  })
  .webp({ quality: 80 })
  .toFile(path.join(WEB, 'public', 'crossroads-phone.webp'));
console.log(`poster phone: ${phone.width}x${phone.height} ${kb(phone.size)}`);

const lines = [
  '// Generated by tools/blender/emit-stills.mjs from a Blender render. Do not edit by hand:',
  '// re-render and run the emitter, so the anchors and the pictures never disagree.',
  '',
  "import type { ServiceKey } from './types';",
  '',
  "export type StillKey = 'junction' | ServiceKey;",
  '',
  '/**',
  ' * Where a label stands, in still pixels at 1x, x from the left and y from the',
  ' * top. `on` is whether the label is shown on that still: all four at the',
  ' * junction, only its own way in a close-up.',
  ' */',
  'export type Anchor = { x: number; y: number; on: boolean };',
  '',
  'export type Still = { src: string; src2x: string; marks: Record<ServiceKey, Anchor> };',
  '',
  '/** The still is the free region beside the copy panel at 1440x900, in CSS pixels. */',
  `export const STILL = { width: ${width}, height: ${height} } as const;`,
  '',
  `export const STILL_ORDER: readonly StillKey[] = ${JSON.stringify(ORDER)};`,
  '',
  `export const STILLS: Record<StillKey, Still> = ${JSON.stringify(stills, null, 2)};`,
  '',
];
const module = path.join(WEB, 'src', 'components', 'crossroads', 'stills.ts');
writeFileSync(module, lines.join('\n'));
execFileSync('npx', ['prettier', '--write', module], { cwd: WEB, stdio: 'ignore' });
console.log(`wrote ${path.relative(WEB, module)}`);
