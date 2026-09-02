# The crossroads on stills

Date: 2 September 2026. Supersedes, for the homepage section, the live three.js scene specified in `2026-08-24-crossroads-services-3d-design.md` and the depth pass in `2026-09-02-crossroads-depth-and-hand-design.md`. Those documents stay as the record of the scene's composition, which this design keeps: four ways on lanes from a junction, the same objects, the same five shots.

## 1. Why

After thirteen tasks of the depth pass the owner judged the live scene "taking so long, with no real improvements". The look was capped by its material: code-built boxes with edge drawings, lit and tuned in a browser at 150 kB. A spike the same day rebuilt the composition in Blender and rendered it with Cycles. Real soft light, contact shadows, a floor that falls to the page ink, exact screens, glowing lamps, neighbours out of focus. The owner chose it.

So the section shows pre-rendered stills. The camera no longer runs in the visitor's browser; it ran once, here.

## 2. What a visitor sees

Nothing about the section's contract changes for the reader:

- The copy panel stands on the left with the four priced rows, every row a link to its card on the services page.
- To the right, the world: the junction with all four objects and their labels, and on hover or keyboard focus of a row, the way that row names, in a close-up with its label.
- The names stand at the objects, once, as chips.
- The section is full bleed and the world is the section's own ink.
- On phones and narrow widths the price board and a poster picture, as today.

What changes:

- The change of view is a crossfade between two stills (500 ms), not a camera glide. Reduced motion gets a cut.
- The chips on the junction are live: pointing at one lights its row and itself, clicking one opens the row's link. Pointing does not change the picture. (Amended 2 September after the first build: a chip that crossfaded the picture away from under the pointer that touched it was a surprise, and the rows already give every close-up.)
- Pinned track (section 6): on a tall enough viewport the section holds for five snapping stops, junction then the four ways, and releases at the end. The owner asked for this on 2 September; it reverses the 25 August unpin.
- No WebGL is needed, so a browser without it is no longer a refusal. Reduced motion is no longer a refusal either: stills do not move.

## 3. The assets

Rendered by `web/tools/blender/crossroads.py` with Blender 4.5 headless (Cycles, CPU), from the captured screen textures. Committed under `web/public/crossroads/`.

### 3.1 Framing

Each still is the free region beside the panel at the 1440x900 viewport: 808x998 CSS pixels, rendered at 2x (1616x1996) and downscaled to 1x. The camera is the scene's own for that shot (`fovFor(fitH, fitV, 808 / 998)`, the lane stand-offs, the junction position), with the principal point at the centre of the still. No panel reserve is rendered, because the panel is not part of the picture any more.

Five shots: `junction`, `website`, `app`, `capacity`, `care`.

### 3.2 Edges

The sky is transparent (film transparent), the far floor is misted to the page ink `#1c201c` exactly, and the still's alpha is multiplied by a soft box so the near floor and the sides fade to nothing over the outer part of the frame. The box is narrower than the frame on every still, the junction's included (0.94 of the width, the close-ups 0.9), so the fade completes inside the frame and no column of pixels is left at half alpha; the page adds no fade of its own. The objects and the light pool stay at full alpha. That is what lets a still sit anywhere on the ink with no visible edge at any stage size.

Colour management is Standard (no filmic curve), so the screens show the texture's own colours and the ink is the ink.

### 3.3 Placement

The page fits a still into the free region (the stage minus the panel's reserve) with contain semantics: scale `s = min(freeW / 808, stageH / 998)`, centred in the free region horizontally and in the stage vertically. At 1440x900 that is the render exactly; at 1920x1080 the objects keep their size with ink either side; at 1024x998 the island shrinks to fit the narrow column, which is what the live camera's field of view did.

Both 1x and 2x files are offered through `srcset`.

### 3.4 Labels

The render writes each object's anchor (the top-centre of its bounding box plus the mark lift) projected into still pixels for every shot. `web/tools/blender/emit-stills.mjs` turns that into `web/src/components/crossroads/stills.ts`, a generated data module: the still size, the five files, and per shot the four anchors with an `on` flag (junction: all four; close-up: only its own way). The component maps anchors through the same contain transform and keeps today's placement rules: nudged into the free region by up to half a chip, dropped past that, never under the panel, never above the top.

### 3.5 Poster

The phone and fallback poster is rendered by the same script in a wide framing (`--frame poster`, 1600x1000, all four objects centred) and cropped by `tools/blender/emit-stills.mjs` into the two files the page already uses, `public/crossroads.webp` (1600x516 strip) and `public/crossroads-phone.webp` (880x657 upright). `tools/shoot-poster.mjs` goes.

### 3.6 Budget

Five stills at 1x and 2x as WebP with alpha: under 400 kB in total, lazily loaded, only where the section mounts. The eager page chunk shrinks: no scene boot, no three.js, no deferred chunk at all. `scripts/check-bundle.mjs` changes from "the deferred scene chunk is under its cap" to "no chunk carries three.js and the eager chunk is within its baseline".

## 4. The component

`web/src/components/crossroads/index.tsx` keeps its shape: the section, the stage, the panel, the rows, the marks layer. What it holds behind the panel is a stack of five `<img class="crossroads-still">`, one per shot, absolutely positioned by the contain transform, `aria-hidden`, with `data-key` and `data-on`. The one whose key is the current aim has `data-on="true"` and opacity 1; the others opacity 0. Opacity transitions 500 ms under `prefers-reduced-motion: no-preference`.

The aim is the row under the pointer or holding focus, else the track's way (section 6), else the junction.

`enhanced` becomes `ROOM` alone (width at least 64rem). The reveal stays: the stack fades in when a fifth of the stage is on screen (`data-revealed` on the section), so a reader arriving at the section sees the world appear rather than already there.

The marks layer keeps its DOM and its placement, fed from `stills.ts` instead of a frame callback. On the junction the chips take pointer events: entering one sets the aim to its way, clicking one clicks its row. On close-ups they are chrome as before.

The theme switch no longer repaints anything: the stills' ink is transparent, so the section's own background shows through in both themes.

## 5. What goes

- `scene.ts`, `objects.ts`, `surfaces.ts`, `registry.ts`, `journey.ts`, and `types.ts` loses `Shot`, `Mark`, `Handle`, `BootOptions`.
- The `three` dependency and its types.
- `tests/unit/crossroads-framing.spec.ts`, `crossroads-journey.spec.ts`, `crossroads-objects.spec.ts`, `crossroads-registry.spec.ts`, `tests/unit/support/scene.ts`.
- `tools/shoot-poster.mjs`. `tools/shoot.mjs` stays, adapted: it waits for the stills instead of the canvas.
- `scripts/check-scene-palette.mjs` stays: `palette.ts` is still the colour source for the Blender script (which carries a copy the gate does not yet check; see section 8).

What stays: `textures.ts`, `labels.ts`, `palette.ts`, `types.ts` (`SceneLabels`, `Way`) and `tests/unit/crossroads-textures.spec.ts`. They are the source of the screen textures and are not imported by the site any more, so they ship nothing. `tools/blender/capture-textures.mjs` compiles them with `tsc` into the build's static root and draws them on the built page, where the site's fonts are loaded.

## 6. The track

Unchanged from `2026-09-02-crossroads-depth-and-hand-design.md` section 12, restated so this document stands alone.

- Pinned when `(min-width: 64rem)` and a height floor hold. The floor is measured, not chosen: the pinned panel's height plus the header clearance plus the bottom padding, rounded up to the rem. Measured after the first build the panel is 816 px in German at 1440 wide with 0.5rem row padding; with the tightened pinned paddings of section 6a it is expected near 760 px, so the floor is expected at 55rem (880 px), which pins 1440x900 and 1920x1080 and leaves 1536x864 and 1366x768 unpinned, where the section is its own height and behaves as it did.
- Pinned, the section is a track of `100svh + 5 * 30svh`; the stage is sticky at the top, 100svh tall, with the panel inside it.
- 6a. Pinned, the layout clears the site's fixed header: `padding-top` equal to the root's `scroll-padding-top` (5.5rem), `padding-bottom` 1rem, and the panel tightens so it fits under the header at the floor: panel padding 1.25rem, row padding 0.25rem, the hint's and the link's top margins 1rem. (Amended 2 September: the first build measured the header capsule covering the panel's eyebrow for the whole ride.)
- At 1440x900 the pinned stage is 900 px tall, so the still is placed at scale 0.902 rather than the render's own 1.0; the fade at its edges is what makes that invisible. The render's aspect is the lever if the exact render is ever wanted back on the pinned page.
- Five stops one band apart, `scroll-snap-align: start`, and `html:has(#services[data-pinned='true']) { scroll-snap-type: y proximity }`.
- `scrollWay(y, band)` in a new `track.ts` with no imports: band 0 is the junction, band k is way k-1, clamped to the last way.
- A hovered or focused row overrides the track; letting go returns to the track's way, not the junction.

## 7. Tests

Unit: `track.spec.ts` (the band maths), `stills.spec.ts` (the generated module: five stills, four anchors each, every anchor inside the still, the junction's all on, each close-up's own on and the others off), `crossroads-textures.spec.ts` as today.

Browser (`tests/e2e/crossroads.spec.ts`), against the export: with stills; on a phone; on a narrow laptop; with JavaScript off; the fallback is not a dimmed copy; every row is a link; the aim follows the pointer and the keyboard (asserting `data-on` on the stills and `data-focus` on the rows); no console errors on hover and leave; every label stands inside the free region and no two collide, per viewport; the name at the object is read once; the stack is hidden until looked at; under the pin height no scroll cost; pinned, the track walks the four routes, a hover overrides, the end releases; every row names its own service, per language.

## 8. Follow-ups, not in this pass

- A palette JSON emitted from `palette.ts` for the Blender script, so `check:palette` also guards the render's colours.
- Better models in Blender: thinner bezels, a detailed rack, a plant and a lamp in the office. The pipeline is the point; the shapes are the next lever.
- A short arrival clip per way (WebM) if the owner wants motion back.
