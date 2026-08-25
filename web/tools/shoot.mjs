/**
 * Screenshots the crossroads at every camera stop, at every viewport the scene
 * mounts on, and prints what it measured on the way.
 *
 * Not a test and not in CI. It is the thing you run when a change to the frame
 * needs looking at as well as asserting on, and it exists because the
 * alternative is scrolling by hand and losing the numbers. The assertions live
 * in tests/unit/crossroads-framing.spec.ts and tests/e2e/crossroads.spec.ts.
 *
 *     npm run build && node tools/shoot.mjs
 *
 * Writes shots/<viewport>-<index>-<name>.png. The directory is gitignored.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = process.env.SHOOT_BASE ?? 'http://127.0.0.1:4173';
const LANG = process.env.SHOOT_LANG ?? 'de';

const VIEWPORTS = [
  { name: '1024x736', width: 1024, height: 736 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

/** The stops, as scene.ts lays them out. */
const STOPS = [
  { at: 0, name: 'junction' },
  { at: 0.18, name: 'website' },
  { at: 0.37, name: 'app' },
  { at: 0.56, name: 'capacity' },
  { at: 0.75, name: 'care' },
  { at: 1, name: 'release' },
];

mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/${LANG}/`);
  await page.waitForSelector('#services canvas[data-scene="kc-crossroads"]');

  const box = await page.evaluate(() => {
    const stage = document.querySelector('.crossroads-stage');
    const panel = document.querySelector('.crossroads-copy');
    const canvas = document.querySelector('.crossroads-stage canvas');
    const s = stage.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return {
      stage: [Math.round(s.width), Math.round(s.height)],
      canvas: [canvas.width, canvas.height],
      panel: [Math.round(p.width), Math.round(p.height)],
      reserve: Math.round(p.right - s.left),
      overflows: Math.round(p.height) > Math.round(s.height) - 104,
      scrolls: panel.scrollHeight > panel.clientHeight,
    };
  });
  console.log(
    `${viewport.name}: stage ${box.stage.join('x')}, canvas ${box.canvas.join('x')}, ` +
      `panel ${box.panel.join('x')}, reserve ${box.reserve}px, free ${box.stage[0] - box.reserve}px` +
      `${box.overflows ? '  <-- PANEL OVERFLOWS' : ''}${box.scrolls ? '  <-- PANEL SCROLLS' : ''}`,
  );

  for (const [i, stop] of STOPS.entries()) {
    await page.evaluate((p) => {
      const el = document.querySelector('#services');
      const stage = document.querySelector('.crossroads-stage');
      const top = el.getBoundingClientRect().top + window.scrollY;
      // 'instant', because globals.css sets scroll-behavior: smooth and a
      // two-argument scrollTo honours it: measured, the animated form was 2px
      // down the page 90ms into a 4830px jump.
      window.scrollTo({
        top: top + p * (el.offsetHeight - stage.clientHeight),
        behavior: 'instant',
      });
    }, stop.at);
    // Long enough for the label fade (200ms), the row dim (240ms) and the
    // detail's 320ms open to have finished. Shorter and every screenshot
    // catches three transitions mid-flight and reads as a rendering fault.
    await page.waitForTimeout(420);

    const seen = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('.crossroads-mark')]
        .map((el, j) => ({ n: String(j + 1).padStart(2, '0'), el }))
        .filter(({ el }) => el.dataset.on === 'true')
        .map(({ n, el }) => ({ n, r: el.firstElementChild.getBoundingClientRect() }));
      const clashes = [];
      for (let a = 0; a < shown.length; a += 1) {
        for (let b = a + 1; b < shown.length; b += 1) {
          const p = shown[a].r;
          const q = shown[b].r;
          const over =
            Math.max(0, Math.min(p.right, q.right) - Math.max(p.left, q.left)) *
            Math.max(0, Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top));
          if (over > 0) clashes.push(`${shown[a].n}/${shown[b].n}`);
        }
      }
      const stage = document.querySelector('.crossroads-stage').getBoundingClientRect();
      const panel = document.querySelector('.crossroads-copy').getBoundingClientRect();
      return {
        panel: Math.round(panel.height),
        spill: Math.round(Math.max(stage.top - panel.top, panel.bottom - stage.bottom)),
        focus: document.querySelector('#services li[data-focus="true"]')?.dataset.key ?? '-',
        marks: shown.map((m) => `${m.n}@${Math.round(m.r.left)},${Math.round(m.r.top)}`),
        clashes,
      };
    });
    const name = `shots/${viewport.name}-${String(i).padStart(2, '0')}-${stop.name}.png`;
    await page.screenshot({ path: name });
    console.log(
      `  ${stop.at.toFixed(2)}  focus ${seen.focus.padEnd(9)} panel ${String(seen.panel).padStart(4)}px ` +
        `${seen.marks.join('  ') || '(no labels)'}` +
        (seen.clashes.length ? `   <-- LABELS OVERLAP ${seen.clashes.join(' ')}` : '') +
        (seen.spill > 0 ? `   <-- PANEL SPILLS ${seen.spill}px` : ''),
    );
  }
  await page.close();
}
await browser.close();
