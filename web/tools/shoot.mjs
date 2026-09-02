/**
 * Screenshots the crossroads at the junction and at every close-up, at every
 * viewport width the stills mount on, and prints what it measured on the way.
 *
 * Not a test and not in CI. It is the thing you run when a change to the frame
 * needs looking at as well as asserting on, and it exists because the
 * alternative is hovering by hand and losing the numbers. The assertions live
 * in tests/e2e/crossroads.spec.ts.
 *
 *     npm run build
 *     python3 -m http.server 4173 --bind 127.0.0.1 --directory out &
 *     node tools/shoot.mjs
 *
 * Writes shots/<viewport>-<index>-<name>.png. The directory is gitignored.
 *
 * The panel line it prints is the one the PIN query in index.tsx is set from:
 * pinned, the whole panel has to stand inside 100svh, so re-run this after a
 * copy change to the rows and check the number against the query.
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

/** The junction, then the four close-ups in the order the rows stand. */
const SHOTS = ['junction', 'website', 'app', 'capacity', 'care'];

mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/${LANG}/`);
  await page.waitForSelector('#services img.crossroads-still[data-on="true"]');
  // The section's top ON the viewport's top, which is the head of the track.
  // Not scrollIntoView: html carries scroll-padding-top: 5.5rem for the fixed
  // header and scrollIntoView honours it, which would leave the pinned stage
  // hanging 88px down with the last row of the panel below the fold.
  await page.evaluate(() => {
    const el = document.querySelector('#services');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  });
  await page.waitForSelector('#services[data-revealed="true"]', { timeout: 8000 });
  // The stack's own fade in is 700ms.
  await page.waitForTimeout(900);

  const box = await page.evaluate(() => {
    const section = document.querySelector('#services');
    const stage = document.querySelector('.crossroads-stage');
    const panel = document.querySelector('.crossroads-copy');
    const stack = document.querySelector('.crossroads-stills');
    const s = stage.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const k = stack.getBoundingClientRect();
    return {
      stage: [Math.round(s.width), Math.round(s.height)],
      panel: [Math.round(p.width), Math.round(p.height)],
      still: [Math.round(k.width), Math.round(k.height)],
      scale: (k.width / 808).toFixed(3),
      reserve: Math.round(p.right - s.left),
      pinned: section.dataset.pinned,
      viewports: (section.offsetHeight / window.innerHeight).toFixed(2),
    };
  });
  console.log(
    `${viewport.name}: section ${box.viewports} viewports, pinned ${box.pinned}, stage ${box.stage.join('x')}, ` +
      `panel ${box.panel.join('x')}, reserve ${box.reserve}px, free ${box.stage[0] - box.reserve}px, ` +
      `still ${box.still.join('x')} at ${box.scale}`,
  );

  for (const [i, name] of SHOTS.entries()) {
    if (name === 'junction') {
      await page.mouse.move(5, 5);
    } else {
      await page.hover(`#services li[data-key="${name}"] a`);
    }
    // The crossfade is 500ms and the label fade 200ms. Shorter and every
    // screenshot catches the section mid-change and reads as a fault.
    await page.waitForTimeout(800);

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
      return {
        still: document.querySelector('#services').dataset.still,
        focus: document.querySelector('#services li[data-focus="true"]')?.dataset.key ?? '-',
        marks: shown.map((m) => `${m.n}@${Math.round(m.r.left)},${Math.round(m.r.top)}`),
        clashes,
      };
    });
    const file = `shots/${viewport.name}-${String(i).padStart(2, '0')}-${name}.png`;
    // The VIEWPORT, not the section element. Pinned, the section is two and a
    // half viewports of which one and a half is the track's runway, so a shot
    // of the element is mostly empty ink and shows nothing a reader ever sees
    // at once.
    await page.screenshot({ path: file });
    console.log(
      `  ${name.padEnd(9)} still ${seen.still.padEnd(9)} focus ${seen.focus.padEnd(9)} ` +
        `${seen.marks.join('  ') || '(no labels)'}` +
        (seen.clashes.length ? `   <-- LABELS OVERLAP ${seen.clashes.join(' ')}` : ''),
    );
  }
  await page.close();
}
await browser.close();
