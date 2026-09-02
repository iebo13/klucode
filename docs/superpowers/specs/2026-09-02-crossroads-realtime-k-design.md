# The crossroads, real-time, on the mark

Date: 2 September 2026. Builds on `2026-09-02-crossroads-stills-design.md` (the Blender pipeline, the pinned track, the stills) and replaces its picture stack with a real-time scene where the browser can run one. The stills stay as the poster and as the fallback.

## 1. Why

The stills made the section look finished but not like a 3D scroll page: five pictures with a crossfade is a slideshow, nothing travels, and the light never answers the pointer. The owner asked for the most realistic and most 3D-like option with time no object, and for the routes to carry the brand.

Two decisions follow. The scene runs in real time again, three.js, but with its light baked in Blender so it looks like the Cycles renders while the camera moves. And the floor plan is the mark itself: the identity notes call the K "a graph, not a letter: four terminal nodes and one emphasised hub", which is the crossroads exactly. The hub is where the reader stands, the four nodes are the four ways, the strokes are the routes.

The earlier live scene (August, the depth pass) was not a dead end because it was real-time. It was a dead end because it was made of code-built boxes lit at runtime under a 170 kB budget. This design changes the material, not the technique.

## 2. What a visitor sees

- **The map.** The section opens on the whole K from a raised three-quarter view: a dark floor, the letter's strokes as soft green light, the hub disc brightest, an object standing on each node with its label chip. The mark, as a place.
- **The flight.** As the reader scrolls inside the pinned track the camera flies down a stroke to its node and stands before the object, then back through the hub and down the next. Five stops snap: the map, then the four ways in the order the rows stand. The scroll moves the camera continuously between stops, not a crossfade.
- **The hand.** The pointer tilts the view a little (parallax) and carries a soft light across the floor. Pointing at a row aims the camera at that way, as before. Pointing at an object or its chip lights the row; clicking opens it.
- **Depth.** Shallow depth of field on the close-ups, a bloom on the screens and lamps, soft contact shadows and light pools baked from Cycles.
- **Everything else as today.** The panel, the rows, the hint, the poster on phones, the stills where WebGL is missing, reduced motion cutting instead of gliding.

The order on the K, read from the letter's top: 01 Website on the stem's far end, 02 App on the upper arm, 03 Capacity on the lower arm, 04 Care on the stem's near end.

## 3. The floor plan

The hub at the origin. In the mark's proportions, with the strokes 2.1 units wide:

| Stroke | From the hub | Length | Node disc |
| --- | --- | --- | --- |
| Stem, far | angle R | 18 | 1.9 |
| Upper arm | angle R minus 46.5 degrees | 26.2 | 1.9 |
| Lower arm | angle R minus 133.5 degrees | 26.2 | 1.9 |
| Stem, near | angle R plus 180 degrees | 18 | 1.9 |

R is the letter's rotation on the floor, 0.3 radians in the preview, chosen so the K reads upright from the map camera. The hub disc is 2.7. These are the numbers `tools/blender/crossroads.py --layout k` already draws; the runtime scene and the Blender file share them through one JSON emitted by the pipeline (section 6).

The map camera is raised (about 45 degrees of elevation) and far enough to hold the whole letter in the free region beside the panel at 1440x900; the exact position is set in Blender and exported with the models. The angle brackets of the mark are not on the floor in this pass; they are the first thing to try once the letter looks right.

## 4. The models and the light

Modelled in Blender by script (the `bpy` modelling in `crossroads.py`, extended), not by hand, so they are reproducible and reviewable as code:

- **Website:** a monitor with a thin bezel and a slim stand, the landing page on its screen.
- **App:** the dashboard monitor, a database cylinder with rings, a server tower with slats and lamps, wires on the floor.
- **Capacity:** three desks with monitors, chairs, mugs, a low partition, a plant and a desk lamp.
- **Care:** a rack with bays and lamps, the status lamp, the uplink rungs, the cloud as a smooth lobed mesh.
- **The floor:** one plane carrying the strokes, hub and node discs, the light pools and every contact shadow as texture.

Light is baked in Cycles: for each object a combined lightmap (diffuse light, soft shadows, ambient occlusion) into a texture on a second UV set, and for the floor the light pools, the strokes' glow and the objects' contact shadows into one floor texture. At runtime three.js draws the baked textures with `MeshBasicMaterial` for the floor and a lightly lit `MeshStandardMaterial` for the objects (baked texture as the base with an environment map for the metals), so the look is the render's and the GPU cost is small. The pointer light is the one runtime light, added on top.

Screens keep their canvas-drawn textures (the `textures.ts` drawings, drawn per language at runtime as the August scene did), so the English page shows English screens again. Lamps and LEDs are emissive.

## 5. The runtime

- **three.js** returns, with `GLTFLoader` and meshopt decoding, `EffectComposer` with bloom and depth of field, and the environment for the metals. All deferred: nothing loads until the section is near and the browser has WebGL.
- **Assets:** one glTF per way plus the floor and the hub, meshopt-compressed, textures as WebP (the browser decodes them, no transcoder), 1x and 2x sizes chosen by device pixel ratio. Under `public/crossroads/scene/`.
- **The camera** travels a spline through six poses: the map, then for each way the standing pose before its node, passing over the hub between ways. Inside the pinned track the scroll selects a position along the spline (the five stops are the poses; between stops the camera is on the way). A hovered or focused row aims the camera at that way's pose by a glide, as the August scene did; letting go returns to the scroll's position.
- **The hand:** pointer parallax on the camera, a cursor point light on the floor, hover and click on objects by ray hit, chips that light their row.
- **Labels:** anchors projected from the objects' bounds each frame, placed with today's rules.
- **Render loop** parks when nothing moves; frames only during a glide, a scroll, a pointer move or an arrival.
- **Fallback:** where WebGL is missing or the width is narrow, the stills component from the previous design runs unchanged.

## 6. The pipeline

`tools/blender/` grows from a render script into the source of the scene:

1. `crossroads.py --layout k` builds the models (section 4) and bakes the lightmaps and the floor texture.
2. It exports the glTFs, the baked textures, the camera poses, the K layout, the label anchors' bounds and the per-object emissive lists into `public/crossroads/scene/` and a generated `scene-manifest.json`; `emit-scene.mjs` compresses the glTFs with gltfpack (meshopt), converts textures to WebP at two sizes, and writes `src/components/crossroads/scene-manifest.ts`.
3. The stills pipeline (`emit-stills.mjs`) keeps producing the poster and the fallback stills from the same file, with the K layout, so the fallback and the live scene are the same place.

`check:palette` guards `palette.ts`; the Blender script reads its colours from a JSON emitted from `palette.ts`, closing the follow-up left by the stills design.

## 7. Budget and gates

- Deferred JavaScript for the scene (three.js, addons, the scene code) under 260 kB gzipped; the eager chunk stays on its baseline.
- Scene assets (glTFs, baked textures at 1x) under 1.5 MB, lazy, only where the scene mounts; the 2x textures on top for retina.
- Every gate as today plus: the scene manifest exists and names every asset that exists on disk; no eager chunk carries three.js.
- Frame rate: the flight holds 60 fps on the owner's laptop (Intel Lunar Lake integrated graphics) at 1440x900; measured in the browser suite by the parked-loop test as today and by a timing test on the flight.

## 8. Tests

Unit: the K layout (nodes at the mark's proportions, order), the spline (each stop is a pose, monotone parameter, the hub between ways), the manifest (every file present), the label anchors' rules, the texture copy rule.

Browser, per viewport where it matters: the map at rest with four chips, each stop's pose and chip, the hover glide, the chip and object hit, the parked loop, the stills fallback without WebGL, phones, JavaScript off, reduced motion, both themes.

## 9. How it is built

In order, with renders in front of the owner before any page code:

1. Models and K floor in Blender, rendered with Cycles at the map and the four stops, reviewed by the owner.
2. Baking and export, then a static three.js viewer that shows the exported scene at the six poses beside the Cycles renders, reviewed by the owner.
3. The runtime: loader, camera spline, track, hand, labels, post, fallback.
4. Gates, budget, tests, pictures, pull request.

## 10. Out of scope

- The angle brackets on the floor (first follow-up).
- Arrival animations per way (the August one-shots); the flight is the motion.
- A mobile real-time scene; phones keep the poster.
