import { expect, test, type Page } from '@playwright/test';

const section = '#services';
const stills = `${section} img.crossroads-still`;
const shown = `${stills}[data-on="true"]`;

/**
 * Scrolls the section's top to the viewport's top and waits for the reveal.
 *
 * window.scrollTo rather than scrollIntoView, because html carries
 * scroll-padding-top: 5.5rem for the fixed header and scrollIntoView honours
 * it: the section would land 88px down, which is the junction plus a bit and
 * not the top of the track. 'instant', because globals.css sets
 * scroll-behavior: smooth and a smooth scroll leaves the observer watching the
 * hero for a while.
 */
async function arrive(page: Page) {
  await expect(page.locator(shown)).toBeAttached();
  await page.evaluate(() => {
    const el = document.querySelector('#services');
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY,
        behavior: 'instant',
      });
  });
  await expect(page.locator(section)).toHaveAttribute('data-revealed', 'true', { timeout: 6000 });
}

/** The crossfade is 500ms and the label fade 200ms. Long enough for both. */
const FADE = 800;

const row = (key: string) => `${section} li[data-key="${key}"] a`;
const mark = (page: Page, i: number) =>
  page.locator(`${section} .crossroads-mark`).nth(i).locator('.crossroads-mark-box');
const KEYS = ['website', 'app', 'capacity', 'care'] as const;

/** Every width the stills mount at, from the floor to a big desktop. */
const SIZES = [
  { width: 1024, height: 736 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

/**
 * Leaves the rows and the chips without leaving the page.
 *
 * The stage is the whole section, so a pointer at the top left corner is still
 * inside it; what it is outside is the list and every chip, and both of those
 * hand the aim back on the way out.
 */
async function leaveStage(page: Page) {
  await page.mouse.move(10, 10);
}

test.describe('the four ways are readable however the visitor arrives', () => {
  test('with stills', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
    // Five renders in the page, one showing, and at rest it is the junction.
    await expect(page.locator(stills)).toHaveCount(5);
    await expect(page.locator(shown)).toHaveCount(1);
    await expect(page.locator(shown)).toHaveAttribute('data-key', 'junction');
    await expect(page.locator(section)).toHaveAttribute('data-still', 'junction');
  });

  test('with reduced motion, which is no longer a refusal', async ({ page }) => {
    // It used to be one: the scene answered a reduced-motion request by not
    // mounting, because the answer to "do not move things" is not to move
    // them. Nothing moves now. The crossfade between two stills is inside a
    // prefers-reduced-motion: no-preference block, so this reader gets a cut,
    // and getting the world at all is strictly more than the price board.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
    await expect(page.locator(stills)).toHaveCount(5);
  });

  test('on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(stills)).toHaveCount(0);
    await expect(page.locator(`${section} li[data-key="care"]`)).toContainText('90');
    // A phone gets a picture, and it gets the UPRIGHT CROP.
    //
    // It used to get nothing: the poster is a 1600px strip, at 327px wide it is
    // about 105px tall, and at that size nothing in it is identifiable, so it
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
  // stills, and wide enough for the strip to be a picture, so the strip.
  test('on a narrow laptop, too narrow for the panel and the world', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(stills)).toHaveCount(0);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
    const poster = page.locator(`${section} img`);
    await expect(poster).toBeVisible();
    await expect(poster).toHaveJSProperty(
      'currentSrc',
      `${new URL('/crossroads.webp', page.url()).href}`,
    );
    await expect(poster).toHaveAttribute('alt', /vier Wege/);
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

test('the view follows the pointer, and the keyboard is the same input', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  await page.hover(row('app'));
  await expect(page.locator(section)).toHaveAttribute('data-still', 'app');
  await expect(page.locator(shown)).toHaveAttribute('data-key', 'app');
  await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute('data-focus', 'true');
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(1);
  await expect(mark(page, 1)).toHaveAttribute('data-focus', 'true');

  // Sweeping to another row hands over without a gap.
  await page.hover(row('care'));
  await expect(page.locator(section)).toHaveAttribute('data-still', 'care');
  await expect(page.locator(`${section} li[data-key="care"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );
  await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute(
    'data-focus',
    'false',
  );

  // Leaving the list returns to the junction, because at the top of the track
  // the junction is what the scroll is on.
  await leaveStage(page);
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(0);
  await expect(page.locator(section)).toHaveAttribute('data-still', 'junction');

  // Keyboard: focus a row, tab to the next, tab out.
  await page.locator(row('capacity')).focus();
  await expect(page.locator(section)).toHaveAttribute('data-still', 'capacity');
  await expect(page.locator(`${section} li[data-key="capacity"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );
  await page.keyboard.press('Tab');
  await expect(page.locator(section)).toHaveAttribute('data-still', 'care');
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

test('the chips on the junction are live', async ({ page }) => {
  // The thing four objects on one picture finally makes possible: the name
  // standing at the object IS the row. Pointing at it lights the row and the
  // chip, and clicking it opens the same card the row opens.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  await mark(page, 1).hover();
  await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute('data-focus', 'true');
  await expect(mark(page, 1)).toHaveAttribute('data-focus', 'true');
  // And the picture stays where it was. A chip that crossfaded to its own
  // close-up moved itself out from under the pointer that touched it, which
  // is a control that leaves rather than a control.
  await expect(page.locator(section)).toHaveAttribute('data-still', 'junction');
  await expect(page.locator(shown)).toHaveAttribute('data-key', 'junction');

  await mark(page, 1).click();
  await expect(page).toHaveURL(/\/de\/leistungen\/#app$/);
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
  await leaveStage(page);
  await page.waitForTimeout(FADE);
  expect(errors).toEqual([]);
});

/** Which labels are showing, and whether any of them collide or stray. */
async function labels(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.crossroads-stage')!.getBoundingClientRect();
    const panel = document.querySelector('.crossroads-copy')!.getBoundingClientRect();
    const shownMarks = [...document.querySelectorAll<HTMLElement>('.crossroads-mark')]
      .map((el, i) => ({ n: i, el }))
      .filter(({ el }) => el.dataset.on === 'true')
      .map(({ n, el }) => ({ n, r: el.firstElementChild!.getBoundingClientRect() }));
    const clashes: string[] = [];
    for (let a = 0; a < shownMarks.length; a += 1) {
      for (let b = a + 1; b < shownMarks.length; b += 1) {
        const one = shownMarks[a]!.r;
        const two = shownMarks[b]!.r;
        const over =
          Math.max(0, Math.min(one.right, two.right) - Math.max(one.left, two.left)) *
          Math.max(0, Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top));
        if (over > 0) clashes.push(`${shownMarks[a]!.n} and ${shownMarks[b]!.n}`);
      }
    }
    return {
      on: shownMarks.map((m) => m.n),
      clashes,
      // A label under the panel is a label nobody can read, and the layout is
      // supposed to have already refused to show it.
      hidden: shownMarks.filter((m) => m.r.left < panel.right).length,
      outside: shownMarks.filter((m) => m.r.right > stage.right || m.r.top < stage.top).length,
    };
  });
}

test('every object is named at itself, and no two names collide', async ({ page }) => {
  // The bond a list beside a picture could not make: at the junction all four
  // objects are on screen and none of them used to be named.
  //
  // Overlap is the failure this device actually has. At 1440x900 the anchors
  // for 01 and 02 are 172 screen pixels apart and the two chips are 208 and
  // 245 wide, so they sat on top of each other until the placement started
  // lifting a chip clear of its neighbour. Asserted here rather than against
  // the anchors, because a label's width is a font metric and needs a browser.
  for (const size of SIZES) {
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
      await page.waitForTimeout(FADE);
      const seen = await labels(page);
      expect(seen.clashes, `labels overlap at ${key} on ${size.width}`).toEqual([]);
      expect(seen.hidden, `a label is behind the panel at ${key}`).toBe(0);
      expect(seen.outside, `a label is off the stage at ${key}`).toBe(0);
      expect(seen.on, `wrong labels at ${key} on ${size.width}`).toEqual([i]);
    }
    await leaveStage(page);
  }
});

test('the name at the object is read once, not twice', async ({ page }) => {
  // The label layer is aria-hidden, so a screen reader hears each of the four
  // names from its row and nowhere else, and a crawler indexes it once. That
  // is the whole of what "no floating names" was protecting.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(shown)).toBeAttached();

  await expect(page.locator(`${section} .crossroads-marks`)).toHaveAttribute('aria-hidden', 'true');
  // Once in the accessible tree, whatever the labels are drawing.
  await expect(
    page.getByRole('heading', { name: 'Website & Landingpage', exact: true }),
  ).toHaveCount(1);
});

test('the stills are hidden until the section is looked at', async ({ page }) => {
  // The reveal is tied to the stage coming into view, not to the mount, which
  // happens four viewports before the reader arrives.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(shown)).toBeAttached();
  await page.waitForTimeout(400);
  await expect(page.locator(section)).toHaveAttribute('data-revealed', 'false');
  const hidden = await page
    .locator(`${section} .crossroads-stills`)
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(hidden, 'the world is already there before the reader arrives').toBe('0');

  await arrive(page);
  await expect(page.locator(section)).toHaveAttribute('data-revealed', 'true');
});

test('under the pin height the section is its own height and costs no scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 640 });
  await page.goto('/de/');
  await expect(page.locator(shown)).toBeAttached();
  await expect(page.locator(section)).toHaveAttribute('data-pinned', 'false');
  const seen = await page.evaluate(() => {
    const sec = document.querySelector('#services') as HTMLElement;
    const stage = document.querySelector('.crossroads-stage') as HTMLElement;
    return {
      height: sec.offsetHeight / window.innerHeight,
      position: getComputedStyle(stage).position,
      stops: document.querySelectorAll('#services .crossroads-stop').length,
    };
  });
  // Measured: the section is 972px here, which is 1.52 of this short viewport
  // and the height of the panel plus its padding. Pinned it would be 2.5
  // viewports of track, so the bound is what tells the two apart.
  expect(seen.height, 'the section is a track rather than its own height').toBeLessThan(2);
  expect(seen.position).not.toBe('sticky');
  expect(seen.stops).toBe(0);
});

test('pinned, the track walks the four routes, a hover overrides, and the end releases', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);
  await expect(page.locator(section)).toHaveAttribute('data-pinned', 'true');
  await expect(page.locator(`${section} .crossroads-stop`)).toHaveCount(5);

  // The panel stands under the header capsule and inside the viewport, which
  // is what the pinned paddings and the PIN floor are for. The first build
  // parked the panel at 16px with the fixed capsule sitting on its eyebrow for
  // the whole ride: 5.5rem is the clearance the root already uses for anchors,
  // and the floor is the panel plus that plus the padding under it.
  const panel = await page.evaluate(() => {
    const box = document.querySelector('.crossroads-copy')!.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, height: box.height };
  });
  expect(panel.top, 'the panel is under the fixed header capsule').toBeGreaterThanOrEqual(88);
  expect(panel.bottom, 'the panel runs past the bottom of the pinned stage').toBeLessThanOrEqual(
    900,
  );

  const top = await page.evaluate(() => {
    const sec = document.querySelector('#services') as HTMLElement;
    return sec.getBoundingClientRect().top + window.scrollY;
  });
  const band = 900 * 0.3;
  const stageTop = () =>
    page.evaluate(() => document.querySelector('.crossroads-stage')!.getBoundingClientRect().top);

  // The junction, then each stop in turn: the row lights, the still changes
  // and the stage holds. The two pixels are the snap's: the section's top is a
  // fractional page offset and a scroll position is a whole pixel, so an exact
  // boundary is the one place the answer is ambiguous.
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(0);
  await expect(page.locator(section)).toHaveAttribute('data-still', 'junction');
  for (const [i, key] of KEYS.entries()) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      Math.ceil(top) + (i + 1) * band + 2,
    );
    await expect(page.locator(`${section} li[data-key="${key}"]`)).toHaveAttribute(
      'data-focus',
      'true',
    );
    await expect(page.locator(section)).toHaveAttribute('data-still', key);
    expect(Math.abs(await stageTop()), `the stage moved at stop ${i + 1}`).toBeLessThan(2);
  }

  // A hover overrides the track, and letting go returns to the track's row.
  await page.hover(row('website'));
  await expect(page.locator(`${section} li[data-key="website"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );
  await leaveStage(page);
  await expect(page.locator(`${section} li[data-key="care"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );

  // Past the last stop the track runs out and the stage scrolls away.
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: 'instant' }),
    Math.ceil(top) + 6 * band,
  );
  expect(await stageTop(), 'the stage did not release').toBeLessThan(-100);
});

for (const lang of ['de', 'en'] as const) {
  test(`${lang}: every row names its own service`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${lang}/`);
    await arrive(page);

    // The junction's four chips, in THIS language. A chip's width is a font
    // metric, so the lift that separates 01 and 02 is a different sum in each
    // one: measured at 1440, the four are 208, 245, 183 and 170 pixels wide in
    // German and 208, 208, 199 and 223 in English. Both need the lift and only
    // German was ever checked for a clash.
    const named = await labels(page);
    expect(named.on, `wrong labels at the junction in ${lang}`).toEqual([0, 1, 2, 3]);
    expect(named.clashes, `labels overlap at the junction in ${lang}`).toEqual([]);
    expect(named.hidden, `a label is behind the panel in ${lang}`).toBe(0);
    expect(named.outside, `a label is off the stage in ${lang}`).toBe(0);

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
      await expect(page.locator(section)).toHaveAttribute('data-still', key);
    }
  });
}
