// Before and after, side by side, for a pull request: the three.js section
// as main renders it (left) and the stills (right), same viewport, same shot.
//
//   node tools/blender/pr-pictures.cjs <before-prefix> <after-prefix> <out-dir>
//
// e.g. node tools/blender/pr-pictures.cjs shots/before-main-1440x900 shots/1440x900 docs/pr/crossroads-stills
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const [, , before, after, outDir] = process.argv;
if (!before || !after || !outDir) {
  console.error('usage: pr-pictures.cjs <before-prefix> <after-prefix> <out-dir>');
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
    const out = path.join(outDir, `${shot.replace(/^\d+-/, '')}-before-after.png`);
    await sharp({
      create: { width: ma.width + GAP + mb.width, height: h, channels: 3, background: '#000000' },
    })
      .composite([
        { input: a, left: 0, top: 0 },
        { input: b, left: ma.width + GAP, top: 0 },
      ])
      .png({ compressionLevel: 9 })
      .toFile(out);
    const { size } = fs.statSync(out);
    console.log(`${out}: ${ma.width + GAP + mb.width}x${h}, ${(size / 1024).toFixed(0)} kB`);
  }
})();
