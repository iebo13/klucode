import { defineConfig } from '@playwright/test';

/**
 * The pure suite. No browser, no server, no build required, so it stays fast
 * enough to run on every save. Playwright's runner is used rather than
 * node --test purely because it reads TypeScript without a loader flag, and
 * the browser suite was going to bring it in anyway.
 */
export default defineConfig({
  testDir: 'tests/unit',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
});
