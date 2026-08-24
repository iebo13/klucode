import { expect, test } from '@playwright/test';

import { LABELS } from '../../src/components/crossroads/labels';
import {
  drawDashboard,
  drawLanding,
  drawWorkScreen,
  type Ctx,
} from '../../src/components/crossroads/textures';

/** A context that draws nothing and remembers every string it was asked to write. */
function recorder() {
  const drawn: string[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect: () => {},
    fillText: (t: string) => {
      drawn.push(t);
    },
    beginPath: () => {},
    moveTo: () => {},
    arcTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
  } as unknown as Ctx;
  return { ctx, drawn };
}

/** Every string anywhere in a nested structure of strings, arrays and objects. */
function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn);
  return [];
}

const HAS_LETTER = /\p{L}/u;

for (const lang of ['de', 'en'] as const) {
  test(`${lang}: the landing page draws only words it was handed`, () => {
    const { ctx, drawn } = recorder();
    drawLanding(ctx, LABELS[lang].landing);
    const allowed = new Set(stringsIn(LABELS[lang].landing));
    expect(drawn.filter((s) => HAS_LETTER.test(s) && !allowed.has(s))).toEqual([]);
    expect(drawn.length).toBeGreaterThan(10);
  });

  test(`${lang}: the dashboard draws only words it was handed`, () => {
    const { ctx, drawn } = recorder();
    drawDashboard(ctx, LABELS[lang].dashboard);
    const allowed = new Set(stringsIn(LABELS[lang].dashboard));
    expect(drawn.filter((s) => HAS_LETTER.test(s) && !allowed.has(s))).toEqual([]);
    expect(drawn.length).toBeGreaterThan(15);
  });
}

test('the office screen draws no words at all, so it needs no translation', () => {
  const { ctx, drawn } = recorder();
  drawWorkScreen(ctx);
  expect(drawn).toEqual([]);
});

test('no scene label breaks the house copy rule', () => {
  for (const lang of ['de', 'en'] as const) {
    for (const s of stringsIn(LABELS[lang])) {
      expect(s, `em dash in "${s}"`).not.toContain('—');
      expect(s, `semicolon in "${s}"`).not.toContain(';');
    }
  }
});
