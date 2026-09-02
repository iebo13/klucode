// Side by side: today's three.js shot (left) and the Blender render (right), same shot, same size.
const sharp = require('sharp');
const path = require('path');
const [, , shotsDir, renderDir, outDir] = process.argv;
const PAIRS = [
  ['00-junction', 'junction'],
  ['01-website', 'website'],
  ['02-app', 'app'],
  ['03-capacity', 'capacity'],
  ['04-care', 'care'],
];
(async () => {
  for (const [old, name] of PAIRS) {
    const a = path.join(shotsDir, `1440x900-${old}.png`);
    const b = path.join(renderDir, `${name}.png`);
    const meta = await sharp(a).metadata();
    const right = await sharp(b)
      .resize(meta.width, meta.height, { fit: 'fill' })
      .flatten({ background: '#1c201c' })
      .toBuffer();
    await sharp({
      create: {
        width: meta.width * 2 + 12,
        height: meta.height,
        channels: 3,
        background: '#000000',
      },
    })
      .composite([
        { input: a, left: 0, top: 0 },
        { input: right, left: meta.width + 12, top: 0 },
      ])
      .png()
      .toFile(path.join(outDir, `compare-${name}.png`));
    console.log(`compare-${name}.png`);
  }
})();
