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

const problems = [];
let checked = 0;
for (const [, name, hex, path] of source.matchAll(DECL)) {
  checked += 1;
  const want = resolve(path).replace('#', '').toLowerCase();
  if (hex.toLowerCase() !== want) {
    problems.push(`${name}: palette says #${hex}, ${path} is ${resolve(path)}`);
  }
}

if (checked === 0) {
  problems.push('no palette entries matched `name: 0xRRGGBB, // token.path`');
}

if (problems.length > 0) {
  for (const p of problems) console.error(`::error::scene palette: ${p}`);
  process.exit(1);
}

console.log(`scene palette: ${checked} colours match their tokens`);
