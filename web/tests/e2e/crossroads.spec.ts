import { expect, test, type Page } from '@playwright/test';

/**
 * Scroll progress at which the camera is standing at way `i`.
 *
 * The same expression scene.ts uses. It spent a day mapped through an
 * APPROACH_END, because „Die Ausgangslage" was pinned in front of the four
 * ways; that section is back on paper above this one and the crossroads has
 * the whole track again, so the four are where they were before any of it.
 */
const wayAt = (i: number) => 0.18 + i * 0.19;

/** Makes every WebGL context request fail, the way a locked-down browser does. */
async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return (real as unknown as (...a: unknown[]) => unknown).apply(this, [type, ...rest]);
    } as typeof real;
  });
}

const section = '#services';

test.describe('the four ways are readable however the visitor arrives', () => {
  test('with a scene', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
  });

  test('with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} canvas`)).toHaveCount(0);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
  });

  test('without WebGL', async ({ page }) => {
    await withoutWebGL(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} canvas`)).toHaveCount(0);
  });

  test('on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} canvas`)).toHaveCount(0);
    await expect(page.locator(`${section} li[data-key="care"]`)).toContainText('90');
  });

  // 800 wide clears the old 46rem gate and fails the new one. Between the two
  // the scene used to boot into a single-column stack inside a stage fixed at
  // 100svh with overflow hidden, and the copy was cut off with nothing to
  // scroll to it.
  test('on a narrow laptop, too narrow for two columns', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} canvas`)).toHaveCount(0);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
  });

  // Wide enough and too short: a 1366x768 laptop has roughly 640px of viewport
  // and the price board is taller than that. The grid centres it, so the stage
  // clipped it at both ends. Width alone never said anything about this.
  test('on a short laptop, wide enough but not tall enough', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 640 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} canvas`)).toHaveCount(0);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
  });

  test('with JavaScript switched off entirely', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} li[data-key="website"]`)).toContainText('2.500');
    await context.close();
  });
});

test('the fallback is not a dimmed copy of the enhanced state', async ({ page }) => {
  // Two regressions in one place, both invisible to every other gate here.
  // The dimming rule was unscoped, and in the fallback every row carries
  // data-focus="false", so the whole price board was served at 0.55 alpha to
  // exactly the visitors the fallback exists for. check_contrast.py cannot see
  // an opacity. The grid was also left at two columns with the view column
  // display:none, so the copy sat in the 1fr track with the 26rem one empty
  // beside it.
  await page.setViewportSize({ width: 1440, height: 640 });
  await page.goto('/de/');
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');

  const rows = page.locator(`${section} li[data-key]`);
  await expect(rows).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    const opacity = await rows.nth(i).evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity, `row ${i} is dimmed in the fallback`).toBe('1');
  }

  const columns = await page
    .locator(`${section} .crossroads-layout`)
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns, 'the fallback grid still has an empty column').toBe(1);
});

test('the stage never paints outside its own section', async ({ page }) => {
  // The bug in the first 3D attempt: a sticky pane with a negative bottom
  // margin overhanging its container by a full viewport, drawn over whatever
  // section came next. Invisible to every other check in this repo.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');

  for (const fraction of [0, 0.25, 0.5, 0.75, 1, 1.15]) {
    await page.evaluate((f) => {
      const el = document.querySelector('#services') as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      // 'instant', because globals.css sets scroll-behavior: smooth on html.
      // A plain scrollTo animates, and 60ms of it covers a few hundred pixels
      // of a five thousand pixel jump: every measurement below was taken with
      // the page still near the top, where a stage that overhangs by half a
      // viewport measures the same as one that does not.
      window.scrollTo({ top: top + el.offsetHeight * f - window.innerHeight, behavior: 'instant' });
    }, fraction);
    await page.waitForTimeout(60);

    const overhang = await page.evaluate(() => {
      const sec = document.querySelector('#services')!.getBoundingClientRect();
      const stage = document.querySelector('.crossroads-stage')!.getBoundingClientRect();
      return { below: stage.bottom - sec.bottom, above: sec.top - stage.top };
    });
    expect(overhang.below, `overhangs below at ${fraction}`).toBeLessThanOrEqual(1);
    expect(overhang.above, `overhangs above at ${fraction}`).toBeLessThanOrEqual(1);
  }
});

test('scrolling the section reports no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  for (let f = 0; f <= 1.05; f += 0.1) {
    await page.evaluate((frac) => {
      const el = document.querySelector('#services') as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      // Instant for the same reason as the overhang walk above: a smooth
      // scroll would leave this test watching the hero for two seconds.
      window.scrollTo({
        top: top + el.offsetHeight * frac - window.innerHeight,
        behavior: 'instant',
      });
    }, f);
    await page.waitForTimeout(40);
  }
  expect(errors).toEqual([]);
});

/** Puts the section at a given progress, inverting progressOf. */
async function scrollToProgress(page: Page, p: number) {
  // Wait for the scene to actually be up before measuring anything. Until
  // data-enhanced flips, [data-enhanced='false'] collapses the track to auto
  // height and the section is exactly one stage tall, so the travel is zero
  // and every progress computes to the junction. Measured too early this
  // reported 1064 and 1064 and scrolled to p=0 whatever it was asked for.
  // The marker is set immediately before boot(), so it also means there is a
  // handle listening for the scroll that follows.
  await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();

  await page.evaluate((prog) => {
    const el = document.querySelector('#services') as HTMLElement;
    const stage = document.querySelector('.crossroads-stage') as HTMLElement;
    const top = el.getBoundingClientRect().top + window.scrollY;
    // 'instant', for the same reason as the two walks above: globals.css sets
    // scroll-behavior: smooth on html, and the two-argument scrollTo honours
    // it. Measured, the animated form was 2px down the page after 90ms of a
    // 4830px jump, so every assertion below was taken at the junction with
    // nothing built and no way in focus.
    window.scrollTo({
      top: top + prog * (el.offsetHeight - stage.clientHeight),
      behavior: 'instant',
    });
  }, p);
  await page.waitForTimeout(90);
}

/** Every camera stop, so a fit assertion covers the open detail as well as the closed board. */
const STOPS = [0, wayAt(0), wayAt(1), wayAt(2), wayAt(3), 1];

test('the copy panel fits its stage at the smallest viewport that mounts', async ({ page }) => {
  // It did not, and for a long time the answer was that it scrolled. Measured
  // before the board was cut down: four rows of number, name, audience,
  // caption and price came to 1097px against a stage that is 632px tall here,
  // so the column carried its own overflow-y with its scrollbar hidden, the
  // wheel drove the page for most of the section and the column for part of
  // it, and the camera nudged the focused row into view on arrival. Four
  // locally reasonable decisions, and together the one thing on the page that
  // behaved unpredictably under a wheel.
  //
  // 1024x736 is the floor the mount predicate allows, so it is where this is
  // tightest, and the detail that opens on the focused row is why every stop
  // is walked rather than just the junction: the panel is 498px with nothing
  // open and 618px at way 02, against 648px of room.
  await page.setViewportSize({ width: 1024, height: 736 });
  await page.goto('/de/');
  await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();

  for (const p of STOPS) {
    await scrollToProgress(page, p);
    // The detail's own 320ms open, which is what makes the panel its tallest.
    await page.waitForTimeout(360);
    const fit = await page.evaluate(() => {
      const stage = document.querySelector('.crossroads-stage') as HTMLElement;
      const panel = document.querySelector('.crossroads-copy') as HTMLElement;
      const view = document.querySelector('.crossroads-view') as HTMLElement;
      const canvas = document.querySelector('.crossroads-stage canvas') as HTMLCanvasElement;
      const s = stage.getBoundingClientRect();
      const c = panel.getBoundingClientRect();
      return {
        below: Math.round(c.bottom - s.bottom),
        above: Math.round(s.top - c.top),
        canvasOverflow: Math.round(canvas.height - view.getBoundingClientRect().height),
        scrolls: panel.scrollHeight > panel.clientHeight,
      };
    });
    expect(fit.below, `the panel overhangs the stage at ${p}`).toBeLessThanOrEqual(0);
    expect(fit.above, `the panel overhangs the stage at ${p}`).toBeLessThanOrEqual(0);
    expect(fit.canvasOverflow, 'the canvas is sized by something other than its box').toBeLessThanOrEqual(1); // prettier-ignore
    // The other half of the same fix. A panel that fits has nothing to scroll,
    // and a panel that scrolls is the thing this section was criticised for.
    expect(fit.scrolls, `the panel scrolls at ${p}`).toBe(false);
  }
});

test('the canvas is the whole stage and swallows no input', async ({ page }) => {
  // Full bleed, which is the answer to „3D in a box". The canvas was 640x796
  // inside a 1425x900 stage, 40% of the section, with the section's own aurora
  // and grain either side of a hard rectangle: a video embedded in a slide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();

  const seen = await page.evaluate(() => {
    const stage = document.querySelector('.crossroads-stage') as HTMLElement;
    const canvas = document.querySelector('.crossroads-stage canvas') as HTMLCanvasElement;
    const s = stage.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    return {
      gapW: Math.round(s.width - c.width),
      gapH: Math.round(s.height - c.height),
      pointer: getComputedStyle(canvas).pointerEvents,
      aurora: document.querySelectorAll('#services .ink-aurora').length,
    };
  });
  expect(seen.gapW, 'the canvas does not fill the stage').toBe(0);
  expect(seen.gapH, 'the canvas does not fill the stage').toBe(0);
  // aria-hidden and nothing listening, so it should not be taking events either.
  expect(seen.pointer, 'the canvas is still swallowing pointer events').toBe('none');
  // The wash belongs to the fallback. Over a full-bleed scene it is the thing
  // that made two different darks meet at a rectangle edge.
  expect(seen.aurora, 'the aurora is still painted over the scene').toBe(0);
});

test('every object is named at itself, and no two names collide', async ({ page }) => {
  // The bond a list beside a canvas could not make: in the establishing shot
  // all four objects were on screen and none of them was named.
  //
  // Overlap is the failure this device actually has. The four labels stand
  // about 195px apart at the wide shots and „01 Website & Landingpage" is
  // 205px wide, so ways 01 and 02 sat on top of each other until LANES grew a
  // per-lane screen offset. Asserted here rather than in the framing suite
  // because a label's width is a font metric, which needs a browser.
  for (const size of [
    { width: 1024, height: 736 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/de/');
    await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();

    for (const p of STOPS) {
      await scrollToProgress(page, p);
      await page.waitForTimeout(240);
      const seen = await page.evaluate(() => {
        const stage = document.querySelector('.crossroads-stage')!.getBoundingClientRect();
        const panel = document.querySelector('.crossroads-copy')!.getBoundingClientRect();
        const shown = [...document.querySelectorAll<HTMLElement>('.crossroads-mark')]
          .map((el, i) => ({ n: i, el }))
          .filter(({ el }) => el.dataset.on === 'true')
          .map(({ n, el }) => ({ n, r: el.firstElementChild!.getBoundingClientRect() }));
        const clashes: string[] = [];
        for (let a = 0; a < shown.length; a += 1) {
          for (let b = a + 1; b < shown.length; b += 1) {
            const one = shown[a]!.r;
            const two = shown[b]!.r;
            const over =
              Math.max(0, Math.min(one.right, two.right) - Math.max(one.left, two.left)) *
              Math.max(0, Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top));
            if (over > 0) clashes.push(`${shown[a]!.n} and ${shown[b]!.n}`);
          }
        }
        return {
          count: shown.length,
          clashes,
          // A label under the panel is a label nobody can read, and the scene
          // is supposed to have already refused to show it.
          hidden: shown.filter((m) => m.r.left < panel.right).length,
          outside: shown.filter((m) => m.r.right > stage.right || m.r.top < stage.top).length,
        };
      });
      expect(seen.clashes, `labels overlap at ${p} on ${size.width}x${size.height}`).toEqual([]);
      expect(seen.hidden, `a label is behind the panel at ${p}`).toBe(0);
      expect(seen.outside, `a label is off the stage at ${p}`).toBe(0);
      // The wide shots name all four, which is the whole point of them. A
      // close-up names the one it is standing at and hides the rest.
      const expected = p === 0 || p === 1 ? 4 : 1;
      expect(seen.count, `wrong number of labels at ${p}`).toBe(expected);
    }
  }
});

test('the name at the object is read once, not twice', async ({ page }) => {
  // The label layer is aria-hidden, so a screen reader hears each of the four
  // names from its row and nowhere else, and a crawler indexes it once. That
  // is the whole of what „no floating names" was protecting.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();

  await expect(page.locator(`${section} .crossroads-marks`)).toHaveAttribute('aria-hidden', 'true');
  // Once in the accessible tree, whatever the labels are drawing.
  await expect(
    page.getByRole('heading', { name: 'Website & Landingpage', exact: true }),
  ).toHaveCount(1);
});

test('the enhanced state dims the unfocused rows no further than AA allows', async ({ page }) => {
  // The mirror of the fallback assertion above, and it pins a number nothing
  // else in the repo can see. At any scroll position at most one row is
  // undimmed, so the other three are this section's steady state and they
  // carry the prices. text-ink-muted is stone.300: composited at 0.55 over the
  // ink surface it measured 3.83:1 in the light theme and 3.39:1 in the dark
  // one, against the 4.5:1 that 14px body text needs. 0.7 gives 5.33:1 and
  // 4.52:1. check_contrast.py audits token pairs and a CSS opacity is not one,
  // so this is the only gate that would notice it drifting back.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await scrollToProgress(page, wayAt(0));

  const rows = page.locator(`${section} li[data-key]`);
  await expect(rows).toHaveCount(4);
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(1);

  for (let i = 0; i < 4; i += 1) {
    const row = rows.nth(i);
    const focused = (await row.getAttribute('data-focus')) === 'true';
    // Polled rather than read once: the rows carry a 240ms opacity transition
    // whenever motion is allowed, and the row that just took focus is still
    // travelling when scrollToProgress returns.
    await expect
      .poll(() => row.evaluate((el) => Number(getComputedStyle(el).opacity)), {
        message: `row ${i} settles at the wrong opacity`,
      })
      .toBeCloseTo(focused ? 1 : 0.7, 2);
  }
});

test('jumping straight to the end leaves nothing as a drawing', async ({ page }) => {
  // The anchor-link case. Before the passed rule this reported two of four and
  // the skipped ways stayed as line drawings for the rest of the visit.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await scrollToProgress(page, 1);
  await expect(page.locator('#services')).toHaveAttribute('data-built', '4');
});

test('a still page costs no frames, and a moving one still gets them', async ({ page }) => {
  // The loop used to reschedule unconditionally, so a callback stayed alive
  // for the whole visit with the section four viewports away and nothing to
  // draw. Measured here at 60 callbacks a second before the change and 0
  // after, which is the only permanent cost this section imposed on a page
  // whose pitch is that it costs the visitor nothing.
  //
  // Every rAF on the page is counted, not just the scene's, because that is
  // the number that matters and because a minified callback cannot be told
  // apart from another one. The component's own scroll handler uses rAF too,
  // and it schedules nothing while nobody scrolls.
  await page.addInitScript(() => {
    const w = window as unknown as { __raf: number };
    w.__raf = 0;
    const real = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      real((t) => {
        w.__raf += 1;
        cb(t);
      });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await scrollToProgress(page, wayAt(0));
  await page.waitForTimeout(400);

  const count = () => page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  const before = await count();
  await page.waitForTimeout(1000);
  expect((await count()) - before, 'the loop is still running with nothing to draw').toBeLessThan(
    5,
  );

  // Parked is only correct if it restarts. The canvas is captured at two stops
  // that frame different objects, so identical pixels mean set() reached a
  // loop that never woke up.
  const atFirst = await page.locator(`${section} canvas`).screenshot();
  await scrollToProgress(page, wayAt(2));
  await page.waitForTimeout(200);
  const atThird = await page.locator(`${section} canvas`).screenshot();
  expect(atThird.equals(atFirst), 'a parked loop did not restart on set()').toBe(false);

  // And stop() has to work from either state. Crossing below the mount query
  // fires the scene's own resize listener, which asks for a frame, and flips
  // data-enhanced, which tears the scene down: a cancel with a frame pending.
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
  await page.waitForTimeout(300);
  expect(errors, 'tearing down a scene with a frame pending threw').toEqual([]);
});

for (const lang of ['de', 'en'] as const) {
  test(`${lang}: every stop names its own service`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${lang}/`);
    const stops: [number, string][] = [
      [wayAt(0), 'website'],
      [wayAt(1), 'app'],
      [wayAt(2), 'capacity'],
      [wayAt(3), 'care'],
    ];
    // The same four keys in the same order in both languages, because the
    // component sorts by ORDER before anything reads the ways. en.ts lists
    // them differently and this is the test that says so on purpose.
    for (const [p, key] of stops) {
      await scrollToProgress(page, p);
      await expect(page.locator('#services li[data-focus="true"]')).toHaveAttribute(
        'data-key',
        key,
      );
    }
  });
}
