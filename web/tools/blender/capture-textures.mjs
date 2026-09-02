// Capture every 2D canvas the crossroads scene draws (the mock interfaces) as PNGs.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  window.__canvases = [];
  const create = document.createElement.bind(document);
  document.createElement = (tag, opts) => {
    const el = create(tag, opts);
    if (String(tag).toLowerCase() === 'canvas') window.__canvases.push(el);
    return el;
  };
});
await page.goto('http://127.0.0.1:4173/de/');
await page.waitForSelector('#services canvas[data-scene="kc-crossroads"]');
await page.evaluate(() =>
  document.querySelector('#services').scrollIntoView({ block: 'start', behavior: 'instant' }),
);
await page.waitForSelector('#services[data-built="4"]', { timeout: 15000 });
await page.waitForTimeout(1500);
const shots = await page.evaluate(() =>
  window.__canvases
    .filter((c) => c.width > 0 && c.height > 0 && !c.dataset.scene && c.getContext('2d'))
    .map((c) => ({ w: c.width, h: c.height, data: c.toDataURL('image/png') })),
);
shots.forEach((s, i) => {
  writeFileSync(`${OUT}/canvas-${s.w}x${s.h}.png`, Buffer.from(s.data.split(',')[1], 'base64'));
  console.log(`canvas ${i}: ${s.w}x${s.h}`);
});
await browser.close();
