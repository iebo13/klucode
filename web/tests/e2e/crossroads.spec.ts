import { expect, test, type Page } from '@playwright/test';

import { APPROACH_END } from '../../src/components/crossroads/progress';

/**
 * Scroll progress at which the camera is standing at way `i`.
 *
 * The same expression scene.ts uses, imported from the same constant, because
 * the four ways moved when the section grew an opening argument in front of
 * them. Four literals would have to be found and corrected by hand every time
 * the approach changes length, and the failure they produce in the meantime is
 * a test that scrolls to the middle of the problem copy and reports that no
 * service is in focus, which says nothing about what actually broke.
 */
const wayAt = (i: number) => APPROACH_END + (0.18 + i * 0.19) * (1 - APPROACH_END);

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

test('the copy column fits its stage at the smallest viewport that mounts', async ({ page }) => {
  // Measured before this was fixed: the grid row was auto, so it sized to the
  // 1097px copy column and overhung the one-viewport stage, which clips. The
  // column ran 459px past the bottom at 1024x736, 301px at 1440x900 and 121px
  // even at 1920x1080, with the fourth price inside the cut. The canvas went
  // with it: a 640x1097 drawing buffer for a box 640x900.
  //
  // 1024x736 is the floor the mount predicate allows, so it is where this is
  // tightest.
  await page.setViewportSize({ width: 1024, height: 736 });
  await page.goto('/de/');
  await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();

  const fit = await page.evaluate(() => {
    const stage = document.querySelector('.crossroads-stage') as HTMLElement;
    const col = document.querySelector('.crossroads-copy') as HTMLElement;
    const view = document.querySelector('.crossroads-view') as HTMLElement;
    const canvas = document.querySelector('.crossroads-stage canvas') as HTMLCanvasElement;
    const s = stage.getBoundingClientRect();
    const c = col.getBoundingClientRect();
    return {
      below: Math.round(c.bottom - s.bottom),
      above: Math.round(s.top - c.top),
      canvasOverflow: Math.round(canvas.height - view.getBoundingClientRect().height),
      scrollable: col.scrollHeight > col.clientHeight,
    };
  });
  expect(fit.below, 'the copy column overhangs the stage').toBeLessThanOrEqual(0);
  expect(fit.above, 'the copy column overhangs the stage').toBeLessThanOrEqual(0);
  expect(fit.canvasOverflow, 'the canvas is sized by the copy beside it').toBeLessThanOrEqual(1);
  // It does not fit at any viewport this mounts on, so it must be reachable
  // rather than merely uncut.
  expect(fit.scrollable, 'nothing left to scroll, so the rows were cut instead').toBe(true);
});

test('the row the camera is looking at is inside the column that scrolls', async ({ page }) => {
  // The other half of the fit. At the 1024x736 floor the column shows about
  // two and a bit of its four rows, so ways 03 and 04 come into focus below
  // the fold of a scroller the visitor has no reason to have found.
  await page.setViewportSize({ width: 1024, height: 736 });
  await page.goto('/de/');
  for (const p of [wayAt(0), wayAt(1), wayAt(2), wayAt(3)]) {
    await scrollToProgress(page, p);
    const seen = await page.evaluate(() => {
      const col = document.querySelector('.crossroads-copy') as HTMLElement;
      const row = col.querySelector('li[data-focus="true"]');
      if (!row) return null;
      const b = col.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      return {
        key: row.getAttribute('data-key'),
        above: r.top - b.top,
        below: r.bottom - b.bottom,
      };
    });
    expect(seen, `no row in focus at ${p}`).not.toBeNull();
    expect(seen?.above ?? -1, `the focused row is above the column at ${p}`).toBeGreaterThanOrEqual(
      -1,
    );
    expect(seen?.below ?? 1, `the focused row is below the column at ${p}`).toBeLessThanOrEqual(1);
  }
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

/* --- the opening argument ------------------------------------------------
   „Die Ausgangslage" used to be a section of its own above this one. Merged,
   it is the first act of the same journey, and the two things worth pinning
   are that it is complete for everyone and that it hands over cleanly. */

test('the opening argument reaches every visitor, scene or no scene', async ({ page }) => {
  // The fallback is where most people read this: every phone, every tablet
  // held upright, every reduced-motion request. Losing a card here would lose
  // it for the majority, and the copy column is the only copy of it now.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/de/');
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');
  await expect(page.locator(`${section} canvas`)).toHaveCount(0);

  for (const text of ['Die Agentur', 'Der Baukasten', 'Also weiter wie bisher']) {
    await expect(page.locator(section).getByText(text, { exact: true })).toBeVisible();
  }
  await expect(page.locator(`${section} .crossroads-answer`)).toBeVisible();
  // And the four ways are still under it, so the merged section carries both
  // halves of the argument rather than trading one for the other.
  await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
});

test('the approach shows the argument, and the junction hands over to the ways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();

  const acts = page.locator(`${section} .crossroads-act`);
  await expect(acts).toHaveCount(2);

  // Through the whole approach the problem is showing and the price board is
  // not, and nothing has begun to build: the section must not answer the
  // question while it is still asking it.
  for (const p of [0, 0.1, 0.2, APPROACH_END - 0.01]) {
    await scrollToProgress(page, p);
    await expect(acts.nth(0), `act one is hidden at ${p}`).toHaveAttribute('data-live', 'true');
    await expect(acts.nth(1), `act two is showing at ${p}`).toHaveAttribute('data-live', 'false');
    await expect(page.locator(section)).toHaveAttribute('data-built', '0');
  }

  // Past the junction the column is the four ways.
  await scrollToProgress(page, APPROACH_END + 0.02);
  await expect(acts.nth(0)).toHaveAttribute('data-live', 'false');
  await expect(acts.nth(1)).toHaveAttribute('data-live', 'true');

  // Five blocks, and exactly one of them is ever the live one.
  const beats = page.locator(`${section} .crossroads-beat`);
  await expect(beats).toHaveCount(5);
  for (const p of [0.02, 0.09, 0.15, 0.21, 0.27]) {
    await scrollToProgress(page, p);
    await expect(
      page.locator(`${section} .crossroads-beat[data-live="true"]`),
      `not exactly one block at ${p}`,
    ).toHaveCount(1);
  }
});

test('both acts stay readable to a screen reader, whichever one is showing', async ({ page }) => {
  // Opacity, never display or visibility. A reader using a screen reader at
  // 1440px gets the enhanced state like everybody else, and removing act one
  // from the tree once the camera has passed it would delete half this
  // section's argument for precisely the people who cannot watch it move.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(`${section} canvas[data-scene="kc-crossroads"]`)).toBeAttached();
  await scrollToProgress(page, wayAt(1));

  const actOne = page.locator(`${section} .crossroads-act`).first();
  // Polled, because the acts carry a 380ms fade whenever motion is allowed and
  // the one that just lost the floor is still travelling when the scroll
  // helper returns.
  await expect
    .poll(() => actOne.evaluate((el) => Number(getComputedStyle(el).opacity)), {
      message: 'act one should be faded out here',
    })
    .toBe(0);

  const still = await actOne.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility };
  });
  expect(still.display, 'act one was removed from the layout').not.toBe('none');
  expect(still.visibility, 'act one was removed from the accessibility tree').toBe('visible');
});

test('the fallback strikes each option through once you have passed it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/de/');
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');

  const cards = page.locator(`${section} .crossroads-card`);
  await expect(cards).toHaveCount(3);
  // Nothing has failed before it has been read.
  for (let i = 0; i < 3; i += 1) {
    await expect(cards.nth(i)).toHaveAttribute('data-passed', 'false');
  }

  // Scroll past all three and the first two are struck. The third is the one
  // still being read at the answer, and a card is only marked once the NEXT
  // block has been reached.
  await page.locator(`${section} .crossroads-answer`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await expect(cards.nth(0)).toHaveAttribute('data-passed', 'true');
  await expect(cards.nth(1)).toHaveAttribute('data-passed', 'true');

  // 0.7 and not lower. Same accessibility floor as the price rows: composited
  // over ink, text-ink-muted at 0.7 measures 5.33:1 in the light theme and
  // 4.52:1 in the dark, against the 4.5:1 body text needs. check_contrast.py
  // audits token pairs and cannot see a CSS opacity, so this is the only gate
  // that would catch it drifting.
  await expect
    .poll(() => cards.nth(0).evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeCloseTo(0.7, 2);
});

test('a reduced-motion visitor is never handed a struck-through option', async ({ page }) => {
  // The fallback covers reduced motion as well as phones, and honouring the
  // request means nothing moves and nothing is dimmed: every option stays at
  // full strength, which is exactly the static page this section had before.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');

  await page.locator(`${section} .crossroads-answer`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const cards = page.locator(`${section} .crossroads-card`);
  for (let i = 0; i < 3; i += 1) {
    await expect(cards.nth(i), `option ${i} was struck through`).toHaveAttribute(
      'data-passed',
      'false',
    );
    expect(
      await cards.nth(i).evaluate((el) => Number(getComputedStyle(el).opacity)),
      `option ${i} was dimmed`,
    ).toBe(1);
  }
});

test('a jumped scroll does not leave the options behind it unstruck', async ({ page }) => {
  // The anchor-link case, and the same one the build ratchet exists for. An
  // IntersectionObserver only reports the blocks that crossed its boundary, so
  // a scroll that flies past three of them names one and says nothing about
  // the rest. Measuring every block against the reading line instead is what
  // makes this work.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/de/');
  await expect(page.locator(section)).toHaveAttribute('data-enhanced', 'false');

  await page.evaluate(() => {
    const answer = document.querySelector('#services .crossroads-answer');
    answer?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(700);

  const cards = page.locator(`${section} .crossroads-card`);
  for (let i = 0; i < 3; i += 1) {
    await expect(cards.nth(i), `option ${i} was skipped rather than passed`).toHaveAttribute(
      'data-passed',
      'true',
    );
  }
});
