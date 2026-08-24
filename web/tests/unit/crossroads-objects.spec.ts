import { expect, test } from '@playwright/test';

import { BUILDERS } from '../../src/components/crossroads/objects';

test('there is exactly one builder per service, keyed and not indexed', () => {
  // Keyed, so reordering the copy cannot silently repoint an object at the
  // wrong service. A missing key here is a lane with nothing at the end of it.
  expect(Object.keys(BUILDERS).sort()).toEqual(['app', 'capacity', 'care', 'website']);
});
