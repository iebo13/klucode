# „Vier Wege zur Zusammenarbeit" as a crossroads

Design spec. 2026-08-24. Branch base: `claude/ink-paper-redesign`.

## 1. What this replaces

The homepage services section is a price board: four rows on hairlines, name
and audience and price, set on an ink band. It is honest and it is dull. It is
also the commercial core of the page, and it is the section a visitor uses to
decide whether to write.

This spec replaces that section, on the homepage only, with a scroll-driven
3D crossroads. Four lanes fan out from a junction across a floor. At the end
of each stands the thing you would actually get. The objects begin as
blueprint line drawings and become solid as you walk their lane. What is
built stays built, so the section ends on all four at once.

The price board does not go away. It is the DOM, and the 3D is drawn over and
beside it. See section 7.

## 2. Scope of this spec

In scope: the services section of `/de/` and `/en/`, end to end. Scene,
component, content contract, fallback, build gate, tests.

Out of scope, deliberately: extending the same grammar to the hero, problem,
work, approach, FAQ and contact sections. That was sketched as the „Halle"
concept and approved at concept level, but it has not been designed at the
level this spec works at, and specifying it here would mean inventing detail
we have not looked at. It gets its own spec once this one has shipped and we
have seen the crossroads on real hardware.

If the intent was one spec covering the whole page, say so and this becomes
part one of two rather than the whole thing. Nothing here changes either way.

## 3. What the geometry is allowed to say

Scope, not price.

The four offers are priced in three different units: a fixed project fee, a
day rate, and a monthly fee. Making the objects bigger or smaller by price
would compare 90 € a month with 680 € a day as if they were the same kind of
number. They are not, and a visitor who worked that out would be right to stop
reading. So the objects differ by how much machine you get, which is a true
comparison, and the prices stay as text where a reader can see their units.

This is a constraint on the modelling, not a note. Any future object added to
this scene answers to it.

## 4. The four objects

Keyed on `Service.key`, never on array index, so reordering the copy cannot
silently repoint an object at the wrong service.

| key        | Service                     | Object                                                                   |
|------------|-----------------------------|--------------------------------------------------------------------------|
| `website`  | Website & Landingpage       | One monitor on a desk, showing a real landing page                       |
| `app`      | Individuelle Web-Anwendung  | A screen with a real dashboard, plus database and server standing behind it |
| `capacity` | Entwickler-Kapazität        | An office with other people working, and one free desk                   |
| `care`     | Betrieb & Wartung           | A server rack wired up to a cloud, with a status light                   |

Reading left to right, the four appear in the order they are priced.

Nothing inside the scene is labelled. No signposts, no floating names, no 3D
text. Every word the reader sees is DOM text beside the canvas. The names are
said once.

## 5. Architecture

### 5.1 Module boundaries

    web/src/components/crossroads/
      index.tsx      client component: stage, scroll, mount predicate, focus sync
      scene.ts       three.js only. No React, no DOM beyond the canvas it is handed
      objects.ts     one builder per key, plus the shared unit/piece primitives
      textures.ts    the CanvasTexture builders
      types.ts       Way, SceneLabels, Handle

`scene.ts` knows nothing about React and nothing about German. It is handed
data and returns a handle. That is the boundary that makes it testable in
isolation and keeps `index.tsx` small enough to read in one screen.

### 5.2 The scene handle

```ts
export type Way = {
  key: 'website' | 'app' | 'capacity' | 'care';
  name: string;
  price: string;
  priceNote: string;
  forWhom: string;
  reads: string;
};

export type Handle = {
  /** Scroll progress, 0 to 1. Applies state synchronously, defers the draw. */
  set(p: number): void;
  /** Index of the way in focus, or -1 at the junction. Never stale. */
  focus(): number;
  /** How many of the four ways are finished, 0 to 4. A count, not a fraction. */
  built(): number;
  /** Cancels the loop, drops listeners, disposes every GPU resource. */
  stop(): void;
};

export function boot(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  ways: readonly Way[],
  labels: SceneLabels,
): Handle;
```

`set` splits into a synchronous `layout(p)` and a `frame()` that only draws.
This is not a micro-optimisation, it is a correctness requirement: `focus()`
is read immediately after `set()` to highlight a row, and if the state lived
in the render loop it would name the previous stop's service. The prototype
had exactly that bug.

`frame()` renders behind a `dirty` flag, so a still page costs one empty rAF
callback and no GPU work.

### 5.3 Data flow

    page.tsx (server)
      c.services.items  ->  <Crossroads ways={...} labels={...} />  (client)
                                |
                                +-- renders the four rows as DOM, always
                                +-- if mountable: boot(canvas, host, ways, labels)
                                       scroll -> set(p) -> focus() -> data-focus on rows

One direction only. The scene never writes content, it only reports which way
is in focus, and the component turns that into a `data-focus` attribute the
CSS styles. No text is ever duplicated between DOM and canvas.

### 5.4 The sticky stage

```html
<section>                       <!-- no height of its own, no overflow clip -->
  <div class="track">           <!-- height: 420svh. The runway. -->
    <div class="stage">…</div>  <!-- sticky, top: 0, height: 100svh -->
  </div>
</section>
```

The stage lives inside the track, so its travel is the track's height minus
its own: 420svh minus 100svh. It releases exactly when the track's bottom
reaches it, with no negative margin and no arithmetic to keep in step.

PR #17 got this wrong and the stage painted a full viewport past its section,
over the section below. So did the first version of this spec, which said to
zero the stage's layout height with a negative bottom margin equal to its
height. That does not work, and the reason is worth writing down: a sticky
element's travel is its containing block's height minus its own MARGIN box,
so a -100svh margin makes that margin box zero tall and hands the stage one
extra viewport of travel. Measured, it released 567px late on a 900px
viewport, which is exactly the 0.15 of section height the test probes past
the end.

The same mistake had a quieter second symptom. Progress divides by
(section height - stage height), so the journey finished a full viewport
before the stage unstuck and the last viewport of scrolling did nothing at
all.

This is the single most important regression to guard, and it gets a test:
after scrolling past the section, the stage's bounding rect bottom must be
less than or equal to the section's.

The section must NOT carry `overflow: hidden`, which every other ink section
on this page does. A clipped overflow makes an element a scroll container, and
a sticky child sticks to the nearest one, so the stage would stick to a box
that never scrolls: it would sit at the top of the section and slide away with
it, leaving four viewports of empty ink. The stage clips itself instead.

Track length of 420svh gives roughly 0.7 of a viewport of scroll per camera
stop. It is tunable, under one constraint: this section must not dominate a
page that has seven others.

Inside the stage, at 62rem and up, a two-column grid. Canvas left, copy column
right, no overlap. Below 62rem the copy sits under the canvas. The prototype
floated the copy over the canvas and it covered the leftmost object. Fixed
here by construction rather than by nudging.

### 5.5 Progress and camera stops

    p = clamp01(-sectionRect.top / (sectionRect.height - stageHeight))

Six stops: the junction at 0, the four ways at 0.18 / 0.37 / 0.56 / 0.75, and
a final wide shot at 1.00. Each way stop carries its own standoff distance and
its own look height, because an office is a room and a rack is a box and one
camera distance cannot frame both.

Read on scroll through `requestAnimationFrame`, never directly in the scroll
handler.

### 5.6 The blueprint mechanic

Every solid mesh has a `LineSegments` sibling built by `EdgesGeometry` from
the very same geometry instance. The lines therefore cannot drift out of
register with the solid, at any camera angle, ever. This is why every object
is made of boxes, cylinders and spheres.

Crossfade as a way comes into focus: solid opacity 0 to 1, line opacity 0.62
to 0.

The fade is one-way. Scrubbing back up does not un-build a way. Two reasons:
the ending is meant to be all four standing at once, and a section that
dismantles itself when you scroll back reads as a toy. Recorded as a decision
because it is the kind of thing that looks like a bug in review.

Anything whose stop is already behind the current progress counts as built.
Without that, an anchor link or a restored scroll offset lands past a stop and
leaves a way stranded as a drawing forever. Found and fixed in the prototype,
specified here so it is not lost.

### 5.7 Colour

Every colour in the scene comes from `brand/tokens/tokens.json`, which is the
repo's single source of truth and already feeds `tailwind.config.ts` and
`tokens.css`. The prototype hard-coded its palette and drifted: its accent
happened to be `viridian.500`, but its background was `#0a0b0c` where the ink
token is `#0C1A15`.

Importing `tokens.json` into a client component would ship the whole file,
metadata included, because a JSON module imports as one object and does not
tree-shake per key. So `crossroads/palette.ts` carries the five or six numbers
the scene needs as literals, each commented with its token path, and
`web/scripts/check-scene-palette.mjs` asserts they still match the JSON. Drift
becomes a failed build, which is the same bargain `tokens.css` already makes.

The blueprint line blue is not in the palette yet. It enters `tokens.json` as
a new swatch, regenerated through `build_css.py` so the CI staleness check
passes. It goes in the palette and not in `role`: it is a line colour in a 3D
scene, never text on a surface, so `check_contrast.py` has nothing to say
about it and should not be given a role to audit.

## 6. Textures

Two surfaces carry real interfaces, drawn to a 2D canvas at boot and used as a
`CanvasTexture`: the landing page on object 01 and the dashboard on object 02.
No image files, no font loader, no asset pipeline, no third-party request.
That last one is not a nicety, the site's privacy claim depends on it.

Drawing must wait for `document.fonts.ready`, or the text renders in a
fallback face. Wrapped in try/catch with a 2 second timeout, because a browser
that never resolves it must still get a scene.

Any word inside a texture is a label on a mock interface, so it localises. The
strings come in through `SceneLabels`, they are not literals in `textures.ts`.
Project names inside the mock (a client's name on the landing page) are proper
nouns and stay as they are.

## 7. Progressive enhancement and accessibility

The section renders the four rows server-side, always, into the static export.
Prices, audiences, schema.org markup and the link to the services page are in
the HTML whether or not any JavaScript runs. Nothing about this section is
invisible to a crawler or a reader with JS off.

Mount predicate, evaluated once and re-evaluated on the width query's `change`
event:

```
matchMedia('(min-width: 64rem) and (min-height: 46rem)').matches
  && !matchMedia('(prefers-reduced-motion: reduce)').matches
  && webglAvailable()
```

- **No WebGL**: nothing mounts. The price board is the section.
- **Reduced motion**: nothing mounts. The scene is motion end to end, so a
  frozen frame would be a picture of nothing.
- **Under 64rem wide, or under 46rem tall**: nothing mounts. A 390px phone
  would pay 141 kB and a warm GPU for a scene it can barely see, on a site
  whose pitch is that it loads fast.

  This started as one number, 46rem of width, and that was wrong twice over.
  The two-column layout does not exist until 64rem, so between the two the
  scene mounted into a single-column stack inside a stage fixed at 100svh with
  its overflow clipped: the canvas got half a stage and the copy was cut off
  with no way to scroll to it. And width alone says nothing about the room the
  copy column actually needs. On a 1366x768 laptop the viewport is about 640px
  and the price board overflowed the stage by roughly 250px, clipped at both
  ends because the grid centres it.

  So the mount threshold and the layout threshold are now the same number, and
  a height floor sits beside it. The cost is real and worth stating plainly:
  this excludes phones, most tablets, and laptops with a 768px screen. Those
  visitors get the price board, which is good, but it is a larger share of
  traffic than the original 46rem implied. Flagged in section 11 as the
  decision most worth revisiting after a real device test.

The canvas is `aria-hidden="true"`. The rows are the accessible content in
both states, which is why they are the same DOM nodes in both states: enhanced
presentation is CSS and one `data-focus` attribute, never a second copy of the
text. No focus trap, no keyboard interaction to learn, because there is no
information in the scene that is not in the list.

## 8. Internationalisation

`de` and `en` both go through the same path. `Service` gains one field:

```ts
/** One line naming what the object at the end of this way actually is. */
reads: string;
```

Required, not optional, so `satisfies Content` fails the build if only one
language has it. Budget added to `check-copy.mjs`: 62 characters, one line in
a 26rem column.

No German is hard-coded anywhere under `components/crossroads/`. The texture
builders draw only strings handed to them, which is asserted rather than
trusted (see section 11, case 8).

The house copy rule applies to every string added here, in both languages and
inside the textures: no em dash and no semicolon in anything a visitor reads.
A colon, a comma or two sentences instead.

## 9. Performance budget

three.js is a build-time dependency. It is reached through a dynamic `import()`
inside the mount effect of a client component, so it never enters First Load JS
for any page, including this one. (`next/dynamic` wraps React components and
the scene is a plain module, so it is the wrong tool here.)

Two gates, in a new `web/scripts/check-bundle.mjs` that joins the five
`check-*.mjs` scripts the repo already runs:

1. **Eager cost**: the gzipped sum of every chunk referenced by
   `out/de/index.html` must not exceed the baseline by more than 2 kB. The
   baseline is a number committed in `web/scripts/bundle-baseline.json`,
   captured from `main` before this work starts and updated only by a
   deliberate commit that says why it moved. This is what catches three.js
   leaking into the eager graph.
2. **Deferred cost**: the crossroads chunk, gzipped, must be 150 kB or less.
   The prototype measured 135 kB with esbuild. The gate measures the real Next
   output, so a tree-shaking regression fires it.

`web/README.md` currently says „no server, no database, no runtime
dependencies". That claim is about the deployment and it stays true. It gets
one added sentence naming the client budget, so nobody reads it as a claim
about browser JavaScript that this change quietly falsifies.

## 10. Teardown

`stop()` disposes every geometry, material and texture the scene created, not
only the renderer. The prototype disposed the renderer alone, which leaks on
route change. Geometries and materials are tracked in an array at creation
time so disposal cannot miss one that was added later.

`boot()` is wrapped so a WebGL context failure at any point leaves the price
board standing and reports nothing to the user. A scene that cannot start is
not an error worth an error message, but it is worth a `console.warn`.

## 11. Testing

The repo has no browser test infrastructure today. This adds Playwright as a
devDependency, a `test:e2e` script, and a browser install step in `ci.yml`.
That is roughly a minute and a Chromium download on every pull request, which
is a real cost and is the main argument against this whole section being worth
it. It is worth it: three of the seven cases below are regressions that already
happened once, and none of them is visible in a typecheck.

Chromium only. Playwright, against the built static export:

1. The stage never paints outside its section, at 1440x900 and 800x1000.
2. Jumping straight to the section's end reports four of four built.
3. `emulateMedia({ reducedMotion: 'reduce' })`: no canvas in the DOM, all four
   rows visible with their prices.
4. WebGL disabled: same as 3.
5. At 390px wide: same as 3.
6. At each of the four stops, in both languages, the focused row is the one
   the camera is looking at.
7. Zero console errors across a full scroll of the section.
8. Every string the texture builders draw came from the labels object they
   were handed, asserted with a recording 2D context stub. This is what keeps
   the mock interfaces from quietly becoming German-only.

Unchanged and still required: the contrast audit, the tokens sync check,
`typecheck`, `lint`, `check:copy`, `check:meta`, `check:profile`,
`check:spacing`, `format:check`, and both the domain-root and base-path
builds with their output assertions.

## 12. Files

New:

    web/src/components/crossroads/{index.tsx,scene.ts,objects.ts,textures.ts,types.ts,palette.ts}
    web/scripts/check-bundle.mjs
    web/scripts/check-scene-palette.mjs
    web/scripts/bundle-baseline.json
    web/playwright.config.ts
    web/tests/crossroads.spec.ts

Changed:

    web/src/app/[lang]/page.tsx     services section swapped for <Crossroads>
    web/src/content/types.ts        Service gains `reads`
    web/src/content/de.ts           four `reads` lines
    web/src/content/en.ts           four `reads` lines
    web/scripts/check-copy.mjs      budget for `reads`
    web/package.json                three, @types/three, playwright, the new scripts
    web/README.md                   the client budget sentence
    brand/tokens/tokens.json        the blueprint line blue
    brand/tokens/tokens.css         regenerated, not hand-edited
    web/src/app/tokens.css          regenerated, not hand-edited
    .github/workflows/ci.yml        browser install, e2e, bundle and palette gates

Deleted: nothing in this repo. PR #17's `scroll-story.tsx` lives only on its
own branch.

## 13. PR #17

Closed unmerged. Its scroll story is a different story told with different
machinery, it carries the sticky bleed bug described in 5.4, and keeping it
open invites someone to merge a superseded design. The branch stays for the
record.

## 14. Risks

- **Bundle regression.** A stray three.js import (any loader, any control)
  pulls in far more than the primitives. Gate 2 catches it at build time.
- **The 64rem by 46rem floor.** Most traffic to a local business site is mobile, and
  most of it will therefore never see this. That is defensible only if the
  price board is genuinely good on a phone, which it is today. Revisit with a
  real mid-range Android in hand.
- **Scroll length.** 420svh is a long section on a page that already has
  seven. If it reads as a hostage situation, cut to 320svh and drop the final
  wide shot.
- **Font timing.** `document.fonts.ready` on a browser with fonts blocked.
  Handled by the timeout in section 6, and worth an explicit manual check.
