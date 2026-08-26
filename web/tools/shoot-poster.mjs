/**
 * Renders the crossroads once, as a still, for everyone who never sees it move.
 *
 * Most visitors are in that group: every tablet held upright, every
 * reduced-motion request, every browser without WebGL, every window under
 * 1024px wide. They get an honest and complete fallback, and without this
 * they got no idea the site had a device at all. A still of the junction above
 * the price board costs them one lazy-loaded image and no runtime. Phones do
 * not get it: at 327px wide the strip is 78px tall and reads as a dark banner.
 *
 * It is rendered from the scene rather than drawn, so it cannot drift from it:
 * re-run this after any change to objects.ts, palette.ts or the junction shot.
 *
 *     npm run build
 *     python3 -m http.server 4173 --bind 127.0.0.1 --directory out &
 *     node tools/shoot-poster.mjs
 *
 * Writes public/crossroads.webp and public/crossroads-phone.webp. Commit both.
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.SHOOT_BASE ?? 'http://127.0.0.1:4173';
const OUT = 'public/crossroads.webp';
/**
 * The phone's copy, and it is a different CROP rather than a smaller file.
 *
 * The wide strip is 1600x505 and it was hidden below the `sm` breakpoint,
 * correctly: at 327px it renders 103px tall and nothing in it is identifiable,
 * so it reads as a dark banner, which is worse than no picture. But hiding it
 * left the services section with no image at all on the device most visitors
 * use, on a homepage that rendered zero images end to end. So the phone gets
 * the middle of the same render at an upright aspect: three objects instead of
 * four, each about three times the width it had in the strip.
 */
const OUT_PHONE = 'public/crossroads-phone.webp';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`${BASE}/de/`);
await page.waitForSelector('#services canvas[data-scene="kc-crossroads"]');

// The junction, with all four built: the shot the section idles on once the
// reader has looked at it. The reveal is tied to the section coming into
// view, so the page has to be scrolled there first.
await page.evaluate(() => {
  document.querySelector('#services').scrollIntoView({ block: 'start', behavior: 'instant' });
});
await page.waitForSelector('#services[data-built="4"]', { timeout: 8000 });
await page.waitForTimeout(400);

// Everything that belongs to the page rather than to the world. display:none
// rather than visibility:hidden, because the scene measures the panel's box to
// decide which part of the canvas it may compose into: hidden, the box is
// still there and the shot stays pushed to the right with a third of the frame
// empty. Gone, and one resize later, the camera composes centrally again.
//
// The panel is also what gives the section its height, so the layout keeps
// the height it had with the panel in it. Without this the stage collapses to
// its padding and the poster is a 67px strip.
const layoutHeight = await page.evaluate(
  () => document.querySelector('.crossroads-layout').getBoundingClientRect().height,
);
await page.addStyleTag({
  content:
    `.crossroads-copy, .crossroads-marks, .crossroads-veil, header { display: none !important; }` +
    `.crossroads-layout { min-height: ${Math.round(layoutHeight)}px; }`,
});
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await page.waitForTimeout(400);

const shot = await page.locator('#services canvas').screenshot();
await browser.close();

// Cropped to the band the objects and their floor actually occupy. The
// junction is tilted well down, so the top of the frame is unlit background
// and the bottom is floor running to the fog: both are fog-coloured and
// neither is worth the bytes. Without the panel the stage is a short wide
// strip, so the band is most of it.
const { width, height } = await sharp(shot).metadata();
const top = Math.round(height * 0.12);
const band = Math.round(height * 0.62);
const info = await sharp(shot)
  .extract({ left: 0, top, width, height: band })
  .resize(1600)
  .webp({ quality: 76 })
  .toFile(OUT);

console.log(`${OUT}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} kB`);

// The upright crop: the left half of the fan, which is the landing page, the
// dashboard and the database. Those are the three objects the audit found
// credible, and they are the ones worth showing at 327px.
const phone = await sharp(shot)
  .extract({
    left: Math.round(width * 0.03),
    top: Math.round(height * 0.1),
    width: Math.round(width * 0.46),
    height: Math.round(height * 0.66),
  })
  .resize(880)
  .webp({ quality: 78 })
  .toFile(OUT_PHONE);

console.log(`${OUT_PHONE}: ${phone.width}x${phone.height}, ${(phone.size / 1024).toFixed(1)} kB`);
