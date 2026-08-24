import { defineConfig, devices } from '@playwright/test';

/**
 * The browser suite, driven against the real static export rather than a dev
 * server, because the export is what ships and `next dev` differs from it in
 * exactly the ways that matter here (redirects, trailing slashes, chunking).
 *
 * The server is python3's, which is already on the CI image, so a test run
 * pulls nothing from the network.
 *
 * Run `npm run build` first. The webServer will not build for you, on purpose:
 * silently rebuilding hides which artefact a failure came from.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory out',
    url: 'http://127.0.0.1:4173/de/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
