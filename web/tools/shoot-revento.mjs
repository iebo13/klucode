/**
 * The two REVENTO screenshots, captured from the running app rather than
 * cropped by hand.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 26 August visual audit's first finding was that the site has no
 * pictures: at 390px the homepage was 6,750px tall and rendered zero images,
 * and /projekte described three delivered systems in careful prose and showed
 * none of them. A designer cannot compose a page out of nothing, and no amount
 * of layout work fixes an assets problem.
 *
 * REVENTO ENERGIEDISTRIBUTION is the `crm` case study — the CRM, the
 * commission run and the public Vergleichsportal that share one database — and
 * it is the ONE project whose client has released images. The other two wait
 * on written approval and keep their diagram until it arrives.
 *
 * A script rather than a folder of PNGs somebody dragged in, for the same
 * reason tools/shoot-poster.mjs is a script: an asset nobody can regenerate is
 * an asset that goes stale silently, and the moment the app's own design moves
 * the site is showing a product that no longer exists.
 *
 * WHAT IS AND IS NOT IN FRAME
 * ---------------------------
 * Both captures are of PUBLIC pages, signed out. Nothing behind the login is
 * photographed, because everything behind it is a real partner's real data and
 * no framing makes that publishable. The tariff query is a bare postcode and a
 * household consumption figure with no street and no house number: the numbers
 * on screen are supplier prices, which are public market data, and the search
 * that produced them belongs to nobody.
 *
 *     # in the REVENTO checkout
 *     npm run dev                       # http://localhost:5173
 *
 *     # here
 *     node tools/shoot-revento.mjs
 *
 * Writes public/revento-*.webp and prints the intrinsic size of each, which is
 * what content/{de,en}.ts has to carry so the pictures reserve their boxes.
 * Commit the results.
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.REVENTO_BASE ?? 'http://localhost:5173';

/**
 * Wide enough that the app lays out as it does on a laptop, narrow enough that
 * its 16px body type is still 16px-ish once the picture is scaled into a
 * 1088px container. Capture at 1440 and the same screenshot arrives at 0.75
 * scale, where 16px becomes 12 and a comparison table becomes a texture.
 */
const WIDTH = 1200;

/**
 * Located by their visible text rather than by class or accessible name.
 * The app is Material UI, so every class is a generated hash and none of them
 * is a contract, and the buttons carry an icon inside the label, which puts
 * the icon's own text into the accessible name.
 */
const button = (page, text) => page.locator(`button:has-text("${text}")`).first();

/**
 * The consent dialog, which is modal and sits over both shots.
 *
 * Waited for rather than probed. It mounts a beat after the route does, so an
 * is-it-visible-yet check runs before it exists, reports no, and leaves an
 * alertdialog swallowing every click on the page for the next thirty seconds.
 * Absent after the wait is fine — a second run in a warm profile has already
 * answered it.
 */
async function dismissConsent(page) {
  const dialog = page.locator('[role="alertdialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  if (!(await dialog.isVisible().catch(() => false))) return;
  await dialog.locator('button:has-text("Akzeptieren")').first().click();
  await dialog.waitFor({ state: 'hidden', timeout: 5_000 });
}

/** Page y of the first element whose own text matches, or null. */
function anchorY(page, pattern) {
  return page.evaluate((source) => {
    const re = new RegExp(source);
    const el = [...document.querySelectorAll('*')].find(
      (e) => e.children.length === 0 && re.test(e.textContent ?? ''),
    );
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  }, pattern);
}

/**
 * The scrollbar is chrome the picture already has its own version of: the
 * frame these land in draws a browser bar, and a second, half-width UA
 * scrollbar down the right edge of the image reads as an artefact of the
 * capture rather than as part of the product. Removing it also hands the
 * layout back the 15px it was taking.
 */
async function hideScrollbar(page) {
  await page.addStyleTag({
    content: 'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}',
  });
  await page.waitForTimeout(200);
}

async function write(buffer, out) {
  const info = await sharp(buffer).webp({ quality: 80 }).toFile(`public/${out}`);
  console.log(`public/${out}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} kB`);
}

const browser = await chromium.launch();

/* --- the Vergleichsportal, doing its job ---------------------------------
   The homepage hero's picture, and the reason it is this one: the hero claims
   „Software, mit der Ihr Betrieb tatsächlich arbeitet", and a tariff run
   returning 113 offers with the saving against the incumbent on each is that
   sentence with a number in it. It is shown at the container's full width, so
   it arrives close to 1:1 and every figure on it is readable, which a 460px
   thumbnail in a hero's right column would not have been. */
{
  // 730 rather than a round number: it is where the second comparison row
  // ends. A screenshot cut mid-row reads as a capture that went wrong, and one
  // cut at a boundary reads as a list that continues.
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 730 } });
  await page.goto(`${BASE}/tarifrechner?plz=40210&verbrauch=3500`);
  await dismissConsent(page);
  await button(page, 'Tarife berechnen').click();
  // The result count is the last thing to appear, so waiting for it waits for
  // the whole run rather than for a spinner to be replaced by a spinner.
  await page
    .getByText(/Tarife gefunden/)
    .first()
    .waitFor({ timeout: 20_000 });
  await page.waitForTimeout(600);

  const y = await anchorY(page, 'Tarife gefunden');
  if (y === null) throw new Error('revento: no result count on the page');
  // Less the app's own sticky header, which is 64px and would otherwise cover
  // the count the scroll was aimed at, and a little air above it.
  await page.evaluate((top) => window.scrollTo(0, top), y - 88);
  await hideScrollbar(page);
  await page.waitForTimeout(400);

  await write(await page.screenshot(), 'revento-tarifrechner.webp');
  await page.close();
}

/* --- the public front of the same system ---------------------------------
   The case study's picture on /projekte. Signed out, above the fold, and it
   carries the three numbers the business runs on. Cropped to the hero band:
   below it the page turns into ordinary marketing sections, and the picture is
   there to say what the thing looks like, not to reproduce it. */
{
  // The band is sized against the viewport, so the viewport is part of the
  // composition rather than just a canvas to crop out of: at 900 the hero grows
  // 140px of extra air above the eyebrow and the shot opens on empty navy.
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 760 } });
  await page.goto(`${BASE}/`);
  await dismissConsent(page);
  await page
    .getByText(/Vermittelte Verträge/)
    .first()
    .waitFor({ timeout: 20_000 });
  await hideScrollbar(page);
  await page.waitForTimeout(400);

  // Cut at the hero band's own bottom edge, MEASURED rather than guessed. A
  // hand-tuned viewport height was right for one run of the app's copy and
  // wrong for the next: three attempts each left a different strip of the
  // following section's grey along the bottom, which reads as a crop nobody
  // checked. The band knows where it ends, so it is asked.
  const bottom = await page.evaluate(() => {
    const stat = [...document.querySelectorAll('*')].find(
      (e) => e.children.length === 0 && /Vermittelte Verträge/.test(e.textContent ?? ''),
    );
    // Found by its PAINT, not by its size. Two size-based rules were tried and
    // both landed on an inner wrapper whose bottom edge is the last line of
    // type: the crop then cut the stat labels off at the knees. The navy band
    // is the nearest ancestor that actually paints a background, which is the
    // property that makes it the band in the first place.
    const paints = (el) => {
      const s = getComputedStyle(el);
      return (
        s.backgroundImage !== 'none' ||
        !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(s.backgroundColor)
      );
    };
    let node = stat;
    while (node && !(node.getBoundingClientRect().width >= window.innerWidth - 4 && paints(node))) {
      node = node.parentElement;
    }
    return node ? Math.round(node.getBoundingClientRect().bottom + window.scrollY) : null;
  });
  if (bottom === null) throw new Error('revento: could not find the hero band');

  await write(
    await page.screenshot({ clip: { x: 0, y: 0, width: WIDTH, height: bottom } }),
    'revento-start.webp',
  );
  await page.close();
}

await browser.close();
