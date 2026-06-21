import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // Unit tests only; the Playwright append-only suite (*.e2e.ts) runs separately.
    include: ['tests/**/*.test.ts'],
  },
});
