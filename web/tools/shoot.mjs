/**
 * Screenshots the crossroads at the junction and at every stop, at every
 * viewport width a world mounts on, and prints what it measured on the way.
 *
 * Not a test and not in CI. It is the thing you run when a change to the frame
 * needs looking at as well as asserting on, and it exists because the
 * alternative is hovering by hand and losing the numbers. The assertions live
 * in tests/e2e/crossroads.spec.ts.
 *
 *     npm run build
 *     python3 -m http.server 4173 --bind 127.0.0.1 --directory out &
 *     node tools/shoot.mjs
 *
 * Shoots the live scene by default and the five pre-rendered stills under
 * SHOOT_WORLD=stills, which turns WebGL off the way the browser suite does, so
 * the two worlds can be put side by side without two builds. `--flight` shoots
 * the two frames between the stops instead, at 1440x900 only.
 *
 * Writes shots/<viewport>-<index>-<name>.png, with a `dark-` prefix under
 * `--dark` and a `stills-` prefix under SHOOT_WORLD=stills. The directory is
 * gitignored.
 *
 * The panel line it prints is what the ride in globals.css has to absorb:
 * pinned, the panel stands inside 100svh where it fits and rides the track
 * where it does not, so re-run this after a copy change to the rows to see
 * what each viewport is left with.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = process.env.SHOOT_BASE ?? 'http://127.0.0.1:4173';
// `--dark` shoots the dark theme, which the stills have to sit on as well as
// on the light one: nothing in a still is the page's ink, so the section's
// own background shows through in both, and this is how that is checked.
const DARK = process.argv.includes('--dark');
const LANG = process.env.SHOOT_LANG ?? 'de';
// The stills world, on a browser that can perfectly well draw the live one:
// the component asks canvas.getContext for a WebGL context and mounts the
// pictures when it is refused, so refusing it is the whole of the switch. The
// same script the browser suite installs, for the same reason.
const STILLS = process.env.SHOOT_WORLD === 'stills';
/**
 * `--flight` shoots the frames BETWEEN the stops instead of the stops.
 *
 * The five stops are the two worlds' common ground and the only frames the
 * stills ever had, so they are what a before and after is made of. What the
 * live world added is the travel between them, and no shot of a stop shows
 * it. The path puts the camera over the hub at every half band (see
 * spline.ts), looking down the stroke it is about to fly, so 0.5 is the hub
 * looking away down the stem at the website screen and 1.5 is the hub again
 * looking down the upper arm at the app, with the website's monitor sliding
 * out of frame behind the panel. Those two frames are the argument for the
 * section being real time at all, which is why the tool can take them and why
 * it takes them at one width: the flight is the same flight at every
 * viewport, and three copies of it prove nothing.
 */
const FLIGHT = process.argv.includes('--flight');

const VIEWPORTS = FLIGHT
  ? [{ name: '1440x900', width: 1440, height: 900 }]
  : [
      { name: '1024x736', width: 1024, height: 736 },
      { name: '1440x900', width: 1440, height: 900 },
      { name: '1920x1080', width: 1920, height: 1080 },
    ];

/**
 * What to shoot: either the junction and the four close-ups in the order the
 * rows stand, each reached by hovering its row, or the two mid-flight frames,
 * each reached by scrolling the track to a position between two stops. `at`
 * is that position, in bands below the section's top, and it is the same
 * number the page computes as `scrollT`.
 */
const SHOTS = FLIGHT
  ? [
      { name: 'flight-hub', at: 0.5 },
      { name: 'flight-stem', at: 1.5 },
    ]
  : ['junction', 'website', 'app', 'capacity', 'care'].map((name) => ({ name }));

/** A band, as a percentage of the viewport's height. BAND_SVH in src/components/crossroads/track.ts. */
const BAND_SVH = 30;

mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport, colorScheme: DARK ? 'dark' : 'light' });
  if (STILLS) {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (typeof type === 'string' && type.toLowerCase().includes('webgl')) return null;
        return real.call(this, type, ...rest);
      };
    });
  }
  await page.goto(`${BASE}/${LANG}/`);
  // The world is up: the scene has drawn its first frame, or a still is
  // showing. 30 seconds because a headless browser draws WebGL through
  // SwiftShader on the CPU and the place is four glTF bodies and five textures.
  await page.waitForSelector(
    STILLS
      ? '#services img.crossroads-still[data-on="true"]'
      : '#services canvas.crossroads-canvas[data-ready="true"]',
    { timeout: 30000 },
  );
  // The section's top ON the viewport's top, which is the head of the track.
  // Not scrollIntoView: html carries scroll-padding-top: 5.5rem for the fixed
  // header and scrollIntoView honours it, which would leave the pinned stage
  // hanging 88px down with the last row of the panel below the fold.
  await page.evaluate(() => {
    const el = document.querySelector('#services');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  });
  await page.waitForSelector('#services[data-revealed="true"]', { timeout: 20000 });

  /**
   * Waits for the camera to stop, or for the crossfade to finish.
   *
   * Two readings of data-parked rather than one, and the second is the point.
   * A pointer moving onto a row draws a frame of its own before React has
   * committed anything, so for a few milliseconds after a hover the section
   * says parked with the PREVIOUS shot on the canvas, and a screenshot taken
   * there is of the frame before the one asked for. A loop still parked 300ms
   * later, with the same frame count, has nothing pending.
   */
  const rest = async () => {
    if (STILLS) {
      // The crossfade is 500ms and the label fade 200ms. Shorter and every
      // screenshot catches the section mid-change and reads as a fault.
      await page.waitForTimeout(800);
      return;
    }
    for (let i = 0; i < 100; i += 1) {
      const before = await page.evaluate(() => document.querySelector('#services').dataset);
      if (before.parked === 'true') {
        await page.waitForTimeout(300);
        const after = await page.evaluate(() => document.querySelector('#services').dataset);
        if (after.parked === 'true' && after.frames === before.frames) return;
      } else await page.waitForTimeout(200);
    }
    console.log('  (the render loop never stopped moving)');
  };
  await rest();

  const box = await page.evaluate(() => {
    const section = document.querySelector('#services');
    const stage = document.querySelector('.crossroads-stage');
    const panel = document.querySelector('.crossroads-copy');
    // The stills world places a box; the live world composes into the free
    // region with a lens and has no box of its own to report.
    const stack = document.querySelector('.crossroads-stills');
    const s = stage.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const k = stack?.getBoundingClientRect();
    return {
      world: section.dataset.world,
      stage: [Math.round(s.width), Math.round(s.height)],
      panel: [Math.round(p.width), Math.round(p.height)],
      still: k
        ? `still ${Math.round(k.width)}x${Math.round(k.height)} at ${(k.width / 808).toFixed(3)}`
        : 'canvas full bleed',
      reserve: Math.round(p.right - s.left),
      pinned: section.dataset.pinned,
      viewports: (section.offsetHeight / window.innerHeight).toFixed(2),
    };
  });
  console.log(
    `${viewport.name}: world ${box.world}, section ${box.viewports} viewports, pinned ${box.pinned}, ` +
      `stage ${box.stage.join('x')}, panel ${box.panel.join('x')}, reserve ${box.reserve}px, ` +
      `free ${box.stage[0] - box.reserve}px, ${box.still}`,
  );

  for (const [i, shot] of SHOTS.entries()) {
    const { name, at } = shot;
    if (at !== undefined) {
      // The track, not a row: the camera is placed by where the section's top
      // stands relative to the viewport's, so the shot is taken by scrolling
      // to it and waiting for the loop to park at the pose that position asks
      // for. Nothing is hovered, so no row is lit and no chip is forced.
      //
      // The snap has to come off first, and this is the whole difficulty of
      // shooting between the stops. globals.css puts `scroll-snap-type: y
      // proximity` on the root while a pinned section is on the page, and a
      // scrollTo is a finished scroll as far as the browser is concerned, so a
      // half-band scroll is snapped straight back to the stop it left:
      // measured here, half a band down the page had not moved at all and a
      // band and a half down it had moved exactly one band. A reader's own
      // gesture is snapped when it ends and not while it happens, so these
      // positions are ones a reader rides through and cannot rest on, which is
      // exactly what a picture of the travel should show.
      await page.evaluate(
        ({ bands, svh }) => {
          const el = document.querySelector('#services');
          document.documentElement.style.scrollSnapType = 'none';
          const band = (window.innerHeight * svh) / 100;
          const top = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: top + band * bands, behavior: 'instant' });
        },
        { bands: at, svh: BAND_SVH },
      );
    } else if (name === 'junction') {
      await page.mouse.move(5, 5);
    } else {
      await page.hover(`#services li[data-key="${name}"] a`);
    }
    await rest();

    const seen = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('.crossroads-mark')]
        .map((el, j) => ({ n: String(j + 1).padStart(2, '0'), el }))
        .filter(({ el }) => el.dataset.on === 'true')
        .map(({ n, el }) => ({ n, r: el.firstElementChild.getBoundingClientRect() }));
      const clashes = [];
      for (let a = 0; a < shown.length; a += 1) {
        for (let b = a + 1; b < shown.length; b += 1) {
          const p = shown[a].r;
          const q = shown[b].r;
          const over =
            Math.max(0, Math.min(p.right, q.right) - Math.max(p.left, q.left)) *
            Math.max(0, Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top));
          if (over > 0) clashes.push(`${shown[a].n}/${shown[b].n}`);
        }
      }
      return {
        stop: document.querySelector('#services').dataset.stop,
        frames: document.querySelector('#services').dataset.frames ?? '-',
        focus: document.querySelector('#services li[data-focus="true"]')?.dataset.key ?? '-',
        marks: shown.map((m) => `${m.n}@${Math.round(m.r.left)},${Math.round(m.r.top)}`),
        clashes,
      };
    });
    // The world is in the name, and it has to be: a stills run and a live run
    // shoot the same five shots at the same three viewports, so without the
    // prefix the second one silently overwrites the first and a before-and-
    // after built from what is left compares a world with itself.
    const prefix = `${STILLS ? 'stills-' : ''}${DARK ? 'dark-' : ''}`;
    const file = `shots/${prefix}${viewport.name}-${String(i).padStart(2, '0')}-${name}.png`;
    // The VIEWPORT, not the section element. Pinned, the section is two and a
    // half viewports of which one and a half is the track's runway, so a shot
    // of the element is mostly empty ink and shows nothing a reader ever sees
    // at once.
    await page.screenshot({ path: file });
    console.log(
      `  ${name.padEnd(9)} stop ${seen.stop.padEnd(9)} focus ${seen.focus.padEnd(9)} ` +
        `frames ${seen.frames.padEnd(5)} ${seen.marks.join('  ') || '(no labels)'}` +
        (seen.clashes.length ? `   <-- LABELS OVERLAP ${seen.clashes.join(' ')}` : ''),
    );
  }
  await page.close();
}
await browser.close();
