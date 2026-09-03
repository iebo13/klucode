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
  projects: [
    // Everything but the frame-time measurement, headless, and that is the
    // suite: `npm run test:e2e` opens no window and runs no benchmark. Under
    // CROSSROADS_WORLD=stills, which is how CI runs it, the suite refuses
    // WebGL to every page and skips the tests about the live scene itself:
    // see the note on STILLS_ONLY in tests/e2e/crossroads.spec.ts.
    { name: 'chromium', testIgnore: /crossroads-flight/ },
    /**
     * The frame-time measurement, headed, opted in with CROSSROADS_GPU=1.
     *
     * Headless Chromium has no graphics card. It draws WebGL through
     * SwiftShader, which is a software rasteriser, and the same flight
     * measured both ways at 1440x900 says what that is worth: a mean frame
     * gap of 517.5ms headless, where the driver names itself `ANGLE (Google,
     * Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`,
     * against 8.3ms headed, where it names itself `ANGLE (Intel, Mesa
     * Intel(R) Graphics (LNL), OpenGL ES 3.2)`. That is a factor of sixty. A
     * headless benchmark would therefore measure the processor, report it as
     * the frame rate, and fail on a machine that is in fact fast enough.
     *
     * So the measurement runs headed, on the display, on the machine the site
     * is built on. That is a window opening on somebody's desktop, which is
     * not something a default `npm run test:e2e` may do and not something CI
     * can do at all, hence the opt-in: the project does not exist unless
     * CROSSROADS_GPU is set.
     *
     * The two flags ask Chromium for the real driver rather than its own
     * caution, and on this machine they are an improvement rather than the
     * difference between working and not: headed with no flags at all the
     * driver is already the Intel one and the mean gap is 8.6ms with a 95th
     * percentile of 12.0ms, against 8.3ms and 8.7ms with them. They stay
     * because a blocklisted driver elsewhere would otherwise fall back to
     * software silently, and a benchmark that quietly measures the wrong
     * thing is worse than one that refuses to run.
     */
    ...(process.env.CROSSROADS_GPU
      ? [
          {
            name: 'gpu',
            testMatch: /crossroads-flight/,
            use: {
              ...devices['Desktop Chrome'],
              headless: false,
              launchOptions: { args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] },
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory out',
    url: 'http://127.0.0.1:4173/de/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
