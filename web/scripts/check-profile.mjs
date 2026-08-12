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
 * Two things are asserted, because either alone can pass while the site is
 * still broken: no placeholder text anywhere in the output, and no alert
 * banner on either language's Impressum.
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

if (placeholders.size > 0 || banners.length > 0) {
  console.error('check-profile: the site is not ready to go live.\n');

  for (const [placeholder, pages] of placeholders) {
    console.error(`  unfilled: ${placeholder.slice(1, -1)}  (on ${pages} pages)`);
  }
  for (const file of banners) {
    console.error(`  ${file}: still renders the incomplete-details banner`);
  }

  console.error('\nFill in src/content/profile.ts — see its header for the todo() / null split.');
  process.exit(1);
}

console.log(`check-profile: ${files.length} pages, no unfilled details.`);
