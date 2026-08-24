import { expect, test } from '@playwright/test';

import { alternatePath, keyForSlug, pathFor } from '../../src/lib/routes';

test('home is the language root', () => {
  expect(pathFor('home', 'de')).toBe('/de/');
  expect(pathFor('home', 'en')).toBe('/en/');
});

test('slugs are localised, not translated paths', () => {
  expect(pathFor('services', 'de')).toBe('/de/leistungen/');
  expect(pathFor('services', 'en')).toBe('/en/services/');
});

test('a slug resolves back to its key, and a foreign slug does not', () => {
  expect(keyForSlug('leistungen', 'de')).toBe('services');
  expect(keyForSlug('services', 'de')).toBeNull();
  expect(keyForSlug('nonsense', 'en')).toBeNull();
});

test('the language switch lands on the same page, not the root', () => {
  expect(alternatePath('work', 'de')).toBe('/en/work/');
  expect(alternatePath('home', 'en')).toBe('/de/');
});
