/**
 * Times the flight through the crossroads on this machine's graphics card and
 * prints what every frame cost.
 *
 * The same measurement as tests/e2e/crossroads-flight.spec.ts, without the
 * assertion. The spec is the gate and fails a build; this is the thing you run
 * while changing a shader, a post pass or a pose, to see the number move
 * before deciding whether the change was worth it.
 *
 *     npm run build
 *     python3 -m http.server 4173 --bind 127.0.0.1 --directory out &
 *     node tools/fps.mjs
 *
 * Headed, and that is the whole reason this cannot be a quiet background job:
 * headless Chromium has no graphics card and draws WebGL through SwiftShader
 * on the processor, where this same flight comes back at a mean gap of
 * 517.5ms. A window opens on the display, flies the track twice and closes.
 * Measured on this laptop at 1440x900 (Intel Core Ultra 9 288V, Mesa 25.2, a
 * 119.92Hz panel, so a vsync every 8.34ms): a mean gap of 8.3ms at a device
 * pixel ratio of 1 and 12.1ms at 2, which is the panel's own interval and
 * about one and a half of it.
 *
 * FPS_BASE picks the server, FPS_LANG the language, `--dpr 1` or `--dpr 2`
 * one of the two runs instead of both.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.FPS_BASE ?? 'http://127.0.0.1:4173';
const LANG = process.env.FPS_LANG ?? 'de';

/** The frame the spec's gate is written at: a laptop, the width the pin floor starts at. */
const VIEWPORT = { width: 1440, height: 900 };

/**
 * A band, as a percentage of the viewport's height.
 *
 * BAND_SVH in src/components/crossroads/track.ts, and globals.css writes the
 * same 30 down again in the `.crossroads-track` height because CSS cannot read
 * a constant either. This is the third copy, for the same reason: a script
 * cannot import the TypeScript the page is built from. If the track's band
 * ever changes, all three move together.
 */
const BAND_SVH = 30;

/** How many stops the flight walks past the map. WAYS in track.ts. */
const WAYS = 4;

/** One scroll step per animation frame, which is what a trackpad flick produces. */
const STEPS = 150;

/** How long the sampler runs on after the last step, to catch the glide and the settle. */
const SETTLE_MS = 2000;

const dprArg = process.argv.indexOf('--dpr');
const RATIOS = dprArg === -1 ? [1, 2] : [Number(process.argv[dprArg + 1])];

const browser = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

for (const dpr of RATIOS) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: dpr });
  await page.goto(`${BASE}/${LANG}/`);
  await page.waitForSelector('#services canvas.crossroads-canvas[data-ready="true"]', {
    timeout: 30000,
  });
  // The section's top ON the viewport's top, which is the head of the track.
  // Not scrollIntoView: html carries scroll-padding-top: 5.5rem for the fixed
  // header and scrollIntoView honours it, so the track would already be
  // started and the flight would be measured from somewhere down it.
  await page.evaluate(() => {
    const el = document.querySelector('#services');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  });
  await page.waitForSelector('#services[data-revealed="true"]', { timeout: 20000 });
  await page.waitForSelector('#services[data-parked="true"]', { timeout: 20000 });

  const renderer = await page.evaluate(() => {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!gl) return 'no WebGL context';
    // The driver's own name, which is how a SwiftShader run gives itself away.
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });

  /**
   * A requestAnimationFrame loop that records the gap since the previous tick
   * and then moves the scroll on by one step.
   *
   * A tick's timestamp is the moment the browser began composing that frame,
   * so the gap between two of them is the interval the display actually
   * achieved. A frame the browser could not finish in time produces no tick of
   * its own and widens the next gap, which is how a dropped frame should count.
   *
   * Only the ticks the scene drew in are kept: scene.ts parks the loop the
   * moment nothing is moving and publishes its frame count as data-frames, so
   * a tick where the count did not move is a tick the scene sat out, and
   * counting those would measure an idle browser and call it speed.
   *
   * The snap comes off for the ride. globals.css puts `scroll-snap-type: y
   * proximity` on the root while a pinned section is on the page, and a
   * scrollTo is a finished scroll as far as the browser is concerned, so every
   * step is snapped back to the nearest stop: measured here, the flight
   * collapsed to five distinct scroll positions against 151 with the snap off.
   * A reader's own gesture is snapped when it ends and not while it happens,
   * so the continuous positions are the ones a reader actually rides through.
   */
  const flight = await page.evaluate(
    ({ steps, settleMs, bandSvh, ways }) => {
      const el = document.querySelector('#services');
      const root = document.documentElement;
      const snap = root.style.scrollSnapType;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const band = (window.innerHeight * bandSvh) / 100;
      const countOf = () => Number(el.dataset.frames ?? 0);
      return new Promise((resolve) => {
        const drawn = [];
        let ticks = 0;
        let step = 0;
        let previous = 0;
        let count = countOf();
        let stopAt = 0;
        root.style.scrollSnapType = 'none';
        const tick = () => {
          const now = performance.now();
          // The first tick has no previous frame to be a gap from: the sampler
          // was installed part-way through one.
          if (previous !== 0) {
            ticks += 1;
            const seen = countOf();
            if (seen > count) drawn.push(now - previous);
            count = seen;
          }
          previous = now;
          if (step < steps) {
            step += 1;
            window.scrollTo({ top: top + (band * ways * step) / steps, behavior: 'instant' });
            requestAnimationFrame(tick);
            return;
          }
          if (stopAt === 0) stopAt = now + settleMs;
          if (now < stopAt) {
            requestAnimationFrame(tick);
            return;
          }
          // The last step lands on the last stop, which is a snap point, so
          // putting the snap back moves nothing.
          root.style.scrollSnapType = snap;
          resolve({ drawn, ticks, frames: countOf() });
        };
        requestAnimationFrame(tick);
      });
    },
    { steps: STEPS, settleMs: SETTLE_MS, bandSvh: BAND_SVH, ways: WAYS },
  );

  const sorted = [...flight.drawn].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? 0;
  const mean = flight.drawn.reduce((sum, d) => sum + d, 0) / (flight.drawn.length || 1);
  console.log(
    `DPR ${dpr}: mean ${mean.toFixed(1)}ms, p95 ${at(0.95).toFixed(1)}ms, ` +
      `max ${(sorted[sorted.length - 1] ?? 0).toFixed(1)}ms, ` +
      `${flight.drawn.length} drawn of ${flight.ticks} frames, scene counted ${flight.frames}`,
  );
  console.log(`  stop ${await page.getAttribute('#services', 'data-stop')}, renderer ${renderer}`);
  await page.close();
}
await browser.close();
