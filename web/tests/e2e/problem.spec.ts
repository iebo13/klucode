import { expect, test } from '@playwright/test';

/**
 * „Die Ausgangslage": three options that do not fit, then the one that does.
 *
 * These assertions used to live in crossroads.spec.ts and to run against the
 * FALLBACK only, because the striking was a fallback device: on a laptop this
 * argument was the crossroads' pinned first act and the camera did the work
 * instead. The section is unpinned paper again, so the device is the whole
 * treatment and it runs for every visitor. Every test here is at 1440x900, a
 * viewport that used to get none of it.
 */
const section = 'section:has(.problem-option)';

test('the argument reaches every visitor, at every size', async ({ page }) => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/de/');
    for (const text of ['Die Agentur', 'Der Baukasten', 'Also weiter wie bisher']) {
      await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
    }
    await expect(page.locator('.problem-option')).toHaveCount(3);
  }
});

test('it stands above the crossroads, not inside it', async ({ page }) => {
  // The order is the argument: three options that do not fit, the answer, and
  // then the four ways to take the answer. It was one section for a day and
  // the merge is undone, so the thing worth pinning is that the boundary is
  // back and that the answer is the last thing before the junction.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');
  const order = await page.evaluate(() => {
    const options = document.querySelector('.problem-option');
    const services = document.querySelector('#services');
    if (!options || !services) return null;
    const box = options.getBoundingClientRect();
    const crossroads = services.getBoundingClientRect();
    return { problemTop: box.top + window.scrollY, servicesTop: crossroads.top + window.scrollY };
  });
  expect(order, 'one of the two sections is missing').not.toBeNull();
  expect(order?.problemTop ?? 1).toBeLessThan(order?.servicesTop ?? 0);
  // And it is not inside it, which is what it was yesterday.
  await expect(page.locator('#services .problem-option')).toHaveCount(0);
});

test('each option is struck through once you have passed it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');

  const options = page.locator('.problem-option');
  await expect(options).toHaveCount(3);
  // Nothing has failed before it has been read.
  for (let i = 0; i < 3; i += 1) {
    await expect(options.nth(i)).toHaveAttribute('data-passed', 'false');
  }

  // Scrolling to the answer passes all three, because an option is marked once
  // the NEXT block has been reached and the answer is the block after the
  // third. That is the whole reason the answer panel is a block at all.
  await page.getByText('Die dritte Möglichkeit', { exact: false }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  for (let i = 0; i < 3; i += 1) {
    await expect(options.nth(i), `option ${i} was not struck`).toHaveAttribute(
      'data-passed',
      'true',
    );
  }

  // The rule and nothing else. On ink the passed option also settled to 0.7,
  // where text-ink-muted measures 5.33:1 light and 4.52:1 dark; on paper
  // text-muted is 5.46:1 at FULL strength, so 0.7 takes it to 2.95:1. The dim
  // did not survive the move and this is what says so.
  const opacity = await options.nth(0).evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(opacity, 'the paper option is dimmed below AA').toBe(1);
  const struck = await options
    .nth(0)
    .evaluate((el) =>
      getComputedStyle(el.querySelector('.problem-strike') as Element, '::after').getPropertyValue(
        'width',
      ),
    );
  expect(struck, 'the heading is not struck through').not.toBe('0px');
});

test('a jumped scroll does not leave the options behind it unstruck', async ({ page }) => {
  // An IntersectionObserver only reports the blocks that crossed its boundary,
  // so a scroll that flies past three of them names one and says nothing about
  // the rest. Measuring every block against the reading line instead is what
  // makes this work, and it is the same class of fix as the build ratchet.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/de/');
  await page.evaluate(() => {
    const options = document.querySelectorAll('.problem-option');
    options[options.length - 1]?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(700);

  const options = page.locator('.problem-option');
  for (let i = 0; i < 2; i += 1) {
    await expect(options.nth(i), `option ${i} was skipped rather than passed`).toHaveAttribute(
      'data-passed',
      'true',
    );
  }
});

test('a reduced-motion visitor is never handed a struck-through option', async ({ page }) => {
  // Honouring the request means nothing moves and nothing is marked: every
  // option stays exactly as it was written, which is the static section this
  // was before any of it.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/de/');

  await page.getByText('Die dritte Möglichkeit', { exact: false }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const options = page.locator('.problem-option');
  for (let i = 0; i < 3; i += 1) {
    await expect(options.nth(i), `option ${i} was struck through`).toHaveAttribute(
      'data-passed',
      'false',
    );
  }
});
