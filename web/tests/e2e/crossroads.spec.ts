import { expect, test, type Page } from '@playwright/test';

const section = '#services';
const canvas = `${section} canvas.crossroads-canvas`;
const stills = `${section} img.crossroads-still`;
const shown = `${stills}[data-on="true"]`;

const row = (key: string) => `${section} li[data-key="${key}"] a`;
const mark = (page: Page, i: number) =>
  page.locator(`${section} .crossroads-mark`).nth(i).locator('.crossroads-mark-box');
const KEYS = ['website', 'app', 'capacity', 'care'] as const;

/** Every width a world mounts at, from the floor to a big desktop. */
const SIZES = [
  { width: 1024, height: 736 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

/** The stills' crossfade is 500ms and the label fade 200ms. Long enough for both. */
const FADE = 800;

/**
 * Playwright's 30 seconds is the stills suite's budget, and it is not this
 * one's.
 *
 * Headless Chromium has no GPU: it draws WebGL through SwiftShader on the CPU,
 * and every pass the composer runs is a full frame of software rasterisation.
 * Measured here at 1440x900, one frame costs about 250ms, a boot (four glTF
 * bodies, five textures, a studio bake and the first frame) about 5 seconds,
 * and a glide three or four frames. The label test walks five stops at three
 * viewports with a boot at each, which is a couple of minutes of honest work
 * and nothing to do with a hang.
 *
 * Raised for every test in the file rather than for the slow ones, because a
 * timeout is a bound on a hang and not a performance assertion, and the ones
 * that finish in a second still finish in a second. What frame rate the scene
 * actually reaches is measured on a real GPU by Task 6's timing test.
 */
test.beforeEach(() => {
  test.setTimeout(150_000);
});

/**
 * Turns WebGL off for a page, before any of its own script runs.
 *
 * The August route, and it is a route rather than a browser flag because the
 * component's question is exactly this one: `canvas.getContext('webgl')`
 * answering null is what a browser with the renderer disabled looks like from
 * inside a page, and it is what the stills world exists for. Every other
 * context type is handed back untouched, because the poster and the label
 * measurements still want 2d.
 */
async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext;
    function refuseWebGL(this: HTMLCanvasElement, type: string, options?: unknown) {
      if (type.toLowerCase().includes('webgl')) return null;
      return real.call(this, type as '2d', options as CanvasRenderingContext2DSettings);
    }
    HTMLCanvasElement.prototype.getContext =
      refuseWebGL as typeof HTMLCanvasElement.prototype.getContext;
  });
}

/** Which world this page decided on. Waits for the decision, which is a client effect. */
async function worldOf(page: Page): Promise<'live' | 'stills'> {
  await expect(page.locator(section)).toHaveAttribute('data-world', /^(live|stills)$/, {
    timeout: 15000,
  });
  return (await page.locator(section).getAttribute('data-world')) === 'live' ? 'live' : 'stills';
}

/**
 * How long the render loop has to be quiet before a move counts as over.
 *
 * A single reading of data-parked is not enough, and the reason is worth
 * writing down because it looks like a flake and is not. A pointer moving onto
 * a row draws a frame of its own before React has committed anything: the
 * stage's pointermove tells the scene the hand has gone to the panel, the
 * scene draws one frame and parks. So for a few milliseconds after a hover the
 * section says parked with the PREVIOUS row's camera, and a test that reads
 * there reads the shot before the one it asked for. Measured on this machine:
 * that frame lands about 20ms after the hover and the aim's first frame about
 * 15ms after it.
 *
 * 300ms, against a frame that costs about 250ms here (headless Chromium draws
 * through SwiftShader) and a requestAnimationFrame that is scheduled within
 * 16ms of the aim. So a loop that is still parked 300ms later has nothing
 * pending, and one that is mid-glide has drawn in between and moved the count.
 */
const QUIET = 300;

/**
 * Waits until the scene has stopped moving, and returns at once in the stills
 * world, which has no loop to park.
 */
async function settled(page: Page) {
  const state = () =>
    page.locator(section).evaluate((el) => ({
      parked: el.dataset.parked ?? 'absent',
      frames: Number(el.dataset.frames ?? -1),
    }));
  if ((await state()).parked === 'absent') return;
  await expect
    .poll(
      async () => {
        const before = await state();
        if (before.parked !== 'true') return false;
        await page.waitForTimeout(QUIET);
        const after = await state();
        return after.parked === 'true' && after.frames === before.frames;
      },
      { timeout: 15000, message: 'the render loop never stopped moving' },
    )
    .toBe(true);
}

/**
 * Scrolls the section's top to the viewport's top and waits for the world to
 * be up, revealed and still.
 *
 * window.scrollTo rather than scrollIntoView, because html carries
 * scroll-padding-top: 5.5rem for the fixed header and scrollIntoView honours
 * it: the section would land 88px down, which is the junction plus a bit and
 * not the top of the track. 'instant', because globals.css sets
 * scroll-behavior: smooth and a smooth scroll leaves the observer watching the
 * hero for a while.
 *
 * The 15 second waits are the live world's. Headless Chromium draws WebGL
 * through SwiftShader on the CPU, which is real rendering and slow rendering:
 * a frame at 1440x900 costs about a third of a second here, and the place is
 * four glTF bodies, five textures and a studio bake before the first one.
 */
async function arrive(page: Page) {
  if ((await worldOf(page)) === 'live') {
    await expect(page.locator(canvas)).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  } else {
    await expect(page.locator(shown)).toBeAttached();
  }
  await page.evaluate(() => {
    const el = document.querySelector('#services');
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY,
        behavior: 'instant',
      });
  });
  await expect(page.locator(section)).toHaveAttribute('data-revealed', 'true', { timeout: 15000 });
  await settled(page);
}

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
  test('with the live scene', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
    await expect(page.locator(section)).toHaveAttribute('data-world', 'live');
    await arrive(page);
    // One canvas, marked as this scene's, and no still anywhere in the page:
    // the two worlds are alternatives and never both mounted.
    await expect(page.locator(canvas)).toHaveAttribute('data-scene', 'kc-crossroads');
    await expect(page.locator(stills)).toHaveCount(0);
    // At rest at the top of the track the camera is on the map, and the map is
    // where all four objects are on screen and all four are named.
    await expect(page.locator(section)).toHaveAttribute('data-stop', 'junction');
    await expect(page.locator(`${section} .crossroads-mark[data-on="true"]`)).toHaveCount(4);
  });

  test('with stills, where the browser cannot make a WebGL context', async ({ page }) => {
    await withoutWebGL(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
    await expect(page.locator(section)).toHaveAttribute('data-world', 'stills');
    await expect(page.locator(canvas)).toHaveCount(0);
    // Five renders in the page, one showing, and at rest it is the junction.
    await expect(page.locator(stills)).toHaveCount(5);
    await expect(page.locator(shown)).toHaveCount(1);
    await expect(page.locator(shown)).toHaveAttribute('data-key', 'junction');
    await expect(page.locator(section)).toHaveAttribute('data-stop', 'junction');
  });

  test('with a scene that will not load, which hands the section to the stills', async ({
    page,
  }) => {
    // The one path scene.ts cannot be asked about from node: boot() reaches a
    // real WebGLRenderer before it awaits the place, so the failure has to be
    // provoked in a browser. Aborting one body is the honest version of a 404,
    // a dropped connection or a texture that will not decode, and what the
    // reader must get out of it is the stills, silently.
    const warnings: string[] = [];
    const thrown: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'warning') warnings.push(m.text());
    });
    page.on('pageerror', (e) => thrown.push(String(e)));
    await page.route('**/crossroads/scene/website.glb', (route) => route.abort());
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');

    await expect(page.locator(section)).toHaveAttribute('data-world', 'stills', { timeout: 20000 });
    await expect(page.locator(shown)).toHaveCount(1);
    await expect(page.locator(canvas)).toHaveCount(0);
    await expect
      .poll(
        () => warnings.filter((w) => w.startsWith('crossroads: the scene did not start')).length,
        { timeout: 10000, message: 'the failed boot said nothing to the console' },
      )
      .toBeGreaterThan(0);
    // A failure that reaches a visitor as a stack trace is a failure twice.
    expect(thrown, 'the failed boot threw at the page').toEqual([]);
  });

  test('with reduced motion, which is no longer a refusal', async ({ page }) => {
    // It used to be one: the August scene answered a reduced-motion request by
    // not mounting, because the answer to "do not move things" is not to move
    // them. The scene answers it by standing still instead. It cuts between
    // stops rather than gliding, the stage does not lean under the hand and no
    // pool of light follows it, so this reader gets the same place as everyone
    // else and none of the travel.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'true');
    await expect(page.locator(section)).toHaveAttribute('data-reduced', 'true');
    await expect(page.locator(section)).toHaveAttribute('data-world', 'live');
    await arrive(page);
    await expect(page.locator(`${section} .crossroads-mark[data-on="true"]`)).toHaveCount(4);
  });

  test('on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(stills)).toHaveCount(0);
    await expect(page.locator(canvas)).toHaveCount(0);
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
  // world, and wide enough for the strip to be a picture, so the strip.
  test('on a narrow laptop, too narrow for the panel and the world', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(stills)).toHaveCount(0);
    await expect(page.locator(canvas)).toHaveCount(0);
    await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
    // No world at all, so the attribute that names one is not written.
    expect(await page.getAttribute(section, 'data-world')).toBeNull();
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

/**
 * The same body against both worlds, because it is the same contract.
 *
 * A row under the pointer or holding keyboard focus aims the picture at its
 * way, letting go hands it back to the track, and every step of it is written
 * in attributes rather than in pixels: which is what makes it the same test
 * whether the picture is a camera or a crossfade.
 */
for (const noWebGL of [false, true]) {
  test(`the view follows the pointer, and the keyboard is the same input (${noWebGL ? 'stills' : 'live'})`, async ({
    page,
  }) => {
    if (noWebGL) await withoutWebGL(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/de/');
    await arrive(page);

    await page.hover(row('app'));
    await expect(page.locator(section)).toHaveAttribute('data-stop', 'app');
    await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute(
      'data-focus',
      'true',
    );
    await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(1);
    await expect(mark(page, 1)).toHaveAttribute('data-focus', 'true');
    await settled(page);
    if (noWebGL) await expect(page.locator(shown)).toHaveAttribute('data-key', 'app');

    // Sweeping to another row hands over without a gap.
    await page.hover(row('care'));
    await expect(page.locator(section)).toHaveAttribute('data-stop', 'care');
    await expect(page.locator(`${section} li[data-key="care"]`)).toHaveAttribute(
      'data-focus',
      'true',
    );
    await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute(
      'data-focus',
      'false',
    );
    await settled(page);

    // Leaving the list returns to the junction, because at the top of the track
    // the junction is what the scroll is on.
    await leaveStage(page);
    await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(0);
    await expect(page.locator(section)).toHaveAttribute('data-stop', 'junction');
    await settled(page);

    // Keyboard: focus a row, tab to the next, tab out.
    await page.locator(row('capacity')).focus();
    await expect(page.locator(section)).toHaveAttribute('data-stop', 'capacity');
    await expect(page.locator(`${section} li[data-key="capacity"]`)).toHaveAttribute(
      'data-focus',
      'true',
    );
    await page.keyboard.press('Tab');
    await expect(page.locator(section)).toHaveAttribute('data-stop', 'care');
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
}

test('the chips are live, and pointing at one leaves the camera alone', async ({ page }) => {
  // The thing four objects on one picture finally makes possible: the name
  // standing at the object IS the row. Pointing at it lights the row and the
  // chip, and clicking it opens the same card the row opens.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  await mark(page, 1).hover();
  await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute('data-focus', 'true');
  await expect(mark(page, 1)).toHaveAttribute('data-focus', 'true');
  // And the camera stays where it was. A chip that flew the picture to its own
  // close-up moved itself out from under the pointer that touched it, which
  // is a control that leaves rather than a control.
  await expect(page.locator(section)).toHaveAttribute('data-stop', 'junction');
  await settled(page);
  await expect(page.locator(section)).toHaveAttribute('data-stop', 'junction');

  await mark(page, 1).click();
  await expect(page).toHaveURL(/\/de\/leistungen\/#app$/);
});

test('the objects are live, and are the same weak input as the chips', async ({ page }) => {
  // The half of the bond only a real scene has: the thing itself, under the
  // pointer, answering. The camera is asked what is at (x, y) and the row it
  // names lights, exactly as a chip's does.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  // Down from the chip's anchor in 10px steps until the stage says there is
  // something under the hand. The anchor is where the label's own transform
  // puts it, which is the point on the object the render chose, so the object
  // is a short way below it: measured at the three widths, the hit is between
  // 0 and 40px down. Walked rather than assumed, because the exact pixel is
  // the camera's business and moves with a pose.
  const anchor = await page.locator(`${section} .crossroads-mark`).nth(1).boundingBox();
  expect(anchor, 'the app chip has no box to walk down from').not.toBeNull();
  let found = -1;
  for (let step = 0; step <= 30 && found < 0; step += 1) {
    await page.mouse.move(anchor!.x, anchor!.y + step * 10);
    if ((await page.getAttribute(`${section} .crossroads-stage`, 'data-hit')) === 'true') {
      found = step * 10;
    }
  }
  expect(found, 'no object was found under the pointer below the app chip').toBeGreaterThanOrEqual(
    0,
  );

  await expect(page.locator(`${section} li[data-key="app"]`)).toHaveAttribute('data-focus', 'true');
  // The camera is left alone, on the same ruling the chips are: a reader
  // exploring the place with the pointer must be able to look at a thing
  // without being flown somewhere by having brushed it.
  await expect(page.locator(section)).toHaveAttribute('data-stop', 'junction');

  await page.mouse.down();
  await page.mouse.up();
  await expect(page).toHaveURL(/\/de\/leistungen\/#app$/);
});

test('a reduced-motion switch mid-visit boots a scene that knows where the last one stood', async ({
  page,
}) => {
  // The one thing that tears the place down and builds it again inside a
  // visit: `reduced` is a boot option, so a reader changing their system
  // setting gets a second scene. What must not happen is the section snapping
  // back to the map, which is what a second boot resolving into an unchanged
  // `ready` did: React drops a state set to the value it holds, the effects
  // keyed on it never run, and the new camera stands where it booted.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  await page.hover(row('capacity'));
  await expect(page.locator(section)).toHaveAttribute('data-stop', 'capacity');
  await settled(page);
  // Where the chip for 03 stands with the camera at that stand. This is the
  // assertion that has teeth: the chip's position is the new camera's own
  // projection of the object's anchor, so it can only match if the second
  // scene was told to aim at capacity.
  const before = await page.locator(`${section} .crossroads-mark`).nth(2).boundingBox();
  expect(before, 'the capacity chip has no box before the switch').not.toBeNull();
  const frames = await page.locator(section).evaluate((el) => Number(el.dataset.frames ?? -1));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator(section)).toHaveAttribute('data-reduced', 'true');
  // The old loop is gone: its counter went with it, which is also how we know
  // the cleanup ran and data-ready is the next boot's rather than the last's.
  await expect
    .poll(async () => page.locator(section).evaluate((el) => Number(el.dataset.frames ?? -1)), {
      timeout: 15000,
      message: 'the scene was never torn down',
    })
    .toBeLessThan(frames);

  await expect(page.locator(canvas)).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await settled(page);
  await expect(page.locator(section)).toHaveAttribute('data-parked', 'true');
  await expect(page.locator(section)).toHaveAttribute('data-stop', 'capacity');

  // One chip, the right one, and standing where it stood: the second scene
  // arrived at the stand rather than at the map.
  await expect(page.locator(`${section} .crossroads-mark[data-on="true"]`)).toHaveCount(1);
  await expect(page.locator(`${section} .crossroads-mark`).nth(2)).toHaveAttribute(
    'data-on',
    'true',
  );
  const after = await page.locator(`${section} .crossroads-mark`).nth(2).boundingBox();
  expect(after, 'the capacity chip has no box after the switch').not.toBeNull();
  // Four pixels, because the two shots are the same pose reached two ways: the
  // first glided to it and the second cut to it, and reduced motion holds the
  // parallax at rest where the first had eased it to rest. At the map this
  // chip stands about 290px to the right and 300px lower, so the bound is not
  // close to being able to confuse the two.
  expect(Math.abs(after!.x - before!.x), 'the second scene framed a different shot').toBeLessThan(
    4,
  );
  expect(Math.abs(after!.y - before!.y), 'the second scene framed a different shot').toBeLessThan(
    4,
  );
});

test('a reduced-motion flip while the scene is loading builds one scene, not two', async ({
  page,
}) => {
  // The other half of the same switch, and the window is between the dynamic
  // import going out and boot() being called. A flip inside it tears the
  // effect down while the two chunks are still on the wire, so the run that
  // is already dead reaches its .then holding `boot` and calls it anyway, and
  // boot() makes a WebGLRenderer and bakes the studio before its first await.
  // Two renderers on one canvas share the one GL context and keep two state
  // caches of it, and both draw until the dead one is stopped. React's
  // StrictMode does exactly this on every dev mount (reactStrictMode is on in
  // next.config.mjs), and a `reduced` flip during a load does it in the build
  // that ships, which is what this drives.
  //
  // The window is a couple of hundred milliseconds on this machine, which is
  // not something a test can aim at, so it is widened rather than raced: every
  // script chunk the page asks for is held for a second before it is served,
  // which puts a whole second between the canvas mounting and the scene module
  // landing. The flip goes out as soon as the canvas is attached.
  await page.route('**/_next/static/chunks/**', async (route) => {
    await new Promise((served) => setTimeout(served, 1000));
    await route.continue();
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // Two counters, installed before any of the page's own script runs. The
  // first counts the boots that STARTED: a WebGLRenderer asks the canvas it
  // was handed for a context as its first act, so one context on this canvas
  // is one boot. The shell's own capability probe is not counted, because it
  // asks a detached canvas of its own (hasWebGL in index.tsx). The second
  // counts the boots that FINISHED, which is what writes data-ready, and the
  // document is what the observer watches because at this point there is not
  // yet a body to hang it on.
  await page.addInitScript(() => {
    const counts = { contexts: 0, ready: 0 };
    (window as unknown as { __boots: typeof counts }).__boots = counts;
    const real = HTMLCanvasElement.prototype.getContext;
    function counted(this: HTMLCanvasElement, type: string, options?: unknown) {
      if (type.toLowerCase().includes('webgl') && this.classList.contains('crossroads-canvas')) {
        counts.contexts += 1;
      }
      return real.call(this, type as '2d', options as CanvasRenderingContext2DSettings);
    }
    HTMLCanvasElement.prototype.getContext =
      counted as typeof HTMLCanvasElement.prototype.getContext;
    new MutationObserver((records) => {
      for (const record of records) {
        const el = record.target as HTMLElement;
        if (el.classList.contains('crossroads-canvas') && el.dataset.ready === 'true') {
          counts.ready += 1;
        }
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-ready'] });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(canvas)).toBeAttached({ timeout: 30000 });
  // Before the first frame, which is the whole point: a flip after the scene
  // is up is the mid-visit switch the test above already covers.
  await expect(page.locator(canvas)).not.toHaveAttribute('data-ready', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator(section)).toHaveAttribute('data-reduced', 'true');
  await arrive(page);

  const boots = await page.evaluate(
    () => (window as unknown as { __boots: { contexts: number; ready: number } }).__boots,
  );
  expect(boots.contexts, 'two renderers were built on the one canvas').toBe(1);
  expect(boots.ready, 'more than one boot finished on the one canvas').toBe(1);

  // And the counter only ever climbs. It is written from whichever handle the
  // component is holding, so a second loop drawing into the same canvas
  // reports its own count through the same attribute and the number falls.
  const frames = () => page.locator(section).evaluate((el) => Number(el.dataset.frames ?? -1));
  let last = await frames();
  for (let i = 0; i < 8; i += 1) {
    await page.waitForTimeout(100);
    const now = await frames();
    expect(
      now,
      'the frame counter went backwards after the scene was ready',
    ).toBeGreaterThanOrEqual(last);
    last = now;
  }
  expect(errors, 'the boot threw at the page').toEqual([]);
});

test('a pointer leaving an object for the panel puts that row out', async ({ page }) => {
  // A coalesced pointer move can go from an object straight onto the copy
  // panel with no event in between. The panel branch used to return without
  // clearing the hint, so the object's row stayed lit beside the row the
  // pointer landed on and two of the four were lit at once.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  const anchor = await page.locator(`${section} .crossroads-mark`).nth(1).boundingBox();
  expect(anchor, 'the app chip has no box to walk down from').not.toBeNull();
  let found = -1;
  for (let step = 0; step <= 30 && found < 0; step += 1) {
    await page.mouse.move(anchor!.x, anchor!.y + step * 10);
    if ((await page.getAttribute(`${section} .crossroads-stage`, 'data-hit')) === 'true') {
      found = step * 10;
    }
  }
  expect(found, 'no object was found under the pointer below the app chip').toBeGreaterThanOrEqual(
    0,
  );
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(1);

  // Straight onto a row, in one move, which is the jump a real pointer makes.
  await page.hover(row('care'));
  await expect(page.locator(`${section} li[data-key="care"]`)).toHaveAttribute(
    'data-focus',
    'true',
  );
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(1);
  await expect(page.locator(`${section} .crossroads-stage`)).toHaveAttribute('data-hit', 'false');
});

test('a pointer the browser takes away puts the hand out', async ({ page }) => {
  // A finger on a wide tablet sends pointermove, and then pointercancel when
  // the browser takes the gesture over for a scroll. It never sends
  // pointerleave. Until the same handler heard both, the parallax, the cursor
  // light and whichever row the finger was over all stayed where the finger
  // had been, with no pointer left on the page to put them out.
  //
  // The cancel is dispatched rather than gestured, because Playwright's touch
  // emulation does not produce the browser's own takeover. What is asserted is
  // the section's answer to the event, and the handler does not ask where an
  // event came from.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  // Onto an object, found the way the test above finds one: down from the app
  // chip until the stage says something is under the pointer.
  const anchor = await page.locator(`${section} .crossroads-mark`).nth(1).boundingBox();
  expect(anchor, 'the app chip has no box to walk down from').not.toBeNull();
  let found = false;
  for (let step = 0; step <= 30 && !found; step += 1) {
    await page.mouse.move(anchor!.x, anchor!.y + step * 10);
    found = (await page.getAttribute(`${section} .crossroads-stage`, 'data-hit')) === 'true';
  }
  expect(found, 'no object was found under the pointer below the app chip').toBe(true);
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(1);

  await page.locator(`${section} .crossroads-stage`).dispatchEvent('pointercancel');
  await expect(page.locator(`${section} .crossroads-stage`)).toHaveAttribute('data-hit', 'false');
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
    await settled(page);
  }
  await leaveStage(page);
  await settled(page);

  // And through the track, which is the other half of what the loop does.
  const top = await page
    .locator(section)
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  for (let stop = 1; stop <= 4; stop += 1) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      Math.ceil(top) + stop * 900 * 0.3 + 2,
    );
    await settled(page);
  }
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

for (const noWebGL of [false, true]) {
  test(`every object is named at itself, and no two names collide (${noWebGL ? 'stills' : 'live'})`, async ({
    page,
  }) => {
    // The bond a list beside a picture could not make: at the map all four
    // objects are on screen and none of them used to be named.
    //
    // Overlap is the failure this device actually has. At 1440x900 the anchors
    // for 01 and 02 are about 170 screen pixels apart and the two chips are 208
    // and 245 wide, so they sat on top of each other until the placement
    // started lifting a chip clear of its neighbour. Asserted here rather than
    // against the anchors, because a label's width is a font metric and needs a
    // browser, and asserted in BOTH worlds because the two produce their
    // candidates from different places (a render's baked anchors against a live
    // projection) and hand them to the same rules.
    if (noWebGL) await withoutWebGL(page);
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await page.goto('/de/');
      await arrive(page);
      await leaveStage(page);
      await settled(page);
      if (noWebGL) await page.waitForTimeout(FADE);

      // The map names all four, which is the whole point of it.
      const idle = await labels(page);
      expect(idle.clashes, `labels overlap at the junction on ${size.width}`).toEqual([]);
      expect(idle.hidden, `a label is behind the panel at the junction on ${size.width}`).toBe(0);
      expect(idle.outside, `a label is off the stage at the junction on ${size.width}`).toBe(0);
      expect(idle.on, `wrong labels at the junction on ${size.width}`).toEqual([0, 1, 2, 3]);

      // A stop names the one it is standing at and hides the rest.
      for (const [i, key] of KEYS.entries()) {
        await page.hover(row(key));
        await expect(page.locator(section)).toHaveAttribute('data-stop', key);
        await settled(page);
        if (noWebGL) await page.waitForTimeout(FADE);
        const seen = await labels(page);
        expect(seen.clashes, `labels overlap at ${key} on ${size.width}`).toEqual([]);
        expect(seen.hidden, `a label is behind the panel at ${key} on ${size.width}`).toBe(0);
        expect(seen.outside, `a label is off the stage at ${key} on ${size.width}`).toBe(0);
        expect(seen.on, `wrong labels at ${key} on ${size.width}`).toEqual([i]);
      }
      await leaveStage(page);
    }
  });
}

test('the name at the object is read once, not twice', async ({ page }) => {
  // The label layer is aria-hidden, so a screen reader hears each of the four
  // names from its row and nowhere else, and a crawler indexes it once. That
  // is the whole of what "no floating names" was protecting.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(`${section} .crossroads-marks`)).toBeAttached();

  await expect(page.locator(`${section} .crossroads-marks`)).toHaveAttribute('aria-hidden', 'true');
  // The canvas too: everything a reader can read or click is DOM.
  await expect(page.locator(canvas)).toHaveAttribute('aria-hidden', 'true');
  // Once in the accessible tree, whatever the labels are drawing.
  await expect(
    page.getByRole('heading', { name: 'Website & Landingpage', exact: true }),
  ).toHaveCount(1);
});

test('the world is hidden until the section is looked at', async ({ page }) => {
  // The reveal is tied to the stage coming into view, not to the mount, which
  // happens four viewports before the reader arrives.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(canvas)).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.locator(section)).toHaveAttribute('data-revealed', 'false');
  const hidden = await page.locator(canvas).evaluate((el) => getComputedStyle(el).opacity);
  expect(hidden, 'the world is already there before the reader arrives').toBe('0');

  await arrive(page);
  await expect(page.locator(section)).toHaveAttribute('data-revealed', 'true');
});

test('under the pin height the section is its own height and costs no scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 640 });
  await page.goto('/de/');
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

test('the canvas is the size of the stage after the pin flips, with no second window event', async ({
  page,
}) => {
  // The stage's box changes without a window resize behind it. Crossing the
  // PIN floor is the case with teeth: globals.css makes a pinned stage 100svh
  // and an unpinned one the section's own height, and the two are hundreds of
  // pixels apart. The window listener runs during the browser's resize steps,
  // which is before the media query change React learns the flip from, so it
  // measures the stage the OLD rule was sizing and there is no second event
  // afterwards to correct it. What the reader gets is one frame's worth of
  // picture stretched over a taller box until they resize the window again.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);
  await expect(page.locator(section)).toHaveAttribute('data-pinned', 'true');

  /**
   * The drawing buffer against the box it is drawn for.
   *
   * The ratio is read off the width rather than assumed, because it is
   * whatever the renderer settled on: window.devicePixelRatio capped at
   * RETINA, 1 on this headless machine and 1.5 on a retina screen. The
   * height is then the assertion, and one pixel of slack is
   * renderer.setSize's own floor.
   */
  const sizing = () =>
    page.evaluate(() => {
      const c = document.querySelector('#services canvas.crossroads-canvas') as HTMLCanvasElement;
      const stage = document.querySelector('.crossroads-stage') as HTMLElement;
      return {
        bufferW: c.width,
        bufferH: c.height,
        boxW: stage.clientWidth,
        boxH: stage.clientHeight,
      };
    });
  const fits = (seen: Awaited<ReturnType<typeof sizing>>, where: string) => {
    const ratio = seen.bufferW / seen.boxW;
    expect(ratio, `nothing to divide: a ${seen.bufferW} buffer on a ${seen.boxW} stage ${where}`).toBeGreaterThan(0); // prettier-ignore
    expect(
      Math.abs(seen.bufferH - seen.boxH * ratio),
      `the canvas is ${seen.bufferW}x${seen.bufferH} for a ${seen.boxW}x${seen.boxH} stage ${where}`,
    ).toBeLessThanOrEqual(1);
  };

  fits(await sizing(), 'pinned');

  // 860 is under the 55rem pin floor and 1440 is over the 64rem room floor, so
  // this unpins the section and keeps the world. Measured here: the stage goes
  // from 900 tall to 976, which is the panel and the layout's own padding.
  await page.setViewportSize({ width: 1440, height: 860 });
  await expect(page.locator(section)).toHaveAttribute('data-pinned', 'false');
  await settled(page);
  const unpinned = await sizing();
  expect(unpinned.boxH, 'the unpinned stage is no taller than the viewport').toBeGreaterThan(860);
  fits(unpinned, 'unpinned');

  // And back, because the flip has to be followed in both directions: pinned
  // again the stage is a viewport tall and the canvas has to come back down.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(section)).toHaveAttribute('data-pinned', 'true');
  await settled(page);
  fits(await sizing(), 'pinned again');
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
  const frames = () => page.locator(section).evaluate((el) => Number(el.dataset.frames ?? -1));

  // The junction, then each stop in turn: the row lights, the camera flies and
  // the stage holds. The two pixels are the snap's: the section's top is a
  // fractional page offset and a scroll position is a whole pixel, so an exact
  // boundary is the one place the answer is ambiguous.
  await expect(page.locator(`${section} li[data-focus="true"]`)).toHaveCount(0);
  await expect(page.locator(section)).toHaveAttribute('data-stop', 'junction');
  const drawn = [await frames()];
  for (const [i, key] of KEYS.entries()) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      Math.ceil(top) + (i + 1) * band + 2,
    );
    await expect(page.locator(`${section} li[data-key="${key}"]`)).toHaveAttribute(
      'data-focus',
      'true',
    );
    await expect(page.locator(section)).toHaveAttribute('data-stop', key);
    await settled(page);
    expect(Math.abs(await stageTop()), `the stage moved at stop ${i + 1}`).toBeLessThan(2);
    drawn.push(await frames());
  }
  // Every stop cost the camera frames, which is what tells a flight from five
  // pictures: a crossfade would have drawn none of them.
  for (let i = 1; i < drawn.length; i += 1) {
    expect(drawn[i]!, `stop ${i} drew no frames (${drawn.join(', ')})`).toBeGreaterThan(
      drawn[i - 1]!,
    );
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

test('pinned, a scroll that ends past a stop settles back onto the stop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);
  await expect(page.locator(section)).toHaveAttribute('data-pinned', 'true');

  // Where the five stops stand, measured from the section's own top rather
  // than assumed from BAND_SVH, so this reads the same track the reader gets.
  const { top, stops } = await page.evaluate(() => {
    const sec = document.querySelector('#services') as HTMLElement;
    const secTop = sec.getBoundingClientRect().top + window.scrollY;
    return {
      top: secTop,
      stops: [...document.querySelectorAll('#services .crossroads-stop')].map(
        (el) => el.getBoundingClientRect().top + window.scrollY - secTop,
      ),
    };
  });
  expect(stops.length, 'the track has five stops').toBe(5);

  const sectionTop = () =>
    page.evaluate(() => document.querySelector('#services')!.getBoundingClientRect().top);

  /**
   * What the stops' negative scroll-margin is for, and the only thing that
   * looks at it.
   *
   * html carries scroll-padding-top: 5.5rem for the fixed header, which insets
   * the snapport by 88px, and .crossroads-stop cancels it with
   * scroll-margin-top: -5.5rem so a stop lands at the raw top instead of 88px
   * down. Landed, the section's top is exactly minus the stop's offset; drop
   * the scroll margin and it is 88px more than that, which is the pinned stage
   * hanging under the header with the panel's last row cut off.
   *
   * Two stops rather than all five: one is not enough to tell a snap from an
   * offset that happens to match, and the two chosen are a whole band apart.
   * 40px past the stop, which is inside proximity's pull at this viewport, and
   * an instant scroll, because Chromium snaps once a programmatic scroll ends.
   */
  for (const [k, offset] of stops.entries()) {
    if (k !== 1 && k !== 3) continue;
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      Math.round(top + offset) + 40,
    );
    await expect
      .poll(async () => Math.abs((await sectionTop()) + offset), {
        timeout: 1000,
        message: `stop ${k} did not settle at the top of the viewport`,
      })
      .toBeLessThanOrEqual(2);
  }
});

test('a still page costs no frames, and a scroll gets them', async ({ page }) => {
  // The whole reason the loop parks. A section a reader has stopped looking at
  // is a section that costs a laptop's battery nothing, and the only way to
  // say that from outside is to watch the counter not move.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);
  const frames = () => page.locator(section).evaluate((el) => Number(el.dataset.frames ?? -1));

  const atRest = await frames();
  await page.waitForTimeout(800);
  expect(await frames(), 'the parked loop drew a frame with nothing happening').toBe(atRest);

  // Half a band, which is a camera in the middle of a stroke rather than at a
  // stop, so the flight is definitely moving.
  const top = await page
    .locator(section)
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: 'instant' }),
    Math.ceil(top) + 900 * 0.15,
  );
  await expect
    .poll(frames, { timeout: 3000, message: 'a scroll drew no frames' })
    .toBeGreaterThan(atRest);
  await settled(page);
  await expect(page.locator(section)).toHaveAttribute('data-parked', 'true');
});

test('a lost context comes back without the reader touching anything', async ({ page }) => {
  // A browser takes the context away when it wants to: another tab asks for
  // one and the cap is reached, the machine sleeps, the driver resets. The
  // browser clears the drawing buffer on the way out and three.js builds
  // itself again on the way back in, but the loop is PARKED, which is where
  // the section spends most of a visit, so nothing asks for the frame that
  // would fill the blank stage. Until this was wired the reader got an empty
  // section until they happened to scroll or move the pointer.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);
  const frames = () => page.locator(section).evaluate((el) => Number(el.dataset.frames ?? -1));
  const parked = await frames();

  const what = await page.evaluate(async () => {
    const c = document.querySelector('#services canvas.crossroads-canvas') as HTMLCanvasElement;
    // getContext hands back the context that is already on the canvas rather
    // than making a second one, so this is the scene's own context.
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return 'this browser does not offer WEBGL_lose_context';
    const lost = new Promise<string>((told) => {
      c.addEventListener('webglcontextlost', () => told('lost'), { once: true });
      setTimeout(() => told('the browser never said the context was lost'), 10000);
    });
    const back = new Promise<string>((told) => {
      c.addEventListener('webglcontextrestored', () => told('restored'), { once: true });
      setTimeout(() => told('the browser never gave the context back'), 10000);
    });
    ext.loseContext();
    const said = await lost;
    if (said !== 'lost') return said;
    // A whole task between the two, and it is required rather than polite.
    // Resolving a promise inside the lost listener puts the continuation in
    // the microtask checkpoint that runs while the event is still being
    // dispatched, and Chromium only allows a restore once the dispatch is
    // over: asking there answers "WebGL: INVALID_OPERATION: restoreContext:
    // context restoration not allowed" and nothing comes back.
    await new Promise((done) => setTimeout(done, 200));
    ext.restoreContext();
    return await back;
  });
  expect(what, 'the context could not be taken away and given back').toBe('restored');

  // Nothing is hovered and nothing is scrolled between the restore and this
  // poll, which is the whole assertion: the frame is the restore's own.
  await expect
    .poll(frames, { timeout: 10000, message: 'the restored context drew nothing' })
    .toBeGreaterThan(parked);
  await settled(page);
  expect(errors, 'the restore threw at the page').toEqual([]);
});

test('both themes paint the world in the section own ink', async ({ page }) => {
  // The scene is full bleed and the ink hero lands on its first pixel, so the
  // world's ground and the section's background have to be the same colour or
  // the page gets a hard line across it. three.js holds its own copy of that
  // colour, which is why a theme switch is a repaint here and a stylesheet
  // everywhere else on the site.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await arrive(page);

  const ink = () =>
    page.locator(section).evaluate((el) => ({
      ground: el.dataset.ground ?? 'absent',
      painted: getComputedStyle(el).backgroundColor,
    }));
  const dark = await ink();
  expect(dark.ground, 'the scene is standing in a colour the section is not').toBe(dark.painted);

  // The site's own control writes data-theme onto <html>. Set here rather than
  // clicked, because this is about the scene following the attribute and not
  // about where the button is.
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
  });
  const painted = await page
    .locator(section)
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(painted, 'the two themes paint the same ink, so nothing was tested').not.toBe(
    dark.painted,
  );
  await expect
    .poll(async () => (await ink()).ground, {
      timeout: 5000,
      message: 'the scene kept the ground it booted with after a theme switch',
    })
    .toBe(painted);
});

for (const lang of ['de', 'en'] as const) {
  test(`${lang}: every row names its own service`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${lang}/`);
    await arrive(page);

    // The map's four chips, in THIS language. A chip's width is a font metric,
    // so the lift that separates 01 and 02 is a different sum in each one:
    // measured at 1440, the four are 208, 245, 183 and 170 pixels wide in
    // German and 208, 208, 199 and 223 in English. Both need the lift and only
    // German was ever checked for a clash.
    //
    // The screens inside the world are drawn in this language too, from
    // LABELS[lang] through textures.ts, and nothing here asserts a pixel of
    // that: tests/unit/crossroads-textures.spec.ts holds it by recording every
    // string the drawing calls fillText with.
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
      await expect(page.locator(section)).toHaveAttribute('data-stop', key);
      await settled(page);
    }
  });
}
