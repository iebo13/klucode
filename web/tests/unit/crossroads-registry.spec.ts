import { expect, test } from '@playwright/test';

import { createRegistry } from '../../src/components/crossroads/registry';

const fake = () => {
  let calls = 0;
  return {
    dispose: () => {
      calls += 1;
    },
    calls: () => calls,
  };
};

test('track returns its argument, so it can wrap a constructor call', () => {
  const r = createRegistry();
  const item = fake();
  expect(r.track(item)).toBe(item);
});

test('disposeAll disposes everything once', () => {
  const r = createRegistry();
  const a = fake();
  const b = fake();
  r.track(a);
  r.track(b);
  r.disposeAll();
  expect(a.calls()).toBe(1);
  expect(b.calls()).toBe(1);
});

test('tracking the same resource twice still disposes it once', () => {
  const r = createRegistry();
  const a = fake();
  r.track(a);
  r.track(a);
  r.disposeAll();
  expect(a.calls()).toBe(1);
});

test('disposeAll is idempotent, because unmount can race', () => {
  const r = createRegistry();
  const a = fake();
  r.track(a);
  r.disposeAll();
  r.disposeAll();
  expect(a.calls()).toBe(1);
  expect(r.size()).toBe(0);
});
