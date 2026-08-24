/**
 * The 3D scene cannot use CSS custom properties, because three.js wants
 * numbers. So palette.ts carries hex literals, and this asserts they are still
 * the tokens they claim to be.
 *
 * Drift here is invisible on screen: a scene painted in slightly wrong greens
 * still looks like a scene. That is exactly the class of bug worth a tripwire.
 *
 * The trailing `// token.path` comment on each palette line is the contract.
 */
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync('../brand/tokens/tokens.json', 'utf8'));
const source = readFileSync('src/components/crossroads/palette.ts', 'utf8');

/** Resolves "viridian.500" or "semantic.blueprint" to its hex string. */
function resolve(path) {
  let node = tokens.color;
  for (const key of path.split('.')) {
    node = node?.[key];
    if (node === undefined) throw new Error(`no such token: ${path}`);
  }
  return typeof node === 'string' ? node : node.value;
}

const DECL = /^\s*(\w+):\s*0x([0-9a-fA-F]{6}),\s*\/\/\s*([\w.]+)\s*$/gm;

/**
 * How many colours palette.ts is expected to carry.
 *
 * An exact count rather than a zero-guard, which only ever caught total format
 * collapse. One line that loses its trailing token comment, or gains a space
 * the pattern does not allow, simply drops out of the match: the script would
 * still exit 0, one colour lighter and that colour now free to drift, which is
 * the failure this file exists to stop. Adding or removing a colour is a
 * deliberate act and moving this number with it is part of that act.
 */
const EXPECTED = 16;

const problems = [];
let checked = 0;
for (const [, name, hex, path] of source.matchAll(DECL)) {
  checked += 1;
  const want = resolve(path).replace('#', '').toLowerCase();
  if (hex.toLowerCase() !== want) {
    problems.push(`${name}: palette says #${hex}, ${path} is ${resolve(path)}`);
  }
}

if (checked !== EXPECTED) {
  problems.push(
    `matched ${checked} entries of the ${EXPECTED} expected. A line that does not read ` +
      '`name: 0xRRGGBB, // token.path` is not checked at all, so either fix the line or ' +
      'move EXPECTED in this script to match the palette.',
  );
}

if (problems.length > 0) {
  for (const p of problems) console.error(`::error::scene palette: ${p}`);
  process.exit(1);
}

console.log(`scene palette: ${checked} colours match their tokens`);
