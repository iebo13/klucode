/**
 * Renders the crossroads once, as a still, for everyone who never sees it move.
 *
 * Most visitors are in that group: every phone, every tablet held upright,
 * every reduced-motion request, every browser without WebGL. They get an
 * honest and complete fallback, and until now they got no idea the site had a
 * device at all. A still of the establishing shot above the price board costs
 * them one lazy-loaded image and no runtime.
 *
 * It is rendered from the scene rather than drawn, so it cannot drift from it:
 * re-run this after any change to objects.ts, palette.ts or the closing stop.
 *
 *     npm run build
 *     python3 -m http.server 4173 --bind 127.0.0.1 --directory out &
 *     node tools/shoot-poster.mjs
 *
 * Writes public/crossroads.webp. Commit the result.
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.SHOOT_BASE ?? 'http://127.0.0.1:4173';
const OUT = 'public/crossroads.webp';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`${BASE}/de/`);
await page.waitForSelector('#services canvas[data-scene="kc-crossroads"]');

// The closing release shot: the only stop that holds all four objects with all
// four built. The junction holds all four as drawings, which is the wrong
// picture for a still that is standing in for the whole journey.
await page.evaluate(() => {
  const el = document.querySelector('#services');
  const stage = document.querySelector('.crossroads-stage');
  const top = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top + (el.offsetHeight - stage.clientHeight), behavior: 'instant' });
});
await page.waitForTimeout(500);

// Everything that belongs to the page rather than to the world. display:none
// rather than visibility:hidden, because the scene measures the panel's box to
// decide which part of the canvas it may compose into: hidden, the box is
// still there and the shot stays pushed to the right with a third of the frame
// empty. Gone, and one resize later, the camera composes centrally again.
await page.addStyleTag({
  content: `.crossroads-copy, .crossroads-marks, .crossroads-veil, header { display: none !important; }`,
});
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await page.waitForTimeout(400);

const shot = await page.locator('#services canvas').screenshot();
await browser.close();

// Cropped to the band the objects and their floor actually occupy. The closing
// stop is tilted well down, so the top of a 16:9 frame is unlit background and
// the bottom is floor running to the fog: both are fog-coloured and neither is
// worth the bytes.
const { width, height } = await sharp(shot).metadata();
// Measured on the rendered frame: the four objects occupy y 209 to 521 of a
// 1080 shot, so the band starts a little above the first of them and keeps
// enough floor under the last for the light pool to read as a floor.
const band = Math.round(height * 0.42);
const info = await sharp(shot)
  .extract({ left: 0, top: Math.round(height * 0.155), width, height: band })
  .resize(1600)
  .webp({ quality: 76 })
  .toFile(OUT);

console.log(`${OUT}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} kB`);
