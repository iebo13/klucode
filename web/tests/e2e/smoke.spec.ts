import { expect, test } from '@playwright/test';

/** Collects anything the page reports as broken, for any test to assert on. */
function watchForErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

for (const lang of ['de', 'en'] as const) {
  test(`the ${lang} homepage loads clean`, async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto(`/${lang}/`);
    await expect(page).toHaveTitle(/KluCode/);
    await expect(page.locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

/**
 * Every standalone control on a phone is at least 44px in both directions.
 *
 * WCAG 2.5.5's minimum, and the site was failing it in nineteen places on the
 * homepage alone: the header capsule's three controls at 38 to 43px tall, six
 * arrow links at 28, and every footer link at 17. All of them are perfectly
 * legible and none of them is comfortably tappable, which is a different
 * property and the one a thumb has an opinion about.
 *
 * Padding, never font size. Each of those grew a min-height with its type
 * centred in it, so nothing on the page changed size and the boxes under them
 * did.
 *
 * Two exemptions, and the standard names both. A link inside a sentence is
 * exempt („Inline"), which is the mailto in the closing paragraph: giving it a
 * 44px box would break the line it sits in. And a control whose own label is
 * the target is measured at the label, which is the consent checkbox: the
 * whole `<label>` toggles it and is 300px wide. The skip link is 1x1 until it
 * takes focus, at which point it is a button.
 */
const EXEMPT = ['sr-only', 'accent-[--kc-brandAction]'];

for (const path of ['/de/', '/de/leistungen/', '/de/projekte/', '/de/kontakt/', '/de/impressum/']) {
  test(`every control on ${path} is thumb-sized on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const small = await page.evaluate((exempt) => {
      const out: string[] = [];
      for (const el of document.querySelectorAll('a, button, summary, input, select, textarea')) {
        const box = el.getBoundingClientRect();
        // Zero-sized or parked off-screen: the honeypot input lives at
        // left:-9999px inside a pointer-events:none wrapper on purpose.
        if (box.width === 0 || box.height === 0 || box.right < 0) continue;
        const classes = el.className.toString();
        if (exempt.some((e) => classes.includes(e))) continue;
        // The inline exception: a link sitting inside a run of text.
        if (el.tagName === 'A' && el.parentElement?.tagName === 'P') continue;
        if (box.height >= 44 && box.width >= 44) continue;
        out.push(
          `${el.tagName.toLowerCase()} ${Math.round(box.width)}x${Math.round(box.height)} "${(el.textContent ?? '').trim().slice(0, 30)}"`,
        );
      }
      return out;
    }, EXEMPT);
    expect(small, 'controls under 44px').toEqual([]);
  });
}

/**
 * The page scrollbar is hidden and the page still scrolls, on every page.
 *
 * Two halves, because either one alone is the bug: a scrollbar rule that
 * also kills overflow leaves the page stuck at the top, and a rule that
 * hides the bar in one engine leaves it drawn in another. The gutter check
 * is what a screenshot would show: with the bar gone the viewport's inner
 * width and the document's client width are the same number.
 */
for (const path of [
  '/de/',
  '/de/leistungen/',
  '/de/projekte/',
  '/de/ablauf/',
  '/de/ueber-mich/',
  '/de/kontakt/',
  '/en/',
]) {
  test(`${path} hides its scrollbar and still scrolls`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(path);
    const seen = await page.evaluate(() => {
      const root = document.documentElement;
      window.scrollTo({ top: 400, behavior: 'instant' });
      return {
        scrollbarWidth: getComputedStyle(root).scrollbarWidth,
        gutter: window.innerWidth - root.clientWidth,
        scrolled: window.scrollY,
        overflow: root.scrollHeight > window.innerHeight,
      };
    });
    expect(seen.scrollbarWidth, 'the scrollbar is still drawn').toBe('none');
    expect(seen.gutter, 'the scrollbar still takes a gutter').toBe(0);
    expect(seen.overflow, 'the page has nothing to scroll').toBe(true);
    expect(seen.scrolled, 'the page no longer scrolls').toBe(400);
  });
}
