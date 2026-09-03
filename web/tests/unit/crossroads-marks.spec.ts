import { expect, test } from '@playwright/test';

import { MARK_GAP, placeMarks, type Metrics } from '../../src/components/crossroads/marks';

const metrics: Metrics = {
  reserve: 632,
  stageW: 1440,
  stageH: 900,
  half: [104, 122, 92, 85],
  tall: 30,
};

test('a chip stands at its anchor when there is room', () => {
  const [a] = placeMarks([{ x: 900, y: 400, on: true }], metrics);
  expect(a).toEqual({ x: 900, y: 400, on: true });
});

test('a chip is nudged into the free region by up to half its width, and dropped past that', () => {
  const [nudged] = placeMarks([{ x: 700, y: 400, on: true }], metrics);
  expect(nudged!.x).toBe(632 + MARK_GAP + 104);
  expect(nudged!.on).toBe(true);
  const [dropped] = placeMarks([{ x: 600, y: 400, on: true }], metrics);
  expect(dropped!.on).toBe(false);
  // 1370 is 46px past the right bound of 1324, under half the chip's 104.
  const [right] = placeMarks([{ x: 1370, y: 400, on: true }], metrics);
  expect(right!.x).toBe(1440 - MARK_GAP - 104);
  expect(right!.on).toBe(true);
});

test('a chip is held under the top edge and dropped off the bottom', () => {
  // Held at MARK_GAP + tall = 42: a 12px move, inside the half-height rule.
  const [top] = placeMarks([{ x: 900, y: 30, on: true }], metrics);
  expect(top!.y).toBe(MARK_GAP + 30);
  expect(top!.on).toBe(true);
  // From 5 the hold would be 37px, past half the chip's height, so it is dropped.
  const [far] = placeMarks([{ x: 900, y: 5, on: true }], metrics);
  expect(far!.on).toBe(false);
  const [low] = placeMarks([{ x: 900, y: 895, on: true }], metrics);
  expect(low!.on).toBe(false);
});

test('a chip clashing with one placed to its left is lifted a line, twice at most', () => {
  // Same line, 60px apart, chips 208 and 244 wide: one lift of tall + 4 clears it.
  const [first, second] = placeMarks(
    [
      { x: 900, y: 400, on: true },
      { x: 960, y: 400, on: true },
    ],
    metrics,
  );
  expect(first!.y).toBe(400);
  expect(second!.y).toBe(400 - (30 + 4));
  expect(second!.on).toBe(true);
  // Four on one line: the second lifts once, the third twice, the fourth has
  // nowhere left to go inside two lifts and is dropped.
  const four = placeMarks(
    [
      { x: 900, y: 400, on: true },
      { x: 910, y: 400, on: true },
      { x: 920, y: 400, on: true },
      { x: 930, y: 400, on: true },
    ],
    { ...metrics, half: [104, 104, 104, 104] },
  );
  expect(four.map((c) => c.y)).toEqual([400, 366, 332, 400]);
  expect(four.map((c) => c.on)).toEqual([true, true, true, false]);
});

test('a chip that is off is left where it is and stays off', () => {
  const [off] = placeMarks([{ x: 100, y: 100, on: false }], metrics);
  expect(off!.on).toBe(false);
});
