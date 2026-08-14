/**
 * Asserts that every page's <title> and meta description is present, unique
 * within its language, and inside the length budget.
 *
 * The audit in issue #13 found three descriptions over budget (de.home 167,
 * de.work 171, en.home 166). Fixing them is a one-off; keeping them fixed is
 * not — the copy pass in #14 rewrites the same strings. So the audit is
 * asserted here instead of remembered.
 *
 * Budgets are what Google actually renders before truncating, measured in
 * characters because that is what the content file can be checked against.
 * They are upper bounds, not targets.
 */

import { readFileSync } from 'node:fs';

const LIMITS = {
  // Beyond ~60 the title is cut in the SERP. Every title here ends in
  // "— KluCode", so the useful part is shorter still.
  title: { max: 60, min: 10 },
  // ~160 is where the description is truncated on desktop.
  description: { max: 160, min: 40 },
};

/**
 * Pulls the meta.pages block out of a content file by parsing it rather than
 * importing it — these are .ts modules with a `satisfies` clause and node
 * cannot load them without a build step.
 */
function readPages(lang) {
  const source = readFileSync(`src/content/${lang}.ts`, 'utf8');
  const start = source.indexOf('pages: {');
  const end = source.indexOf('nav: {');
  if (start < 0 || end < 0) throw new Error(`${lang}.ts: could not locate meta.pages`);

  const block = source.slice(start, end);
  const entry =
    /(\w+): \{\s*title:\s*'((?:[^'\\]|\\.)*)',\s*description:\s*\n?\s*'((?:[^'\\]|\\.)*)',?\s*\}/g;

  const pages = [];
  for (const [, key, title, description] of block.matchAll(entry)) {
    pages.push({ key, title, description });
  }
  return pages;
}

const EXPECTED = ['home', 'services', 'work', 'approach', 'about', 'contact', 'imprint', 'privacy'];
const problems = [];

for (const lang of ['de', 'en']) {
  const pages = readPages(lang);

  // A regex that silently matches nothing would make this whole check pass
  // while asserting no pages at all.
  const missing = EXPECTED.filter((k) => !pages.some((p) => p.key === k));
  if (missing.length > 0) {
    problems.push(`${lang}: no meta entry parsed for ${missing.join(', ')}`);
    continue;
  }

  for (const field of ['title', 'description']) {
    const { max, min } = LIMITS[field];

    for (const page of pages) {
      const value = page[field];
      const n = value.length;
      if (n > max) problems.push(`${lang}.${page.key}.${field}: ${n} chars, budget ${max}`);
      if (n < min) problems.push(`${lang}.${page.key}.${field}: ${n} chars, suspiciously short`);
    }

    // A duplicate description across two pages tells a crawler they are the
    // same page. Titles are the same argument, louder.
    const seen = new Map();
    for (const page of pages) {
      const prior = seen.get(page[field]);
      if (prior) problems.push(`${lang}: ${page.key} and ${prior} share a ${field}`);
      else seen.set(page[field], page.key);
    }
  }
}

if (problems.length > 0) {
  console.error('check-meta: page metadata is out of budget.\n');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('check-meta: 16 titles and descriptions, all unique and within budget.');
