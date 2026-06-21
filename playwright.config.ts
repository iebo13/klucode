import { defineConfig } from '@playwright/test';

// The append-only suite talks to Supabase directly (no browser/app server), so
// this config is deliberately minimal.
export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  reporter: 'list',
});
