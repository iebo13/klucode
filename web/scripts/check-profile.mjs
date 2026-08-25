/**
 * Fails if the built site still contains unfilled profile.ts placeholders.
 *
 * `todo()` in src/content/profile.ts renders as «Vorname» and puts a
 * role="alert" banner on the Impressum. That banner is deliberate — it is what
 * stops an incomplete § 5 DDG Impressum from going live unnoticed — but it is
 * only a warning, and a warning nobody reads is a warning that ships.
 *
 * This is the hard gate. It is NOT part of CI, because CI must stay green while
 * the placeholders are legitimately still there. Run it against the production
 * build before the first upload:
 *
 *     npm run build && npm run check:profile
 *
 * Three things are asserted, because any one of them can pass while the site is
 * still broken: no placeholder text anywhere in the output, no alert banner on
 * either language's Impressum, and an availability month that has not already
 * gone by.
 *
 * The availability month is here rather than in CI for the same reason as the
 * rest of this file. It is not wrong on a branch, it is wrong on a SERVER, and
 * the only moment that distinction can be checked is the one immediately before
 * an upload. A build in August advertising September is right. The same
 * artefact still sitting there in November is a site nobody maintains, which
 * reads worse than saying nothing about capacity at all.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'out';

function htmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...htmlFiles(path));
    else if (entry.endsWith('.html')) found.push(path);
  }
  return found;
}

let files;
try {
  files = htmlFiles(OUT);
} catch {
  console.error(`check-profile: no ${OUT}/ directory — run \`npm run build\` first.`);
  process.exit(1);
}

/**
 * Reported per placeholder, not per page. The content module is serialised into
 * every page's RSC payload, so one unfilled field is 21 findings — a per-page
 * list buries the eight things that actually need doing under 130 lines.
 */
const placeholders = new Map();
const banners = [];

for (const file of files) {
  const html = readFileSync(file, 'utf8');

  // Guillemets appear in no copy on this site; only todo() emits them.
  // Counted per page, not per occurrence — a field rendered three times on one
  // page is still one page.
  for (const placeholder of new Set([...html.matchAll(/«[^»]{1,80}»/g)].map(([m]) => m))) {
    placeholders.set(placeholder, (placeholders.get(placeholder) ?? 0) + 1);
  }

  if (/\/(impressum|imprint)\/index\.html$/.test(file) && html.includes('role="alert"')) {
    banners.push(file);
  }
}

/**
 * The availability date, read out of the built HTML rather than imported.
 *
 * profile.ts is TypeScript and this is a plain .mjs run against `out/`, and
 * more to the point what matters is what the ARTEFACT says: an import would
 * check the source that a stale build was made from rather than the build.
 * The badge renders either a month name or a bare year, so both are matched:
 * a month is stale once it is over, a year once it is over.
 */
const MONTHS = {
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'], // prettier-ignore
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'], // prettier-ignore
};

const stale = [];
{
  const now = new Date();
  const home = join(OUT, 'de', 'index.html');
  let html = '';
  try {
    html = readFileSync(home, 'utf8');
  } catch {
    // No German homepage means something much louder is already wrong, and the
    // page list above will have said so.
  }
  const match = html.match(/Freie Kapazität ab\s*(?:<[^>]*>\s*)*(\d{4}|[A-Za-zÄÖÜäöü]+)/);
  const month = match?.[1];
  if (month && /^\d{4}$/.test(month)) {
    if (Number(month) < now.getUTCFullYear()) {
      stale.push(
        `the availability badge says "${month}", which is already behind us. ` +
          'Move availableFrom in src/content/profile.ts, or drop the badge.',
      );
    }
  } else if (month) {
    const index = MONTHS.de.indexOf(month);
    if (index === -1) {
      stale.push(`the availability badge says "${month}", which is not a month name`);
    } else {
      // Same month is fine: it reads as "available now". Only a month that has
      // finished is a claim the site can no longer support.
      const shown = new Date(Date.UTC(now.getUTCFullYear(), index, 1));
      const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      // A month earlier in the calendar than today's is next year's, not last
      // year's, unless the build is genuinely old. Twelve months of slack, so
      // a site left up for a year is caught and a December-to-January rollover
      // is not.
      if (shown < thisMonth) {
        stale.push(
          `the availability badge says "${month}", which is already behind us. ` +
            'Move availableFrom in src/content/profile.ts, or drop the badge.',
        );
      }
    }
  }
}

/**
 * A production artefact that tells search engines to stay away.
 *
 * The preview's noindex is switched on by NEXT_PUBLIC_SITE_URL naming
 * somewhere other than klucode.de, and an UNSET variable is production. So a
 * build made on a machine where the variable happens to be exported, or in a
 * CI job that inherits it, is a full copy of the site that no search engine
 * will index, and nothing about it looks wrong: the pages render, the links
 * work, and the tag that costs every ranking is one line in the head.
 *
 * The two legal pages and the 404 page are noindex on purpose and are
 * skipped. Everything else that reaches this gate has to be indexable,
 * because this gate only runs on the artefact that is about to be uploaded
 * to klucode.de.
 */
const hidden = files.filter(
  (file) =>
    !/\/(impressum|imprint|datenschutz|privacy|404)\/index\.html$/.test(file) &&
    !/\/404\.html$/.test(file) &&
    /<meta name="robots" content="noindex/.test(readFileSync(file, 'utf8')),
);

if (placeholders.size > 0 || banners.length > 0 || stale.length > 0 || hidden.length > 0) {
  console.error('check-profile: the site is not ready to go live.\n');

  for (const [placeholder, pages] of placeholders) {
    console.error(`  unfilled: ${placeholder.slice(1, -1)}  (on ${pages} pages)`);
  }
  for (const file of banners) {
    console.error(`  ${file}: still renders the incomplete-details banner`);
  }
  for (const line of stale) {
    console.error(`  stale: ${line}`);
  }
  for (const file of hidden) {
    console.error(
      `  noindex: ${file} tells search engines to stay away. NEXT_PUBLIC_SITE_URL was set for this build, so it is a preview and not the production artefact.`,
    );
  }

  console.error('\nFill in src/content/profile.ts — see its header for the todo() / null split.');
  process.exit(1);
}

console.log(`check-profile: ${files.length} pages, no unfilled details.`);
