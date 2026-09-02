# The Crossroads on Stills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The homepage services section shows five pre-rendered Blender stills (junction and four ways) with a crossfade on hover, live chips, and a pinned snapping track; the three.js scene and its dependency leave the site.

**Architecture:** `web/tools/blender/crossroads.py` renders the free region beside the panel as a transparent, edge-faded still per shot, plus a wide poster; `emit-stills.mjs` writes the WebPs and a generated `stills.ts` with per-shot label anchors. `index.tsx` keeps its section, panel, rows and marks layer and replaces the canvas with a stack of five `<img>`s placed by a contain transform; the aim (row under pointer, else the track's way, else the junction) picks the visible still. The scene modules, the `three` dependency and their tests go; the texture drawings stay as the pipeline's source.

**Tech Stack:** Next.js 15.5 static export, React 19, TypeScript, Blender 4.5 LTS headless (`~/opt/blender/blender`), sharp, Playwright 1.62 (unit config without a browser; e2e against `out/` on port 4173).

**Spec:** `docs/superpowers/specs/2026-09-02-crossroads-stills-design.md`

## Global Constraints

- Working directory for every npm and node command is `web/`. Repo root `/mnt/Extra/Main_Development_Folder/klucode`.
- Branch `claude/crossroads-stills-2026-09-02`. Commit to it, do not touch `main`, do not push.
- Code, comments and commit messages are English. No long dash anywhere (U+2013 or U+2014), in code, comments, copy or commit messages. No attribution lines or trailers in commits.
- Rendered copy has no em dash and no semicolon.
- Comments explain why, in full sentences, in the style the files already have. Every number in a comment is measured.
- The section's fallback (`data-enhanced="false"`) is untouched: phones, narrow widths and JavaScript off keep the price board and the poster.
- Stills are transparent WebP with alpha; the section's own background is the only ink on screen. No new colour anywhere; the palette is `palette.ts` and the Blender script's copy of it.
- The generated module `stills.ts` is written only by `tools/blender/emit-stills.mjs`; nothing edits it by hand.
- Every gate stays green at the end of every task: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run test:unit`, `npm run build`, `npm run check:bundle` (as rewritten in Task 3), `npm run check:palette`, `npm run check:copy`, `npm run check:meta`, `npm run test:e2e` (`--workers=1` is acceptable on this desktop).
- Browser tests keep `tests/e2e/crossroads.spec.ts` as the one file for the section, per viewport where the spec says so.

---

### Task 1: The assets and the generated module

Done by the controller (it owns the Blender pipeline). Recorded here so the interfaces are written down for Task 2.

**Files:**
- Modify: `web/tools/blender/crossroads.py` (`--frame free|full|poster`, the alpha mask, the poster framing)
- Create: `web/tools/blender/emit-stills.mjs`
- Create: `web/public/crossroads/{junction,website,app,capacity,care}.webp` and `...@2x.webp`
- Replace: `web/public/crossroads.webp`, `web/public/crossroads-phone.webp`
- Create: `web/src/components/crossroads/stills.ts` (generated)
- Create: `web/tests/unit/crossroads-stills.spec.ts`

**Interfaces produced (Task 2 consumes exactly these):**

```ts
// web/src/components/crossroads/stills.ts (generated)
import type { ServiceKey } from './types';

export type StillKey = 'junction' | ServiceKey;
export type Anchor = { x: number; y: number; on: boolean };
export type Still = { src: string; src2x: string; marks: Record<ServiceKey, Anchor> };

/** The still's size in CSS pixels at 1x: the free region beside the panel at 1440x900. */
export const STILL = { width: 808, height: 998 } as const;
export const STILL_ORDER: readonly StillKey[] = ['junction', 'website', 'app', 'capacity', 'care'];
export const STILLS: Record<StillKey, Still> = { /* generated */ };
```

`src` and `src2x` are site-root paths such as `/crossroads/junction.webp`; the component wraps them with `asset()`. Anchors are in still pixels at 1x, `x` from the left, `y` from the top; `on` is true for all four on the junction and for the shot's own way only on a close-up.

- [ ] **Step 1:** `crossroads.py` gains `--frame`: `free` (W 808, H 998, no reserve, the default), `full` (1440x998, reserve 632, the spike's framing), `poster` (1600x1000, no reserve, the junction with the wide fit). The alpha mask: a box mask blurred in the compositor multiplies the alpha (width 1.0 for the junction, 0.92 for close-ups, height 0.86, centre y 0.52, blur 70 px at 1x), not applied to the poster. `anchors.json` records `scale`.
- [ ] **Step 2:** Render the five stills at `--scale 2 --samples 128` and the poster at `--frame poster --scale 1 --preview 1`.
- [ ] **Step 3:** `emit-stills.mjs`: WebP at 2x (`quality 84, alphaQuality 90`) and 1x (lanczos3 downscale) into `public/crossroads/`, the poster crops into `public/crossroads.webp` (1600x516 strip) and `public/crossroads-phone.webp` (880x657 upright), and `stills.ts`.
- [ ] **Step 4:** `crossroads-stills.spec.ts`: five stills in `STILL_ORDER`, every still has four anchors inside `STILL`, the junction has all four `on`, every close-up has exactly its own way `on`, every `src` and `src2x` file exists under `public/`.
- [ ] **Step 5:** Commit: "The crossroads is rendered: five stills, a poster, and the anchors they were rendered with".

---

### Task 2: The section runs on stills

**Files:**
- Modify: `web/src/components/crossroads/index.tsx`
- Modify: `web/src/app/globals.css`
- Create: `web/src/components/crossroads/track.ts`
- Create: `web/tests/unit/crossroads-track.spec.ts`
- Modify: `web/tests/e2e/crossroads.spec.ts`
- Modify: `web/tools/shoot.mjs`

**Interfaces:**
- Consumes: `STILL`, `STILL_ORDER`, `STILLS`, `Anchor`, `StillKey` from `./stills`; `Way`, `ServiceKey` from `./types`.
- Produces: on the section `data-enhanced`, `data-pinned`, `data-revealed`, `data-still` (the key of the visible still); in the stage `.crossroads-stills > img.crossroads-still[data-key][data-on]`; `.crossroads-track`, `.crossroads-stop`; `scrollWay`, `BAND_SVH`, `WAYS` from `track.ts`.

- [ ] **Step 1: The track maths, test first**

`web/tests/unit/crossroads-track.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import { BAND_SVH, scrollWay } from '../../src/components/crossroads/track';

test('the track selects a way per band, the junction first, and clamps past the end', () => {
  const band = 270;
  expect(BAND_SVH).toBe(30);
  expect(scrollWay(0, band)).toBe(-1);
  expect(scrollWay(band - 1, band)).toBe(-1);
  expect(scrollWay(band, band)).toBe(0);
  expect(scrollWay(2 * band - 1, band)).toBe(0);
  expect(scrollWay(2 * band, band)).toBe(1);
  expect(scrollWay(3 * band, band)).toBe(2);
  expect(scrollWay(4 * band, band)).toBe(3);
  expect(scrollWay(5 * band, band)).toBe(3);
  expect(scrollWay(99 * band, band)).toBe(3);
  expect(scrollWay(-50, band)).toBe(-1);
  expect(scrollWay(100, 0)).toBe(-1);
});
```

`web/src/components/crossroads/track.ts` (no imports, so it costs the eager chunk a few hundred bytes):

```ts
/**
 * The height of one band of the track, in svh. Five bands, junction then the
 * four ways, so the track adds 150svh of travel: about nine wheel notches at
 * 900px, against the eighteen the 25 August audit measured for the old
 * track, and with a snap on every boundary so a flick lands on a route.
 */
export const BAND_SVH = 30;

/** How many ways the track walks. The stills are rendered for exactly this many. */
export const WAYS = 4;

/**
 * The way the track selects when the section's top has scrolled `y` pixels
 * above the viewport's top, with bands `band` pixels tall. Band 0 is the
 * junction, band k is way k - 1, and past the last band the way stays the
 * last one: the stage releases because the track runs out, not because this
 * says so.
 */
export function scrollWay(y: number, band: number, ways = WAYS): number {
  if (band <= 0 || y < band) return -1;
  return Math.min(ways - 1, Math.floor(y / band) - 1);
}
```

- [ ] **Step 2: The component**

Rewrite `index.tsx` keeping its section, panel, rows, hint, poster fallback and marks layer. The changes:

1. `canMount()` becomes `ROOM` alone. The WebGL probe and the reduced-motion refusal go, with a comment saying why: stills need no GPU and do not move. `groundOf`, the theme-repaint effect, `SCENE_MARKER`, `Handle`, the canvas and view refs and the dynamic `import('./scene')` go.
2. State: `enhanced`, `phoneCrop`, `focus`, `pinned`, `scrollWayNow`, `revealed`. Derived: `const aim = focus >= 0 ? focus : scrollWayNow;` and `const still: StillKey = aim >= 0 ? ORDER[aim]! : 'junction';`.
3. The pin query beside `ROOM`, watched the way `ROOM` is:

```ts
/**
 * The room the TRACK needs, on top of ROOM: a viewport tall enough for the
 * copy panel to stand inside a pinned stage. Measured at 1440 wide the panel
 * is about 780px with the pinned paddings, so 51rem (816px) pins 1440x900 and
 * 1536x864 and leaves 1366x768 unpinned, where the section is its own height.
 */
const PIN = '(min-width: 64rem) and (min-height: 51rem)';
```

4. Metrics: `metrics.current = { reserve, stageW, stageH, half, tall }` as today, measured on mount, fonts ready and resize. Add the contain transform and apply it to the stack and the marks in one `layout()` called from `measure()` and whenever `still` changes:

```ts
/** The contain transform of a still inside the free region. */
function fit(reserve: number, stageW: number, stageH: number) {
  const freeW = Math.max(0, stageW - reserve);
  const s = Math.min(freeW / STILL.width, stageH / STILL.height);
  return {
    s,
    ox: reserve + (freeW - STILL.width * s) / 2,
    oy: (stageH - STILL.height * s) / 2,
  };
}
```

The stack element gets `style.transform = translate3d(ox, oy, 0) scale(s)` with `transform-origin: 0 0` and a fixed CSS size of `STILL.width x STILL.height`, so all five images share one transform. Marks: for way i, `const a = STILLS[still].marks[ORDER[i]]`; `mark.x = ox + a.x * s`, `mark.y = oy + a.y * s`, and `front = a.on`. Then today's `place()` rules, unchanged: nudged into `[reserve + MARK_GAP + half, stageW - MARK_GAP - half]`, `y >= MARK_GAP + tall`, dropped past half a chip, `data-on` written.

5. The track input effect and the stops, exactly as the spec's section 6:

```ts
  useEffect(() => {
    if (!pinned) {
      setScrollWayNow(-1);
      return;
    }
    const section = sectionRef.current;
    if (!section) return;
    const read = () => {
      const band = (window.innerHeight * BAND_SVH) / 100;
      setScrollWayNow(scrollWay(-section.getBoundingClientRect().top, band));
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [pinned]);
```

6. The reveal: an IntersectionObserver on the stage at threshold 0.2 sets `revealed` once. The section carries `data-revealed`.
7. Markup inside the stage, replacing the view and canvas:

```tsx
        {enhanced ? (
          <div ref={stackRef} aria-hidden="true" className="crossroads-stills">
            {STILL_ORDER.map((key) => (
              <img
                key={key}
                data-key={key}
                data-on={still === key}
                className="crossroads-still"
                src={asset(STILLS[key].src)}
                srcSet={`${asset(STILLS[key].src)} 1x, ${asset(STILLS[key].src2x)} 2x`}
                width={STILL.width}
                height={STILL.height}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        ) : null}
```

The section gets `data-still={still}`, `data-pinned={pinned}`, `data-revealed={revealed}`. The stage is wrapped in `.crossroads-track` with the five `.crossroads-stop`s rendered only when pinned (`top: k * BAND_SVH svh`).

8. Chips: on the junction they take pointer events. Each `.crossroads-mark-box` gets `onMouseEnter={() => setFocus(i)}` and `onClick={() => rowRefs.current[i]?.click()}` where `rowRefs` holds the row `<Link>`s; the marks layer stays `aria-hidden` (the names are read once, from the rows). The marks container keeps `pointer-events: none`; the box gets `pointer-events: auto` only while `data-still="junction"` (CSS below). Leaving the stage (`onMouseLeave` on the stage) sets focus to -1 when the pointer is not going to the panel.
9. Comments: the file's own comments that describe the canvas, the deferred import, the 148 kB, the WebGL probe and the theme repaint are rewritten or removed. No number in a comment that was not measured in this task.

- [ ] **Step 3: The styles**

In `globals.css`, the crossroads block: keep `.crossroads-stage { position: relative; }`, the veil (it still fades the gutter to ink; its stops are still written by the component), the copy panel, the hint, the board, the marks. Replace the view and canvas rules with:

```css
/* The world is five stills, one per shot, stacked and placed by one transform
   the component writes from the panel's measured reserve and the stage's box:
   a still fits the free region beside the panel with contain semantics, so at
   1440x900 it is the render exactly, at 1920x1080 the objects keep their size
   with the section's ink either side, and in a narrow column it shrinks. The
   ink is the section's own: every still is transparent where there is no
   light, so there is no seam and nothing to repaint on a theme switch. */
.crossroads-stills {
  position: absolute;
  top: 0;
  left: 0;
  width: 808px;
  height: 998px;
  transform-origin: 0 0;
  pointer-events: none;
  opacity: 0;
}

[data-revealed='true'] .crossroads-stills {
  opacity: 1;
}

.crossroads-still {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}

.crossroads-still[data-on='true'] {
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .crossroads-stills {
    transition: opacity 700ms ease;
  }
  .crossroads-still {
    transition: opacity 500ms ease;
  }
}

/* The chips are live on the junction only: pointing at one is pointing at a
   row, and clicking one is clicking the row. On a close-up they are chrome. */
[data-still='junction'] .crossroads-mark-box {
  pointer-events: auto;
  cursor: pointer;
}
```

And the track block, verbatim from the spec's section 6:

```css
.crossroads-track {
  position: relative;
}

[data-pinned='true'] .crossroads-track {
  height: calc(100svh + 5 * 30svh);
}

[data-pinned='true'] .crossroads-stage {
  position: sticky;
  top: 0;
  height: 100svh;
}

[data-pinned='true'] .crossroads-layout {
  padding-block: 1rem;
}

[data-pinned='true'] .crossroads-way {
  padding-block: 0.5rem;
}

.crossroads-stop {
  position: absolute;
  left: 0;
  width: 1px;
  height: 1px;
  scroll-snap-align: start;
}

html:has(#services[data-pinned='true']) {
  scroll-snap-type: y proximity;
}
```

The `5 * 30svh` and the component's `BAND_SVH` are the same number written twice; each carries a comment pointing at the other. `[data-enhanced='false'] .crossroads-view { display: none; }` goes with the view.

- [ ] **Step 4: The browser tests**

Rewrite `tests/e2e/crossroads.spec.ts` around the stills. Helpers: `section = '#services'`, `stills = `${section} img.crossroads-still``, `shown = `${stills}[data-on="true"]``, `arrive(page)` scrolls the section's top to the viewport top and waits for `data-revealed="true"`. Tests, in this order:

1. `with stills`: at 1440x900, `data-enhanced` true, five `.crossroads-still`, exactly one `data-on`, and it is `junction`.
2. `on a phone`, `on a narrow laptop`, `with JavaScript switched off entirely`, `the fallback is not a dimmed copy of the enhanced state`, `every row is a link to its own card, with every detail open`: as today, with `canvas` assertions replaced by "no `.crossroads-still`" where they asserted no canvas. The `without WebGL` and `with reduced motion` refusal tests go; a reduced-motion test asserts the stills still mount.
3. `the view follows the pointer, and the keyboard is the same input`: hover each row, expect `data-still` equal to its key and the row `data-focus` true; tab through the rows the same way; leaving the list returns to `junction`.
4. `the chips on the junction are live`: hover the second chip, expect `data-still="app"`; click it, expect navigation to the services page's `#app`.
5. `hovering and leaving the section reports no console errors`: as today.
6. `every object is named at itself, and no two names collide` per viewport in `SIZES` (1024x736, 1440x900, 1920x1080): at the junction all four chips `data-on` true, none overlapping, none left of the panel's right edge, none above the stage; on each close-up exactly its own chip on.
7. `the name at the object is read once, not twice`: as today.
8. `the stills are hidden until the section is looked at`: load with the section below the fold, `data-revealed` false and the stack's opacity 0; scroll to it, `data-revealed` true.
9. `under the pin height the section is its own height and costs no scroll` at 1366x640 and `pinned, the track walks the four routes, a hover overrides, and the end releases` at 1440x900, exactly as the parked plan's Task 15 wrote them, with `data-still` asserted at each stop.
10. `${lang}: every row names its own service`: as today.

`tools/shoot.mjs`: wait for `${shown}` instead of the canvas, keep the label report, drop `--sample` if present.

- [ ] **Step 5: Gates, shots, commit**

`npm run lint && npm run typecheck && npm run format:check && npm run test:unit && npm run build && npm run test:e2e -- tests/e2e/crossroads.spec.ts --workers=1`, then `node tools/shoot.mjs` against the build and look at the junction and one close-up at each width. Commit: "The crossroads runs on stills: five renders, a crossfade, live chips, and a pinned snapping track".

---

### Task 3: What goes, and the gate that measures what is left

**Files:**
- Delete: `web/src/components/crossroads/scene.ts`, `objects.ts`, `surfaces.ts`, `registry.ts`, `journey.ts`
- Modify: `web/src/components/crossroads/types.ts` (keep `ServiceKey`, `Way`, `SceneLabels`; drop `Shot`, `Mark`, `Handle`, `BootOptions`)
- Delete: `web/tests/unit/crossroads-framing.spec.ts`, `crossroads-journey.spec.ts`, `crossroads-objects.spec.ts`, `crossroads-registry.spec.ts`, `web/tests/unit/support/scene.ts`
- Delete: `web/tools/shoot-poster.mjs`
- Modify: `web/scripts/check-bundle.mjs`, `web/package.json` (`npm uninstall three @types/three`), `web/README.md`, `.github/workflows/*` if they name a removed script
- Modify: `web/src/components/crossroads/textures.ts`, `labels.ts`, `palette.ts` (one header comment each saying they are the texture source for `tools/blender` and ship nothing)

- [ ] **Step 1:** Delete the files and the dependency. `grep -rn "from 'three\|from './scene\|from './objects\|from './journey\|from './registry\|from './surfaces" src tests tools scripts` finds nothing.
- [ ] **Step 2:** `check-bundle.mjs`: assert no built chunk contains `BufferGeometry` (three.js left), measure the eager page chunk against `bundle-baseline.json` (regenerate the baseline once, with the measured figure in the commit message), and drop the deferred cap, the scene markers and `expectSceneChunk`. Print the eager figure and the stills' total bytes under `public/crossroads` for the record.
- [ ] **Step 3:** README and comments: every mention of three.js, WebGL, the deferred chunk or the 148 kB in `web/README.md`, `index.tsx`, `globals.css` and the content files is rewritten or removed. `check:copy` and `check:meta` stay green.
- [ ] **Step 4:** Every gate, the three viewports shot, commit: "The three.js scene leaves the site, and the bundle gate measures the page that is left".

---

### Finish

Whole-branch review, one fix wave, then `superpowers:finishing-a-development-branch`: a pull request with before and after pictures per shot (today's `web/shots/1440x900-*.png` from main against the new shots) and the phone poster, no push without the owner's word.
