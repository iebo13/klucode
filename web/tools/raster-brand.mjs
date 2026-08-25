/**
 * The three raster brand assets, from the SVGs that brand/logo/_build makes.
 *
 * They existed before this script did, produced by hand from an earlier cut of
 * the logo, which is how they stayed in Space Grotesk for two weeks after the
 * site's display face changed. Nobody sees an OG card next to the page header,
 * so nothing looked wrong anywhere. That is the argument for the script: a
 * rasterisation step somebody has to remember is a step somebody will not.
 *
 *     python3 brand/logo/_build/build_logos.py   # the SVGs
 *     node tools/raster-brand.mjs                # the PNGs and the copies
 *
 * Run from web/. Commit everything it touches.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import sharp from 'sharp';

const BRAND = '../brand/logo';

/** density 400 rather than the default 72, so a 512px avatar is not upscaled from 96. */
const png = (from, to, size) =>
  sharp(`${BRAND}/${from}`, { density: 400 })
    .resize(size.width, size.height, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(to)
    .then((info) => console.log(`${to}  ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} kB`)); // prettier-ignore

mkdirSync('public', { recursive: true });

// The Open Graph card, which is the only one of these a stranger ever sees.
await png('klucode-og.svg', 'public/og.png', { width: 1200, height: 630 });
// The home-screen icon, and the 512 master beside its own SVG.
await png('klucode-avatar.svg', 'public/apple-touch-icon.png', { width: 180, height: 180 });
await png('klucode-avatar.svg', `${BRAND}/klucode-avatar.png`, { width: 512, height: 512 });

// And the two the site serves as vectors. Copied rather than re-exported: they
// are the brand files, byte for byte, and a divergence here would be a second
// logo nobody meant to draw.
for (const [from, to] of [
  ['klucode-logo-horizontal.svg', 'public/logo.svg'],
  ['klucode-favicon.svg', 'public/favicon.svg'],
]) {
  copyFileSync(`${BRAND}/${from}`, to);
  console.log(`${to}  copied from ${basename(from)}`);
}
