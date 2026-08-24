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
