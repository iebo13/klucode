/**
 * Asserts that copy destined for a tight slot stays inside it.
 *
 * The layout gives some strings a lot of room and some almost none. The narrow
 * ones are not obvious from the content file — `forWhom` is one line under a
 * heading on a 375px homepage card, `scope` sits beside a sector label, an
 * eyebrow is uppercase mono with wide tracking and turns into two lines fast.
 * Nothing about `forWhom: '…'` in de.ts tells you that, so a copy edit that
 * breaks the phone layout looks exactly like one that does not.
 *
 * The content modules are transpiled and imported rather than pattern-matched,
 * so this measures the real strings — including the ones built from template
 * literals — and cannot silently match nothing.
 *
 * Budgets are measured against the copy that shipped after the #14 pass, with
 * headroom. They are a tripwire for a slot overflowing, not a style guide.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import ts from 'typescript';

const CACHE = 'node_modules/.cache/check-copy';
const require = createRequire(import.meta.url);

/** Transpiles the content modules to CJS so node can load them. */
function loadContent() {
  mkdirSync(CACHE, { recursive: true });
  for (const name of ['types', 'profile', 'de', 'en']) {
    const source = readFileSync(`src/content/${name}.ts`, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    writeFileSync(join(CACHE, `${name}.js`), outputText);
  }
  return {
    de: require(`../${CACHE}/de.js`).default,
    en: require(`../${CACHE}/en.js`).default,
  };
}

/**
 * Every slot with a real constraint, as (label, budget, extractor). Anything
 * not listed here is prose in a flexible container and is not measured.
 */
const SLOTS = [
  // Uppercase mono, wide tracking, one line. Four words is the visual system's
  // documented cap; the character budget is what actually breaks the line.
  {
    label: 'eyebrow',
    chars: 34,
    words: 4,
    pick: (c) => [
      c.home.heroEyebrow,
      c.home.problemEyebrow,
      c.home.servicesEyebrow,
      c.home.workEyebrow,
      c.home.approachEyebrow,
      c.home.faqEyebrow,
      c.services.eyebrow,
      c.services.howEyebrow,
      c.work.eyebrow,
      c.approach.eyebrow,
      c.approach.aiEyebrow,
      c.about.eyebrow,
      c.contact.eyebrow,
    ],
  },
  // One line under a service name on a homepage card at 375px.
  { label: 'services[].forWhom', chars: 78, pick: (c) => c.services.items.map((s) => s.forWhom) },
  // Sits beside the price; wraps into the number if it grows.
  {
    label: 'services[].priceNote',
    chars: 42,
    pick: (c) => c.services.items.map((s) => s.priceNote),
  },
  // Small text between the project title and the summary.
  { label: 'work.projects[].scope', chars: 46, pick: (c) => c.work.projects.map((p) => p.scope) },
  // Pills in a wrapping row; one that is too long owns its own line.
  { label: 'home.heroProof[]', chars: 46, pick: (c) => c.home.heroProof },
  // Sector label above the project title, and the stack tags beside it.
  { label: 'work.projects[].sector', chars: 34, pick: (c) => c.work.projects.map((p) => p.sector) },
  {
    label: 'work.projects[].stack[]',
    chars: 22,
    pick: (c) => c.work.projects.flatMap((p) => p.stack),
  },
  // The header availability line and the nav labels share a single row.
  { label: 'nav', chars: 14, pick: (c) => Object.values(c.nav) },
];

const content = loadContent();
const problems = [];

for (const [lang, c] of Object.entries(content)) {
  for (const slot of SLOTS) {
    const values = slot.pick(c);

    if (values.length === 0 || values.some((v) => typeof v !== 'string')) {
      problems.push(`${lang}: ${slot.label} resolved to nothing — the check is not measuring it`);
      continue;
    }

    for (const value of values) {
      if (value.length > slot.chars) {
        problems.push(`${lang} ${slot.label}: ${value.length}/${slot.chars} chars — "${value}"`);
      }
      if (slot.words) {
        const words = value.split(/\s+/).filter((w) => w !== '·').length;
        if (words > slot.words) {
          problems.push(`${lang} ${slot.label}: ${words}/${slot.words} words — "${value}"`);
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error('check-copy: copy no longer fits its slot.\n');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nShorten the string, or widen the slot in the layout and the budget here.');
  process.exit(1);
}

console.log('check-copy: every constrained string fits, in both languages.');
