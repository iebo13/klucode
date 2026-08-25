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

Nothing inside the scene is labelled. No signposts, no 3D text, no second copy
of a name baked into a texture. Every word the reader sees is DOM text. The
names are said once.

**Amended 2026-08-25 (see section 15).** One word of that rule changed: DOM
text *beside* the canvas became DOM text *at* the object. Each of the four
carries a small HTML chip, positioned by projecting an anchor half a unit above
the object and writing a transform, and its content is the same `way.name` the
row in the price board carries. The layer is `aria-hidden`, so a screen reader
still hears each name once and a crawler still indexes it once.

What the original rule was protecting is intact. What it cost was the bond
between a row and the thing it described: in the establishing shot all four
objects were on screen and none of them was named, and at every close-up the
number, the name and the price sat 200px to the right of the object in a list
that brightened one line at a time.

Real 3D text is still refused, and now for a measured reason as well as a
stated one. The scene is lit by a swinging tungsten key through fog, so
contrast on a glyph sitting on geometry cannot be guaranteed at every stop.
A DOM chip carries its own backdrop, the site's own face, and the same content
files. Occlusion is the one thing it cannot do, and nothing in this scene ever
stands between the camera and a point above another object.

## 5. Architecture

### 5.1 Module boundaries

    web/src/components/crossroads/
      index.tsx      client component: stage, scroll, mount predicate, focus sync
      scene.ts       three.js only. No React, no DOM beyond the canvas it is handed
      objects.ts     one builder per key, plus the shared unit/piece primitives
      textures.ts    the drawing functions. Imports NO three.js, which is what
                     lets the i18n rule be asserted against a recording stub
      surfaces.ts    the only place a CanvasTexture is made, so textures.ts can
                     stay pure
      labels.ts      every word drawn inside the scene, per language
      progress.ts    the scroll maths. No three.js, so it unit-tests with no GPU
      registry.ts    every disposable the scene allocates, so stop() frees them
      palette.ts     the scene's colours as numbers, pinned to the tokens
      types.ts       Way, Stop, SceneLabels, Handle

Four of those were not in the first draft of this spec. `surfaces.ts`,
`progress.ts` and `registry.ts` exist because the boundaries they draw are what
make the rest testable, and `labels.ts` because the mock interfaces are scene
furniture rather than site copy and belong beside the code that draws them.

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

A frame is scheduled only when `set()` or `resize()` has changed something, and
the loop parks after drawing it, so a still page costs no rAF callback and no
GPU work at all. An unconditional reschedule behind a `dirty` flag was the
first version of this and it kept a callback alive for the whole visit with the
section four viewports away, which is a permanent cost on a page whose pitch is
that it costs the visitor nothing.

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
  <div class="track">           <!-- height: 300svh. The runway. -->
    <div class="stage">…</div>  <!-- sticky, top: 0, height: 100svh -->
  </div>
</section>
```

The stage lives inside the track, so its travel is the track's height minus
its own: 300svh minus 100svh. It releases exactly when the track's bottom
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
it, leaving three viewports of empty ink. The stage clips itself instead.

**Track length. Amended 2026-08-25 (see section 15).** 560svh, then 420, now
300. Six camera stops in 200svh of travel, which is about a third of a viewport
each and the pace the four ways have always had. What went is the approach:
„Die Ausgangslage" was pinned in front of the crossroads for a day and is an
ordinary paper section above it again.

**The canvas is the stage. Amended 2026-08-25 (see section 15).** This spec
originally called for a two-column grid, canvas left and copy right, no
overlap, on the grounds that the prototype floated the copy over the canvas and
it covered the leftmost object. Both goals survive full bleed and the grid does
not: measured at 1440x900, the canvas was 640x796 inside a 1425x900 stage, 40%
of the section, with a hard edge on all four sides and the section's own aurora
and grain filling the rest. Two different darks meeting at a rectangle is a
video embedded in a slide.

So the canvas fills the stage, the floor and the fog run to the viewport edges,
the aurora and grain are not rendered while the scene is up, and the copy is a
glass panel standing on the left of the world. The original objection is
answered by arithmetic rather than by a grid: `scene.ts` is handed the panel,
computes its field of view against the free region's aspect, and shifts the
frustum by half the reserve through `setViewOffset`, so a shot is composed in
the part of the canvas nobody is standing on.

The panel's fill is 0.88 of `inkSurface` and that number is a floor, not a
taste call: composited over the brightest thing this scene could ever put
behind it, ink-muted measures 5.77:1 in the dark theme and 6.53:1 in the light.

**No inner scroll. Amended 2026-08-25 (see section 15).** The original said the
copy column scrolls inside the stage, wanting 1097px against a stage that never
gives it that, with `overflow-y: auto` and the focused row nudged into view. It
also said the cost was honest and real: 300 to 460px of wheel spent inside a
box in the middle of the flagship section.

That cost is gone rather than paid. Once the objects are named at themselves
the board is a board: number, name, price, and the detail of whichever row the
camera is standing at, opened with `grid-template-rows` so the other three stay
in the accessibility tree at zero height. Measured at the 1024x736 floor, that
is 498px closed and 618px at its tallest against 648px of room, and the browser
suite walks all six stops and fails if the panel leaves the stage or grows
anything to scroll.

The one thing full bleed costs is the gutter. A shot composed inside the free
region comes from a frustum far wider than it: at 1440x900 a lane close-up
spans 74 degrees of world horizontally against the 51 the shot is composed in,
and the strip between the viewport edge and the panel is where the neighbouring
lane's object turns up. Composing it away is not available, because the subject
needs 24 degrees of horizontal fit inside the free region and that forces a
frustum wide enough to reach the neighbour. It is faded to the scene's own
background instead, which is what the fog already does in depth.

That grid exists only at 64rem and up, which is why the mount threshold is the
same number rather than a smaller one of its own. See section 7.

### 5.5 Progress and camera stops

    p = clamp01(-sectionRect.top / (sectionRect.height - stageHeight))

Six stops: the junction at 0, the four ways at 0.18 / 0.37 / 0.56 / 0.75, and
a final wide shot at 1.00. Each way stop carries its own standoff distance and
its own look height, because an office is a room and a rack is a box and one
camera distance cannot frame both.

Those six were briefly eight, with two approach stops in front of the junction
and everything after them remapped through an `APPROACH_END`. That is undone
and the numbers above are the ones in the code again. See section 15.

Which way is NAMED hands over at arrival rather than at the midpoint of a move.
It used to be decided by whichever of the two had the higher weight, which
crosses in the middle, and that was fine while the name lived in a list beside
the canvas. With the name standing at the object, a label swapping halfway
between two objects names the thing you are looking at as the thing you are
not. `FOCUS_HANDOVER` is 0.78 of eased segment time, and there is deliberately
no dead zone: exactly one of the two is named at every point of the move.

Framing is a test rather than a measurement somebody took once.
`crossroads-framing.spec.ts` projects every object at every stop at all three
stages, with no GPU and no browser, and fails on anything cropped, any
neighbour taking more than 1% of the composed region, a camera swinging faster
than this journey already does, or an `aimY` that has stopped pointing at the
middle of its object.

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

Three surfaces are drawn to a 2D canvas at boot and used as a texture. Two of
them carry real interfaces, and the third, the office monitors, carries no
words at all by design, which its own test asserts. Drawn at boot and used as a
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
both states, which is why they are the same DOM nodes in both states, with one
deliberate exception: `reads` names the object at the end of a lane, so it is
hidden when there is no lane to look at. Enhanced
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
   captured before this work starts and updated only by a deliberate commit
   that says why it moved. It moved once, by 2086 bytes, when the client
   component landed in the eager graph. That was 38 bytes inside the slack,
   which is a fair sign the gate is calibrated tightly rather than loosely. This is what catches three.js
   leaking into the eager graph.
2. **Deferred cost**: the three.js chunks, gzipped, must be 155 kB or less.
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

    web/src/components/crossroads/{index.tsx,scene.ts,objects.ts,textures.ts,
                                  surfaces.ts,labels.ts,progress.ts,registry.ts,
                                  palette.ts,types.ts}
    web/scripts/check-bundle.mjs
    web/scripts/check-scene-palette.mjs
    web/scripts/bundle-baseline.json
    web/playwright.config.ts        the pure suite, no browser, no server
    web/playwright.e2e.config.ts    the browser suite, against the built export
    web/tests/unit/*.spec.ts
    web/tests/e2e/*.spec.ts

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
- **Scroll length.** RESOLVED, twice, and the second time by taking content off
  the pin rather than shortening it. 560svh was 51.6% of the homepage, 420svh
  was 44.6%, and 300svh is 31.5%. The escape hatch this risk named, dropping
  the final wide shot, was not needed and would have cost the one stop that
  ends the section by releasing the place.
- **Type over a moving picture.** The failure mode overlay scrollytelling is
  known for, and it now applies: the copy sits on the scene. Bounded rather
  than watched. The panel's fill is measured against the brightest frame the
  scene could produce and the labels carry their own backdrop, and both numbers
  are in section 5.4.
- **Labels colliding.** Four chips about 195px apart at the wide shots, and the
  longest is 205px wide. Ways 01 and 03 sit level and 02 and 04 sit a line
  higher, and the browser suite asserts that no two of them overlap at any stop
  at any of the three viewports. A copy change that lengthens a name is caught
  by a test.
- **Font timing.** `document.fonts.ready` on a browser with fonts blocked.
  Handled by the timeout in section 6, and worth an explicit manual check.

## 15. Amendments

### 2026-08-25: full bleed, names at the objects, and the approach unpinned

Three changes, from the second audit of the same day. They are recorded here
rather than folded silently into the sections above, because this spec is the
binding authority for the section and two of them reverse decisions it argued
for at length.

**The canvas is the stage.** Section 5.4 called for a two-column grid to keep
the copy off the objects. The result read as a video embedded in a slide: 40%
of the section, a hard rectangle on four sides, and two different darks meeting
at its edge. Nobody else frames a scene that way. The copy stays off the
objects by arithmetic instead, which is what `setViewOffset` and a field of
view computed against the free region are for.

**The names stand at the objects.** Section 4 forbade floating names. The half
of that rule that mattered was that a name is DOM text and is said once, and
both hold: the chips are HTML, `aria-hidden`, and carry the same string as the
row. What changed is that the picture and the list are now visibly the same
four things.

**The approach is unpinned.** Yesterday's commit merged „Die Ausgangslage" into
this section, and it was worth trying: the answer landing as the camera reaches
the junction is better choreography than an ink panel at the bottom of a list.
It cost 122svh of pinned scroll during which the picture was a slow dolly
towards four wireframes while the words were about agencies, website kits and
Excel, none of which is in this scene.

Issue #18 tried to put them in it, on `claude/crossroads-dead-ends`: three dead
ends on a second fan the visitor passes on the way in. The mechanic works. The
cost is a 160 degree about-face measured at 37.7 degrees per 1% of section
against the 7.9 this journey spends, which is 1.13 times the arithmetic floor
for that move in that budget, and only a 720svh track brings it down. That is a
recorded no, with numbers, and it is what unpinning rests on: the argument
cannot be made to agree with the picture at any scroll length this page can
afford.

So it is a paper section above this one again, and the striking of the three
options, which was a fallback-only device, now runs for every visitor.

What did NOT change, and is still the spec: scope rather than price in the
geometry, keyed objects, the blueprint mechanic, deferred three.js, the render
loop that parks, every word in the DOM, both languages through the same content
files, the palette gate, the bundle gate, and the fallback being complete
rather than a degradation.

### 2026-08-25, later: unpinned, and the camera follows the pointer

The third audit of the day (`docs/audit-2026-08-25.md`) measured the pinned
section against a first-time visitor and found against it, with numbers rather
than taste: the enhanced state showed one row's detail at a time where the
phone fallback showed all four, so a laptop got strictly less than a phone; the
four stops were four instants in 1,800px of travel and the rest was transit,
in which the open row and the framed object disagreed for two thirds of every
move; the 1024x736 mount floor excluded every phone, every portrait tablet and
the 1366x768 laptop that is the most common Windows viewport; and it cost
eighteen wheel notches to read what fits on one screen, on the section that
carries the prices. NN/g's strongest warning about scroll-jacking is
scroll-jacking combined with text the reader has to read.

So the track is gone. This reverses sections 3, 5.3, 6 and 7 as written, and
it is the fourth re-specification of the section in two days, which the audit
itself named as evidence that the idea was being fitted to the page by trial.
What survives is the part that was never in question: the place, the objects,
the blueprint build, the names at the objects, the full-bleed stage, every word
in the DOM, deferred three.js, the render loop that parks.

**The section is its own height.** The stage is `position: relative`, the
canvas is absolutely positioned behind the layout, and the height is the copy
panel plus 4rem of padding: measured at 1440x900 it is about one viewport. No
`svh`, no sticky, no `progressOf`. `progress.ts` is replaced by `journey.ts`,
which has two pure functions: where the camera is partway through a glide, and
how far each object has built since the section came into view.

**The camera follows the row.** It idles at the junction with all four named.
Hovering or keyboard-focusing a row glides it to that way's close-up in 720ms
on a smoothstep, from wherever it is, so a pointer sweeping down the rows is
one continuous path. Leaving the list returns it to the junction. Hover and
focus are the same input, which is what makes the enhanced state reachable
without a pointer: the old one disclosed by scroll position and rows were not
focusable.

**Every row is a link** to its own card on `/leistungen`, and every detail is
open at every moment. The board is number, name and price on one line, and who
it is for and what the price covers on the next. `reads` is gone from the
content: the label at the object does that job.

**The reveal is tied to looking.** The four are drawings until the section is a
fifth on screen, then they build one after another, 900ms each and 160ms
apart. Built stays built.

**The mount floor is width only.** `(min-width: 64rem)`. The height half
existed because the panel had to fit inside a 100svh stage; the section grows
with the panel now, so the 1366x768 laptop gets the scene. The poster stays for
the fallback and is not shown on phones, where a 1600x378 strip is 78px tall.

**The release shot is gone.** There is no end of the track to release from;
the junction is where the camera returns to.

The framing suite projects every object at all five shots against the three
stage sizes `tools/shoot.mjs` measures, and walks every ordered pair of shots
for the camera's turning rate, since the pointer can ask for any of them from
any other. The browser suite asserts the hover and keyboard handover, the
label overlap at every shot, the reveal, the parked loop, and that the section
is under a viewport and a half.
