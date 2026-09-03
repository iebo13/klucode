// Before and after, side by side, for a pull request: the five shots as the
// base branch draws them (left) and as this branch draws them (right), same
// viewport, same shot. Which world is on which side is whatever the two
// prefixes point at.
//
//   node tools/blender/pr-pictures.cjs <before-prefix> <after-prefix> <out-dir> [--jpeg]
//
// e.g. node tools/blender/pr-pictures.cjs shots/before-main-1440x900 shots/1440x900 docs/pr/crossroads-stills
//
// --jpeg writes JPEG at quality 88 instead of PNG, which is what a pull
// request wants. Measured on this branch's five pairs of 1440x900 frames:
// 2213 to 2456 kB each as a lossless PNG, 12 MB for the set, against 252 to
// 283 kB each at q88, which is 1.3 MB. The difference is invisible on a
// photographic render, and these pictures are read once in a browser and then
// live in the repo's history forever.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const JPEG = process.argv.includes('--jpeg');
const [, , before, after, outDir] = process.argv;
if (!before || !after || !outDir) {
  console.error('usage: pr-pictures.cjs <before-prefix> <after-prefix> <out-dir> [--jpeg]');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const SHOTS = ['00-junction', '01-website', '02-app', '03-capacity', '04-care'];
const GAP = 16;

(async () => {
  for (const shot of SHOTS) {
    const a = `${before}-${shot}.png`;
    const b = `${after}-${shot}.png`;
    if (!fs.existsSync(a) || !fs.existsSync(b)) {
      console.log(`skip ${shot}: missing ${fs.existsSync(a) ? b : a}`);
      continue;
    }
    const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
    const h = Math.max(ma.height, mb.height);
    const out = path.join(
      outDir,
      `${shot.replace(/^\d+-/, '')}-before-after.${JPEG ? 'jpg' : 'png'}`,
    );
    const pair = sharp({
      create: { width: ma.width + GAP + mb.width, height: h, channels: 3, background: '#000000' },
    }).composite([
      { input: a, left: 0, top: 0 },
      { input: b, left: ma.width + GAP, top: 0 },
    ]);
    await (JPEG ? pair.jpeg({ quality: 88 }) : pair.png({ compressionLevel: 9 })).toFile(out);
    const { size } = fs.statSync(out);
    console.log(`${out}: ${ma.width + GAP + mb.width}x${h}, ${(size / 1024).toFixed(0)} kB`);
  }
})();
