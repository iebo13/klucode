#!/usr/bin/env node
/**
 * Fail on any spacing utility that is not on the token scale.
 *
 * WHY
 * ---
 * brand/tokens/tokens.json defines a 4px-based scale — 4/8/12/16/24/32/48/64/
 * 96/128px — and the components were bypassing it: mt-3 mt-5 mt-7 mt-10 mt-14
 * gap-2.5 py-3.5 px-7 space-y-2.5, several of which are not on any scale at
 * all. Worse, the SAME semantic relationship differed per component — the
 * eyebrow -> heading -> lead rhythm was mt-3/mt-5 in SectionHead, mt-6/mt-7 in
 * PageHero and mt-6/mt-8 in the hero.
 *
 * tailwind.config.ts now REPLACES theme.spacing rather than extending it, so an
 * off-scale utility silently produces no CSS instead of an off-grid value. That
 * silence is the reason this script exists: a class that does nothing looks
 * exactly like a class that was never needed.
 *
 *     node scripts/check-spacing.mjs
 */
// globSync from node:fs needs Node >= 22 — package.json `engines` says so.
import { globSync, readFileSync } from 'node:fs';

// Mirrors the `spacing` key in tailwind.config.ts, which is built from
// tokens.json. Keep them in step; this list is the assertion, not the source.
const ALLOWED = new Set([
  '0',
  'px',
  '1',
  '2',
  '3',
  '4',
  '6',
  '8',
  '12',
  '16',
  '24',
  '32',
  'section',
  'section-lg',
]);

// Every utility family Tailwind resolves through theme.spacing.
// Longest-first: regex alternation takes the first match, so `gap` would
// otherwise swallow `gap-x` and `p` would swallow `px`.
const FAMILIES =
  '(?:translate-x|translate-y|scroll-m|scroll-p|space-x|space-y|inset-x|inset-y|bottom|gap-x|gap-y|min-w|min-h|inset|start|right|size|left|gap|end|top|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml|w|h|p|m)';

// Non-spacing keywords those same families accept (width/height/inset extend
// theme.spacing with these), plus fractions and arbitrary values.
const KEYWORD =
  /^(auto|full|screen|min|max|fit|svh|lvh|dvh|svw|lvw|dvw|prose|none|px|\d+\/\d+|\[.*\])$/;

const RE = new RegExp(`(?<![\\w-])-?${FAMILIES}-([\\w./\\[\\]%-]+)`, 'g');

const files = globSync('src/**/*.tsx');
const offenders = [];

/**
 * Blank out comment bodies, keeping every newline so line numbers still line
 * up. Comments legitimately quote utilities that no longer exist, as a record
 * of what was replaced and why — that is prose, not code, and a block comment
 * wraps across lines so a line-start test does not catch it.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

for (const file of files) {
  const text = stripComments(readFileSync(file, 'utf8'));
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(RE)) {
      const value = m[1];
      // Spacing values are numeric or `px`; anything else is prose that
      // happens to look like a utility, or a non-spacing family.
      if (!/^[\d.]/.test(value) && value !== 'px') continue;
      if (KEYWORD.test(value) || ALLOWED.has(value)) continue;
      offenders.push(`${file}:${i + 1}  ${m[0]}`);
    }
  });
}

if (offenders.length) {
  console.error(`Off-scale spacing utilities (${offenders.length}):`);
  for (const o of offenders) console.error(`  ${o}`);
  console.error('\nUse a value from the token scale in brand/tokens/tokens.json.');
  process.exit(1);
}
console.log(`No off-scale spacing utilities in ${files.length} files.`);
