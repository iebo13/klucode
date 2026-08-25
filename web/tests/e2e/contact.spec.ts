import { expect, test } from '@playwright/test';

/**
 * The contact form is the site's second contact channel now that there is no
 * phone number, which makes how it submits a § 5 DDG question rather than a
 * UX one. These run against the default build, and the default build is
 * production: profile.ts falls back to klucode.de when NEXT_PUBLIC_SITE_URL is
 * unset, because the real site is a plain `npm run build` uploaded to Plesk.
 */

test('the form posts to the first-party handler, not to a third party', async ({ page }) => {
  await page.goto('/en/contact/');

  const posted = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().includes('/contact.php'),
  );
  // Answer it here so the test does not depend on a PHP runtime. What is being
  // checked is where the message goes and what it carries.
  await page.route('**/contact.php', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );

  await page.fill('#name', 'Test Person');
  await page.fill('#email', 'test@example.com');
  await page.fill('#phone', '+49 211 000000');
  await page.fill('#message', 'Hello there');
  await page.check('#consent');
  await page.click('button[type="submit"]');

  const request = await posted;
  const body = JSON.parse(request.postData() ?? '{}');
  expect(body.name).toBe('Test Person');
  expect(body.email).toBe('test@example.com');
  expect(body.message).toBe('Hello there');
  // The call-back number. The site prints no phone number of its own, so
  // this optional field is how a reader who would rather talk gets the call.
  expect(body.phone).toBe('+49 211 000000');
  // The honeypot travels with every submission, empty when a person sent it.
  expect(body, 'the honeypot field was not forwarded').toHaveProperty('website');
  expect(body.website).toBe('');

  // Same origin. A third-party form service would be a new data processor to
  // name in the privacy policy, and the site claims it has none.
  expect(new URL(request.url()).origin).toBe(new URL(page.url()).origin);
});

test('the honeypot is unreachable for a person and invisible to a screen reader', async ({
  page,
}) => {
  await page.goto('/en/contact/');
  const pot = page.locator('#website');
  await expect(pot).toBeAttached();

  const state = await pot.evaluate((el) => {
    const input = el as HTMLInputElement;
    const box = input.getBoundingClientRect();
    return {
      tabIndex: input.tabIndex,
      autocomplete: input.getAttribute('autocomplete'),
      offScreen: box.right < 0,
      // display:none would let a bot skip it, so it must still be laid out.
      display: getComputedStyle(input).display,
      hiddenFromAT: input.closest('[aria-hidden="true"]') !== null,
    };
  });
  expect(state.tabIndex, 'the honeypot is in the tab order').toBe(-1);
  expect(state.autocomplete, 'a browser could autofill the honeypot').toBe('off');
  expect(state.offScreen, 'the honeypot is on screen').toBe(true);
  expect(state.display, 'display:none lets a bot skip the honeypot').not.toBe('none');
  expect(state.hiddenFromAT, 'the honeypot is exposed to screen readers').toBe(true);
});

test('the note under the form describes the path this build actually takes', async ({ page }) => {
  // Telling someone their message went to a server when it opened their mail
  // client is a statement about their data, so the note is read off the same
  // value the submit handler branches on.
  await page.goto('/en/contact/');
  const form = page.locator('form');
  await expect(form).toContainText('sends your message to my own server');
  await expect(form).not.toContainText('opens your email client');
});

test('the privacy policy describes server-side sending, in both languages', async ({ page }) => {
  // The old § 5 promised in writing that it would be amended before
  // server-side sending was switched on. This is that promise, kept.
  await page.goto('/en/privacy/');
  const en = page.locator('main');
  await expect(en).toContainText("transmits your details to this website's server");
  await expect(en).toContainText('SHA-256 checksum');
  await expect(en, 'the policy still claims nothing is transmitted').not.toContainText(
    'does not transmit your details on its own',
  );

  await page.goto('/de/datenschutz/');
  const de = page.locator('main');
  await expect(de).toContainText('überträgt Ihre Angaben an den Server dieser Website');
  await expect(de).toContainText('SHA-256-Prüfsumme');
  await expect(de).not.toContainText('überträgt Ihre Angaben nicht selbstständig');
});

test('no page offers a phone number any more', async ({ page }) => {
  for (const path of ['/de/impressum/', '/de/kontakt/', '/de/', '/en/imprint/', '/en/contact/']) {
    await page.goto(path);
    await expect(page.locator('a[href^="tel:"]'), `${path} still has a tel: link`).toHaveCount(0);
    await expect(page.locator('body'), `${path} renders a null`).not.toContainText('null');
  }
});

test('the contact page names the place, and the optional channels stay off until set', async ({
  page,
}) => {
  // A local search lands here wanting to know the business is where it says
  // it is, and the address was only on the Impressum.
  await page.goto('/de/kontakt/');
  await expect(page.locator('main address')).toContainText('Düsseldorf');
  // profile.whatsapp and profile.booking are null until the owner decides,
  // and a null must render nothing rather than a link to nowhere.
  await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
  // The form offers the call back the site cannot otherwise arrange.
  await expect(page.locator('#phone')).toBeVisible();
  await expect(page.locator('#phone')).not.toHaveAttribute('required', /.*/);
});
