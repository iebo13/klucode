import { expect, test, type Page } from '@playwright/test';

import { BAND_SVH, WAYS } from '../../src/components/crossroads/track';

/**
 * The one performance assertion in the suite: the flight holds 60 fps on the
 * machine this site is built on.
 *
 * It is a separate file, and separate from the `chromium` project, because it
 * needs a browser the rest of the suite must not have. Headless Chromium has
 * no GPU: it draws WebGL through SwiftShader on the processor, and this same
 * flight measured there comes back at a mean gap of 517.5ms against 8.3ms
 * headed on this laptop's Intel Lunar Lake through Mesa, so a headless
 * assertion would measure the processor and call it a graphics card. The
 * measurement therefore runs headed, on the display, opted in with
 * CROSSROADS_GPU=1, and never in CI, where there is no display to open a
 * window on. playwright.e2e.config.ts is where that opt-in lives.
 *
 * What it measured on the machine the spec names (Intel Core Ultra 9 288V,
 * Mesa 25.2, a 119.92Hz panel, so a vsync every 8.34ms), over three runs:
 * at a device pixel ratio of 1, a mean gap of 8.3 to 8.4ms, a 95th percentile
 * of 8.7 to 9.2ms and a worst frame of 10.9 to 12.7ms, which is the panel's
 * own interval and no misses at all; at a ratio of 2, a mean of 12.1ms, a
 * 95th percentile of 13.8ms and a worst frame of 21.7 to 30.2ms, which is
 * about every third vsync missed and still 83 frames a second.
 *
 * Nothing is imported from crossroads.spec.ts, and the arrival helpers below
 * are that file's in miniature rather than a shared module. Importing a spec
 * file into a spec file registers its tests a second time, so the 47 browser
 * tests would run again here, headed, at four minutes a piece.
 */

const section = '#services';
const canvas = `${section} canvas.crossroads-canvas`;

/** The frame the spec's gate is written at: a laptop, the width the pin floor starts at. */
const VIEWPORT = { width: 1440, height: 900 };

/**
 * How many animation frames the flight is walked in.
 *
 * One scroll step per frame, so the browser is asked for the same work a
 * reader's wheel asks for and no more: a step per frame is what a trackpad
 * flick produces, and jumping the whole track in ten steps would measure ten
 * frames of catching up rather than the ride. 150 steps over four bands is
 * 7.2 CSS pixels a step at 900px tall, which is two and a half seconds of
 * flight at 60Hz and enough samples for a 95th percentile to mean something.
 */
const STEPS = 150;

/**
 * How long the sampler keeps running after the last scroll step.
 *
 * The camera is still moving when the scrolling stops: journey.ts glides for
 * GLIDE_MS and then settles, and those frames are part of the flight a reader
 * sees. Two seconds covers the glide and the settle with room to spare, and
 * the frames after the loop parks cost nothing because they are dropped: only
 * the ticks the scene actually drew in are counted.
 */
const SETTLE_MS = 2000;

type Flight = {
  /** The gap to the previous animation frame, in ms, for every frame the scene drew in. */
  drawn: number[];
  /** Every animation frame the sampler saw, drawn in or not. */
  ticks: number;
  /** What the scene's own counter reached, which is the browser suite's window into the loop. */
  frames: number;
};

/** The `renderer` string the driver reports, which is how a SwiftShader run gives itself away. */
async function rendererOf(page: Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!gl) return 'no WebGL context';
    // WEBGL_debug_renderer_info is the only way to the driver's own name. It
    // is gated behind a permission in some browsers and absent in others, so
    // the unmasked string is asked for first and the plain one is the fallback.
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });
}

/**
 * Scrolls the section's top to the viewport's top and waits for the scene to
 * be up, revealed and still.
 *
 * window.scrollTo rather than scrollIntoView, because html carries
 * scroll-padding-top: 5.5rem for the fixed header and scrollIntoView honours
 * it, which would leave the section 88px down and the track already started.
 */
async function arrive(page: Page) {
  await expect(page.locator(section)).toHaveAttribute('data-world', 'live', { timeout: 15000 });
  await expect(page.locator(canvas)).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await page.evaluate(() => {
    const el = document.querySelector('#services');
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY,
        behavior: 'instant',
      });
  });
  await expect(page.locator(section)).toHaveAttribute('data-revealed', 'true', { timeout: 15000 });
  await expect(page.locator(section)).toHaveAttribute('data-parked', 'true', { timeout: 15000 });
}

/**
 * Flies the track and hands back what every frame cost.
 *
 * The sampler is a requestAnimationFrame loop that does two things per tick:
 * it records the gap since the previous tick, and it moves the scroll on by
 * one step. That order is what makes the numbers mean something. A tick's
 * timestamp is the moment the browser began composing that frame, so the gap
 * between two of them is the interval the display actually achieved, which is
 * what 60 fps is a claim about. A frame the browser could not finish in time
 * does not produce a tick of its own; it widens the next gap, which is exactly
 * how a dropped frame should be counted.
 *
 * Only the ticks the scene drew in are kept. scene.ts runs an invalidate-driven
 * loop that parks the moment nothing is moving, and it publishes its frame
 * count to the section as data-frames on every drawn frame, so a tick where
 * the count did not move is a tick the scene sat out. Counting those would
 * measure an idle browser and report it as speed.
 *
 * The snap comes off for the ride, and without that line this measures the
 * wrong thing entirely. globals.css puts `scroll-snap-type: y proximity` on
 * the root while a pinned section is on the page, and a scrollTo is a
 * finished scroll as far as the browser is concerned, so every one of the 150
 * steps is snapped straight back to the nearest stop: measured here, the whole
 * flight collapsed to five distinct scroll positions and 45 drawn frames,
 * against 151 positions and 155 frames with the snap off. A reader's own
 * gesture is not snapped while it is happening, only when it ends, so the
 * continuous positions ARE what a reader scrolls through, and turning the snap
 * off for the duration is how a script reproduces them. It goes back on before
 * the assertions, so the section is in its shipped state when it is read.
 */
async function fly(page: Page): Promise<Flight> {
  return page.evaluate(
    ({ steps, settleMs, bandSvh, ways }) => {
      const el = document.querySelector<HTMLElement>('#services');
      if (!el) throw new Error('the services section is not in the page');
      const root = document.documentElement;
      const snap = root.style.scrollSnapType;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const band = (window.innerHeight * bandSvh) / 100;
      const countOf = () => Number(el.dataset.frames ?? 0);

      return new Promise<Flight>((resolve) => {
        const drawn: number[] = [];
        let ticks = 0;
        let step = 0;
        let previous = 0;
        let count = countOf();
        let stopAt = 0;
        root.style.scrollSnapType = 'none';

        const tick = () => {
          const now = performance.now();
          // The first tick has no previous frame to be a gap from: the
          // sampler was installed part-way through a frame, so that interval
          // is an artefact of when evaluate() ran and not of the scene.
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
          // The last step lands exactly on the last stop, which is a snap
          // point, so putting the snap back moves nothing.
          root.style.scrollSnapType = snap;
          resolve({ drawn, ticks, frames: countOf() });
        };
        requestAnimationFrame(tick);
      });
    },
    { steps: STEPS, settleMs: SETTLE_MS, bandSvh: BAND_SVH, ways: WAYS },
  );
}

/** Mean, 95th percentile and worst of a set of frame gaps, in milliseconds. */
function summarise(deltas: number[]) {
  const sorted = [...deltas].sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? 0;
  return {
    mean: deltas.reduce((sum, d) => sum + d, 0) / deltas.length,
    p95: at(0.95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

/**
 * Runs one measurement and prints it.
 *
 * Printing is not decoration. The gate is a pair of thresholds, and a number
 * that sits just under one of them is a different piece of news from a number
 * at half of it, so the run says what it measured whether it passes or fails
 * and the pull request carries the figures.
 */
async function measure(page: Page, label: string): Promise<ReturnType<typeof summarise>> {
  await page.goto('/de/');
  await arrive(page);
  const renderer = await rendererOf(page);
  const flight = await fly(page);

  // A scene that never drew would hand back an empty set, and an empty set
  // has a mean of NaN, which no comparison rejects. These two are what stop
  // the gate passing on a page that did nothing: the flight has to have drawn
  // most of the frames it was walked in, and it has to have arrived.
  expect(
    flight.drawn.length,
    `the scene drew in too few of the ${flight.ticks} frames`,
  ).toBeGreaterThan(STEPS / 2);
  await expect(page.locator(section)).toHaveAttribute('data-stop', 'care');

  const stats = summarise(flight.drawn);
  console.log(
    `${label}: mean ${stats.mean.toFixed(1)}ms, p95 ${stats.p95.toFixed(1)}ms, ` +
      `max ${stats.max.toFixed(1)}ms, ${flight.drawn.length} drawn of ${flight.ticks} frames, ` +
      `scene counted ${flight.frames}\n  renderer: ${renderer}`,
  );
  return stats;
}

/**
 * The gate, at the pixel ratio a plain laptop screen has.
 *
 * 17.5ms for the mean and 25ms for the 95th percentile. A 60Hz frame is
 * 16.67ms, so the mean carries under a millisecond of slack and the
 * percentile allows one frame in twenty to be a doubled one: a browser that
 * misses a vsync once during a two and a half second flight is not something
 * a reader can see, and a browser that misses one in ten is.
 *
 * A measurement of frame GAPS cannot report anything below the display's own
 * interval, and this laptop's panel runs at 119.92Hz, which is 8.34ms. So the
 * numbers here have twice the headroom the thresholds suggest, and a run on a
 * 60Hz screen would sit against the 16.67ms floor with almost none: if this
 * ever moves to such a machine, the mean is the wrong statistic there and the
 * share of gaps over one interval is the right one.
 */
test.describe('the flight at a device pixel ratio of 1', () => {
  test.use({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  test('holds 60 fps from the map to the last stop', async ({ page }) => {
    const stats = await measure(page, 'DPR 1');
    expect(stats.mean, 'the mean frame took longer than 17.5ms').toBeLessThan(17.5);
    expect(stats.p95, 'the 95th percentile frame took longer than 25ms').toBeLessThan(25);
  });
});

/**
 * The same flight on a retina screen, which is the measurement the pixel
 * ratio cap in scene.ts rests on.
 *
 * The spec's gate is 1440x900 at 1x and this is not it, which is why the
 * threshold here is looser: at a device pixel ratio of 2 the renderer draws
 * at the cap of 1.5 and assets.ts fetches the 2x lightmaps, so this run is
 * the retina case exactly as it ships, and 25ms is a frame rate a reader
 * still reads as motion rather than as stepping. Measured at 12.1ms, which is
 * half the threshold, so the cap of 1.5 stays where it is. If this ever
 * fails, the fix is the cap and not the threshold: lower what boot() passes
 * to setPixelRatio, leave RETINA at 1.5 for the texture choice, and write
 * both measurements into the comment there.
 */
test.describe('the flight at a device pixel ratio of 2', () => {
  test.use({ viewport: VIEWPORT, deviceScaleFactor: 2 });

  test('stays inside the frame budget with the 2x textures up', async ({ page }) => {
    const stats = await measure(page, 'DPR 2');
    expect(stats.mean, 'the mean frame took longer than 25ms').toBeLessThan(25);
  });
});
