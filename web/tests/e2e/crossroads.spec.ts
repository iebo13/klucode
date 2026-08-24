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

  test('with JavaScript switched off entirely', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/de/');
    await expect(page.locator(`${section} li[data-key]`)).toHaveCount(4);
    await expect(page.locator(`${section} li[data-key="website"]`)).toContainText('2.500');
    await context.close();
  });
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
