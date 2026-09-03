/**
 * The six pairs: the live scene beside the Cycles render of the same pose.
 *
 *     node tools/blender/viewer/serve.mjs &
 *     node tools/blender/viewer/shoot.mjs
 *
 * Writes tools/blender/renders/review/viewer-<pose>.png, the live frame on
 * the left and the render on the right at the same 1440 px width. The render
 * carries its own alpha, so it is flattened onto the section's ink first:
 * shown on white it would be a different picture from the one the page paints.
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..', '..', '..');
const REVIEW = path.join(WEB, 'tools', 'blender', 'renders', 'review');
const POSES = ['junction', 'hub', 'website', 'app', 'capacity', 'care'];

const W = 1440;
const H = 998;
/** The section's ink, stone.950, which is what the page paints behind the scene. */
const INK = { r: 0x1c, g: 0x20, b: 0x1c };
const CAPTION = 32;

mkdirSync(REVIEW, { recursive: true });

const browser = await chromium.launch({
  // Headless Chromium refuses a WebGL context without this on this machine:
  // the GPU process falls back to SwiftShader and Chrome blocks the fallback
  // unless it is asked for by name.
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({
    viewport: { width: W, height: 1120 },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (err) => console.error('viewer page error:', err.message));
  await page.goto('http://127.0.0.1:4174/tools/blender/viewer/');
  await page.waitForFunction(() => window.__frames >= 1, null, { timeout: 60_000 });

  for (const pose of POSES) {
    const before = await page.evaluate(() => window.__frames);
    await page.selectOption('#pose', pose);
    await page.waitForFunction((n) => window.__frames > n, before);
    const live = await page.locator('#view').screenshot();

    const render = path.join(REVIEW, `${pose}.png`);
    if (!existsSync(render))
      throw new Error(`shoot: ${render} is missing, so there is nothing to compare against`);
    const flat = await sharp(render).flatten({ background: INK }).resize({ width: W }).toBuffer();
    const flatMeta = await sharp(flat).metadata();

    const caption = Buffer.from(
      `<svg width="${W * 2}" height="${CAPTION}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="${W * 2}" height="${CAPTION}" fill="#1c201c"/>` +
        `<text x="16" y="21" fill="#a8ada9" font-family="monospace" font-size="15">${pose}: live, three.js</text>` +
        `<text x="${W + 16}" y="21" fill="#a8ada9" font-family="monospace" font-size="15">${pose}: Cycles</text>` +
        '</svg>',
    );

    const out = path.join(REVIEW, `viewer-${pose}.png`);
    await sharp({
      create: { width: W * 2, height: H + CAPTION, channels: 3, background: INK },
    })
      .composite([
        { input: caption, top: 0, left: 0 },
        { input: live, top: CAPTION, left: 0 },
        { input: flat, top: CAPTION + Math.round((H - flatMeta.height) / 2), left: W },
      ])
      .png()
      .toFile(out);
    console.log(`${pose}: ${path.relative(WEB, out)}`);
  }
} finally {
  await browser.close();
}
