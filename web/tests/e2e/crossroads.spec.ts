import { expect, test, type Page } from '@playwright/test';

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
const canvas = `${section} canvas[data-scene="kc-crossroads"]`;

/**
 * Scrolls the section into view and waits for the reveal to finish.
 *
 * The scene boots when the component mounts and builds its four objects when
 * the section first comes into view, so a test that wants to see the finished
 * place has to arrive at it. 'instant', because globals.css sets
 * scroll-behavior: smooth on html and a smooth scroll leaves the observer
 * watching the hero for a while.
 */
async function arrive(page: Page) {
  await expect(page.locator(canvas)).toBeAttached();
  await page.evaluate(() => {
    document.querySelector('#services')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  await expect(page.locator(section)).toHaveAttribute('data-built', '4', { timeout: 6000 });
}

/** The glide is 720ms and the label fade 200ms. Long enough for both. */
const GLIDE = 1000;

const row = (key: string) => `${section} li[data-key="${key}"] a`;
const KEYS = ['website', 'app', 'capacity', 'care'] as const;

test.describe('the four ways are readable however the visitor arrives', () => {
  test('with a scene', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(canvas)).toBeAttached();
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
    // A phone gets a picture, and it gets the UPRIGHT CROP.
    //
    // It used to get nothing: the poster is a 1600px strip, at 327px wide it is
    // about 100px tall, and at that size nothing in it is identifiable, so it
    // was hidden below `sm` and the section had no image at all on the device
    // most visitors use. The upright crop is the same render cut down to the
    // landing page and the dashboard, at about three times that width. The
    // currentSrc assertion is the load-bearing half: <picture> chooses the file
    // and `src` on the <img> would report the fallback whichever one won.
    const poster = page.locator(`${section} img`);
    await expect(poster).toBeVisible();
    await expect(poster).toHaveJSProperty(
      'currentSrc',
      `${new URL('/crossroads-phone.webp', page.url()).href}`,
    );
    // Two crops, two alts: this one shows two of the four ways and must not
    // claim four.
    await expect(poster).toHaveAttribute('alt', /Zwei der vier Wege/);
  });

  // 800 wide is too narrow for the panel to stand beside the world, so no
  // scene, and wide enough for the strip to be a picture, so the strip.
  test('on a narrow laptop, too narrow for the panel and the world', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} canvas`)).toHaveCount(0);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
    const poster = page.locator(`${section} img`);
    await expect(poster).toBeVisible();
    await expect(poster).toHaveJSProperty(
      'currentSrc',
      `${new URL('/crossroads.webp', page.url()).href}`,
    );
    await expect(poster).toHaveAttribute('alt', /vier Wege/);
  });

  // The most common Windows laptop viewport. It used to get the fallback,
  // because the section was a stage fixed at 100svh and the panel did not fit
  // in 640px. The section is its own height now and there is nothing to fit.
  test('on a short laptop, which used to be excluded', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 640 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(canvas)).toBeAttached();
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
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
  // The dimming rule was once unscoped, and in the fallback every row carries
  // data-focus="false", so the whole price board was served at 0.55 alpha to
  // exactly the visitors the fallback exists for. check_contrast.py cannot see
  // an opacity.
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');

  const rows = page.locator(`${section} li[data-key]`);
  await expect(rows).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    const opacity = await rows.nth(i).evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity, `row ${i} is dimmed in the fallback`).toBe('1');
  }
});

test('the section is not pinned and costs the reader no scroll', async ({ page }) => {
  // The whole of the change. It was a 300svh track with a sticky stage: three
  // viewports of scrolling to read what fits on one.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(canvas)).toBeAttached();
  const seen = await page.evaluate(() => {
    const sec = document.querySelector('#services') as HTMLElement;
    const stage = document.querySelector('.crossroads-stage') as HTMLElement;
    return {
      height: sec.offsetHeight / window.innerHeight,
      position: getComputedStyle(stage).position,
      sticky: document.querySelectorAll('#services [style*="sticky"], #services .crossroads-track')
        .length,
    };
  });
  expect(seen.height, 'the section is taller than a viewport and a half').toBeLessThan(1.5);
  expect(seen.position).not.toBe('sticky');
  expect(seen.sticky).toBe(0);
});

test('every row is a link to its own card, with every detail open', async ({ page }) => {
  // Four objects, four services, four detail pages, and nothing used to be
  // clickable. And the enhanced state showed one detail at a time where the
  // phone showed all four: a laptop got less than a phone.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
  for (const key of KEYS) {
    await expect(page.locator(row(key))).toHaveAttribute('href', `/de/leistungen/#${key}`);
    await expect(
      page.locator(`${section} li[data-key="${key}"] .crossroads-way-detail`),
    ).toBeVisible();
  }
  // And the price the reader came for is on the second screen, not the fourth.
  const top = await page
    .locator(section)
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(top, 'the prices start more than two viewports down').toBeLessThan(900 * 2);
});

test('the camera follows the pointer, and the keyboard is the same input', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  const mark = (i: number) =>
    page.locator(`${section} .crossroads-mark`).nth(i).locator('.crossroads-mark-box');

  await page.hover(row('app'));
  await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute('data-focus', 'true');
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(1);
  await expect(mark(1)).toHaveAttribute('data-focus', 'true');

  // Sweeping to another row hands over without a gap.
  await page.hover(row('care'));
  await expect(page.locator(`${section} li[data-key="care"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );
  await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute(
    'data-focus',
    'false',
  );

  // Leaving the list returns to the junction.
  await page.mouse.move(10, 10);
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(0);

  // Keyboard: focus a row, tab to the next, tab out.
  await page.locator(row('capacity')).focus();
  await expect(page.locator(`${section} li[data-key="capacity"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );
  await page.keyboard.press('Tab');
  await expect(page.locator(`${section} li[data-key="care"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );
  await expect(page.locator(`${section} li[data-key="capacity"]`)).toHaveAttribute(
    'data-focus',
    'false',
  );
  await page.keyboard.press('Tab');
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(0);
});

test('hovering and leaving the section reports no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);
  for (const key of KEYS) {
    await page.hover(row(key));
    await page.waitForTimeout(120);
  }
  await page.mouse.move(10, 10);
  await page.waitForTimeout(GLIDE);
  expect(errors).toEqual([]);
});

test('the canvas is the whole stage and swallows no input', async ({ page }) => {
  // Full bleed, which is the answer to „3D in a box". The canvas was 640x796
  // inside a 1425x900 stage, 40% of the section, with the section's own aurora
  // and grain either side of a hard rectangle: a video embedded in a slide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(canvas)).toBeAttached();

  const seen = await page.evaluate(() => {
    const stage = document.querySelector('.crossroads-stage') as HTMLElement;
    const c = document.querySelector('.crossroads-stage canvas') as HTMLCanvasElement;
    const s = stage.getBoundingClientRect();
    const r = c.getBoundingClientRect();
    return {
      gapW: Math.round(s.width - r.width),
      gapH: Math.round(s.height - r.height),
      pointer: getComputedStyle(c).pointerEvents,
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

/** Which labels are showing, and whether any of them collide or stray. */
async function labels(page: Page) {
  return page.evaluate(() => {
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
      on: shown.map((m) => m.n),
      clashes,
      // A label under the panel is a label nobody can read, and the scene
      // is supposed to have already refused to show it.
      hidden: shown.filter((m) => m.r.left < panel.right).length,
      outside: shown.filter((m) => m.r.right > stage.right || m.r.top < stage.top).length,
    };
  });
}

test('every object is named at itself, and no two names collide', async ({ page }) => {
  // The bond a list beside a canvas could not make: in the establishing shot
  // all four objects were on screen and none of them was named.
  //
  // Overlap is the failure this device actually has. The four labels stand
  // about 195px apart at the wide shot and „01 Website & Landingpage" is
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
    await arrive(page);
    await page.waitForTimeout(300);

    // The junction names all four, which is the whole point of it.
    const idle = await labels(page);
    expect(idle.clashes, `labels overlap at the junction on ${size.width}`).toEqual([]);
    expect(idle.hidden, `a label is behind the panel at the junction on ${size.width}`).toBe(0);
    expect(idle.outside, `a label is off the stage at the junction on ${size.width}`).toBe(0);
    expect(idle.on, `wrong labels at the junction on ${size.width}`).toEqual([0, 1, 2, 3]);

    // A close-up names the one it is standing at and hides the rest.
    for (const [i, key] of KEYS.entries()) {
      await page.hover(row(key));
      await page.waitForTimeout(GLIDE);
      const seen = await labels(page);
      expect(seen.clashes, `labels overlap at ${key} on ${size.width}`).toEqual([]);
      expect(seen.hidden, `a label is behind the panel at ${key}`).toBe(0);
      expect(seen.outside, `a label is off the stage at ${key}`).toBe(0);
      expect(seen.on, `wrong labels at ${key} on ${size.width}`).toEqual([i]);
    }
    await page.mouse.move(10, 10);
  }
});

test('the name at the object is read once, not twice', async ({ page }) => {
  // The label layer is aria-hidden, so a screen reader hears each of the four
  // names from its row and nowhere else, and a crawler indexes it once. That
  // is the whole of what „no floating names" was protecting.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(canvas)).toBeAttached();

  await expect(page.locator(`${section} .crossroads-marks`)).toHaveAttribute('aria-hidden', 'true');
  // Once in the accessible tree, whatever the labels are drawing.
  await expect(
    page.getByRole('heading', { name: 'Website & Landingpage', exact: true }),
  ).toHaveCount(1);
});

test('the four are drawings until the section is looked at, then they build', async ({ page }) => {
  // The reveal is tied to the section coming into view, not to the boot,
  // which can happen four viewports before the reader arrives, and not to a
  // scroll position, which is the coupling this section no longer has.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(canvas)).toBeAttached();
  await page.waitForTimeout(400);
  await expect(page.locator(section)).toHaveAttribute('data-built', '0');
  await arrive(page);
  await expect(page.locator(section)).toHaveAttribute('data-built', '4');
});

test('a still page costs no frames, and a hover still gets them', async ({ page }) => {
  // The loop runs exactly as long as something is moving. After the reveal
  // and between hovers the page costs no frames at all, which is the only
  // permanent cost this section could impose on a page whose pitch is that
  // it costs the visitor nothing.
  //
  // Every rAF on the page is counted, not just the scene's, because that is
  // the number that matters and because a minified callback cannot be told
  // apart from another one.
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
  await arrive(page);
  await page.waitForTimeout(GLIDE);

  const count = () => page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  const before = await count();
  await page.waitForTimeout(1000);
  expect((await count()) - before, 'the loop is still running with nothing to draw').toBeLessThan(
    5,
  );

  // Parked is only correct if it restarts. The canvas is captured before and
  // after a hover, so identical pixels mean aim() reached a loop that never
  // woke up.
  const idle = await page.locator(`${section} canvas`).screenshot();
  await page.hover(row('capacity'));
  await page.waitForTimeout(GLIDE);
  const aimed = await page.locator(`${section} canvas`).screenshot();
  expect(aimed.equals(idle), 'a parked loop did not restart on aim()').toBe(false);

  // And stop() has to work from either state. Crossing below the mount query
  // fires the scene's own resize listener, which asks for a frame, and flips
  // data-enhanced, which tears the scene down: a cancel with a frame pending.
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
  await page.waitForTimeout(300);
  expect(errors, 'tearing down a scene with a frame pending threw').toEqual([]);
});

for (const lang of ['de', 'en'] as const) {
  test(`${lang}: every row names its own service`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${lang}/`);
    await arrive(page);
    // The same four keys in the same order in both languages, because the
    // component sorts by ORDER before anything reads the ways. en.ts lists
    // them differently and this is the test that says so on purpose.
    for (const [i, key] of KEYS.entries()) {
      await expect(page.locator(`${section} li[data-key]`).nth(i)).toHaveAttribute('data-key', key);
      await page.hover(row(key));
      await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveAttribute(
        'data-key',
        key,
      );
    }
  });
}
