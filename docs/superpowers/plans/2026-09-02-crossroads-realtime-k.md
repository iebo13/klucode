# The Crossroads, Real-Time, on the Mark: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The homepage services section becomes a real-time three.js scene whose floor plan is the KluCode K, lit by lightmaps and a floor texture baked in Cycles, with the pinned track flying the camera down the strokes to five snapping stops, a pointer that tilts the view and carries a light, and the existing stills as the fallback.

**Architecture:** `web/tools/blender/crossroads.py` grows from a render script into the source of the scene: it builds the models and the K floor from the palette in `palette.ts`, lights the whole letter with one static rig, renders review stills, bakes one diffuse lightmap per way and one combined floor texture, and exports one glTF per way with a JSON of poses, layout, anchors and bounds. `emit-scene.mjs` compresses the glTFs with gltfpack (meshopt), converts the bakes to WebP at 1x and 2x, and writes the generated `scene-manifest.ts`. At runtime `assets.ts` loads the manifest into three.js meshes (glTF materials plus the lightmap, an environment for the metals, canvas screens per language, emitters over the bloom threshold), `scene.ts` runs the camera along a Catmull-Rom flight through six poses driven by the track's continuous scroll position, glides to a hovered row, tilts with the pointer and parks when still, and `index.tsx` becomes a shell that mounts either the live world or the stills world beside the same panel, rows and label chips.

**Tech Stack:** Next.js 15.5 static export, React 19, TypeScript 5.7, three 0.185.1 (GLTFLoader, meshopt decoder, EffectComposer with UnrealBloomPass, BokehPass, OutputPass), gltfpack (npm, meshopt), Blender 4.5.13 LTS headless (`~/opt/blender/blender`, CPU Cycles, numpy inside Blender's Python), sharp 0.35, Playwright 1.62 (unit config with no browser, e2e against `out/` on 127.0.0.1:4173).

**Spec:** `docs/superpowers/specs/2026-09-02-crossroads-realtime-k-design.md` (read it whole; section 3 has the K numbers, section 7 the budget, section 9 the build order this plan follows).

## Global Constraints

- Working directory for every npm and node command is `web/`. Repo root `/mnt/Extra/Main_Development_Folder/klucode`. Blender is `~/opt/blender/blender`, run headless as `blender -b -P tools/blender/crossroads.py -- <args>` from `web/`, in the background with `nohup` for anything over a minute, polled on the log line `Blender quit` (never `pgrep -f` on the script name: the waiter's own command line matches).
- Branch `claude/crossroads-realtime-2026-09-02`. Commit to it. Do not touch `main`, do not push, do not merge, do not rebase. Pull request #22 (`claude/crossroads-stills-2026-09-02`) stays as it is.
- Code, comments, tests and commit messages are English. No long dash anywhere (U+2013 or U+2014): not in code, comments, copy, commit messages, docs or replies. Grep every commit's added lines with `git diff --cached | grep -P '^\+.*[\x{2013}\x{2014}]'` before committing and expect no output. No attribution lines or trailers in commits.
- Rendered copy (anything a visitor reads, including alt text and the scene labels) has no em dash and no semicolon.
- Comments explain why, in full sentences, in each file's existing style. Every number in a comment is measured, not remembered. Write the measurement down where the number is.
- The fallback (`data-enhanced="false"`: phones, narrow widths, JavaScript off) is untouched: price board and poster as today. Browsers without WebGL at laptop widths get the stills component exactly as it behaves today.
- Budget (spec section 7): deferred JavaScript for the scene (three.js, addons, scene code) under 260 kB gzipped, the eager chunk on its baseline (`scripts/bundle-baseline.json`, 152731 bytes plus 2 kB slack). Scene assets at 1x (glTFs, lightmaps, floor) under 1.5 MB, lazy, fetched only where the live world mounts. The flight holds 60 fps at 1440x900 on this machine (Intel Core Ultra 9 288V, Lunar Lake graphics, Mesa 25.2), measured by the timing test in Task 6.
- Every generated module (`stills.ts`, `scene-manifest.ts`) is written only by its emitter. Nothing edits them by hand.
- No new colour anywhere. The palette is `src/components/crossroads/palette.ts`; Blender reads it from that file (Task 1) and `check:palette` guards it.
- Every task ends with all gates green, run from `web/`: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run test:unit`, `npm run build`, `npm run check:bundle`, `npm run check:palette`, `npm run check:copy`, `npm run check:meta`, `npm run test:e2e -- --workers=1`. `check:profile` is not run (it fails on placeholder Impressum content by design). Tasks 1 and 2 also touch `web/tools`, so they run the gates too.
- Gitignored working output: `web/tools/blender/renders/`, `poster/`, `textures/`, and (added in Task 2) `scene/` and `viewer/_build/`. What ships out of them is under `web/public/` and in the generated modules.
- The owner reviews pictures at the end of Task 1 and Task 2 before the next task starts. Send them with `SendUserFile`. Do not start Task 3 before the owner has approved Task 2's viewer pictures.

---

## File structure

Created:

- `web/src/components/crossroads/scene-manifest.ts` (generated): the layout, the six poses, per-way assets, anchors, bounds, the floor texture, the 1x byte total.
- `web/src/components/crossroads/assets.ts`: manifest to meshes. Loads glTFs (meshopt), lightmaps, the floor, draws the screens per language, dresses materials.
- `web/src/components/crossroads/camera.ts`: the lens (`fovFor`), the view offset for the copy panel (`applyPose`), projection to stage pixels (`projectTo`).
- `web/src/components/crossroads/studio.ts`: the environment the metals reflect (the August module, unchanged in spirit).
- `web/src/components/crossroads/post.ts`: composer with depth of field, bloom and the output pass.
- `web/src/components/crossroads/spline.ts`: the flight through the six poses.
- `web/src/components/crossroads/journey.ts`: glide, settle, parallax (pure maths).
- `web/src/components/crossroads/marks.ts`: label placement rules (today's `place()` extracted, pure).
- `web/src/components/crossroads/pointer.ts`: ray hit test (the August module).
- `web/src/components/crossroads/registry.ts`: GPU resource tracking (the August module).
- `web/src/components/crossroads/scene.ts`: boot, the parked loop, the hand, the handle.
- `web/src/components/crossroads/stills-world.tsx`: the five stills and their anchors (today's world, moved).
- `web/src/components/crossroads/live-world.tsx`: the canvas, the boot, the projected labels.
- `web/tools/blender/emit-scene.mjs`: bake output to `public/crossroads/scene/` and the manifest.
- `web/tools/blender/viewer/{index.html,viewer.js,serve.mjs,shoot.mjs}`: the static viewer beside the Cycles renders.
- `web/tools/fps.mjs`: the flight timed on the real GPU.
- `web/tests/unit/crossroads-manifest.spec.ts`, `crossroads-spline.spec.ts`, `crossroads-journey.spec.ts`, `crossroads-marks.spec.ts`, `crossroads-framing.spec.ts`.
- `web/tests/e2e/crossroads-flight.spec.ts` (GPU project, opt-in).
- `docs/pr/2026-09-02-crossroads-realtime-k/*.jpg`.

Modified:

- `web/tools/blender/crossroads.py`: palette from `palette.ts`, the K in the floor material, one static rig, six poses, `layout.json`, `--bake`, glTF export.
- `web/src/components/crossroads/index.tsx`: the shell (mode, panel, rows, marks, track, reveal) with two worlds.
- `web/src/components/crossroads/track.ts`: continuous `scrollT`, rounding `scrollWay`, `shownWays`.
- `web/src/components/crossroads/types.ts`: `Vec3`, `Pose`, `CameraState`, `Mark`, `Handle`, `BootOptions`.
- `web/src/components/crossroads/labels.ts`, `textures.ts`: the head comments (they ship again).
- `web/src/app/globals.css`: the canvas, the live chips, the cursor.
- `web/scripts/check-bundle.mjs`, `web/scripts/bundle-baseline.json`: the deferred cap, the assets cap, the stills cap re-measured.
- `web/package.json`, `package-lock.json`: `three`, `@types/three`, `gltfpack`.
- `web/playwright.e2e.config.ts`: the opt-in GPU project.
- `web/tests/e2e/crossroads.spec.ts`, `web/tests/unit/crossroads-track.spec.ts`, `web/tools/shoot.mjs`.
- `web/public/crossroads/*.webp`, `web/public/crossroads.webp`, `web/public/crossroads-phone.webp`, `web/src/components/crossroads/stills.ts`: re-rendered on the K.
- `README.md`, `.gitignore`, `web/.prettierignore`.

---

## Shared numbers

Written here once and referenced by the tasks. The K (spec section 3), in three.js coordinates, y up, the hub at the origin, R = 0.3 radians, ARM = atan2(19, 18) = 0.8127 radians (46.57 degrees):

| Way | Angle a | Length d | Node (x, 0, z) = (-d sin a, 0, -d cos a) |
| --- | --- | --- | --- |
| website (stem, far) | 0.3 | 18 | (-5.32, 0, -17.20) |
| app (upper arm) | 0.3 - 0.8127 = -0.5127 | 26.2 | (12.85, 0, -22.83) |
| capacity (lower arm) | 0.3 - (pi - 0.8127) = -2.0289 | 26.2 | (23.49, 0, 11.61) |
| care (stem, near) | 0.3 + pi = 3.4416 | 18 | (5.32, 0, 17.20) |

Strokes 2.1 wide, hub disc 2.7, node discs 1.9. These are `K_LANES` in `crossroads.py` already. The floor plane is 100 by 100 centred on the hub, and its texture's alpha fades from full at radius 34 to nothing at radius 48, so the far floor sits on either theme's ink.

Poses (three.js coordinates, `fitH`/`fitV` the half-angles the shot must cover, as `fovFor` takes them):

| Pose | pos | look | fitH, fitV | f-stop |
| --- | --- | --- | --- | --- |
| junction (the map) | (14, 32, 30) | (6, 0, 0) | 32.8, 15.2 | 11 |
| hub (via point) | (0, 6, 0) | the next stand's look | 24, 18 | 8 |
| stand of way k | `stand_off(target, back)` as today: on the lane, `back` units short of the target, at y 2.4 | `lane_target(angle, dist, aimY)` as today | 24, 18 | 0.8 |

`back`/`aimY` per way stay as `K_LANES` has them: website 9.1/2.33, app 11.4/2.6, capacity 13.2/0.98, care 11.2/2.78. The owner may move any of these after the Task 1 review; the manifest is the only place the runtime reads them from.

Coordinates: three.js (x, y, z) is Blender (x, -z, y). Blender's glTF exporter converts z-up to y-up with the same mapping, so a mesh exported in Blender world space lands in three.js exactly where `crossroads.py` placed it.

---
### Task 1: The place in Blender: the palette from its source, the K in the floor, one rig, six poses

Done by the controller (it owns the Blender pipeline and the owner's eye is on the renders). Recorded in full so the numbers and the interfaces are written down for Task 2.

**Files:**
- Modify: `web/tools/blender/crossroads.py`
- Modify: `README.md` (the recipe: `--layout k` is the default now)

**Interfaces:**
- Consumes: `src/components/crossroads/palette.ts` (read by regex, the same 16 lines `scripts/check-scene-palette.mjs` checks).
- Produces: `<out>/layout.json` beside the renders, in three.js coordinates, with this shape (Task 2 copies it into `scene.json` and the manifest):

```json
{
  "rotate": 0.3,
  "strokeWidth": 2.1,
  "hub": 2.7,
  "node": 1.9,
  "floorSize": 100,
  "fade": [34, 48],
  "lanes": [
    { "key": "website", "angle": 0.3, "dist": 18, "node": [-5.32, 0, -17.2], "back": 9.1, "aimY": 2.33 }
  ],
  "poses": {
    "junction": { "pos": [14, 32, 30], "look": [6, 0, 0], "fitH": 32.8, "fitV": 15.2, "fstop": 11 },
    "hub": { "pos": [0, 6, 0], "look": [-5.32, 2.33, -17.2], "fitH": 24, "fitV": 18, "fstop": 8 },
    "website": { "pos": [], "look": [], "fitH": 24, "fitV": 18, "fstop": 0.8 }
  },
  "anchors": { "website": [x, y, z] },
  "bounds": { "website": { "min": [x, y, z], "max": [x, y, z] } }
}
```

- [ ] **Step 1: The palette from `palette.ts`**

Replace the `PALETTE` dict with a reader. Blender's Python has `re`; no new dependency.

```python
import re

PALETTE_TS = os.path.normpath(
    os.path.join(HERE, "..", "..", "src", "components", "crossroads", "palette.ts")
)


def read_palette(path):
    """
    The scene's colours, read from the one file that records them.

    palette.ts is what scripts/check-scene-palette.mjs holds to the brand
    tokens, and the pattern below is that script's DECL: a line that does not
    read `name: 0xRRGGBB, // token.path` is not a colour there either. This
    script used to carry a second copy of the sixteen values, which the gate
    could not see and which drifted the day one of them moved. Sixteen is the
    gate's EXPECTED, and refusing on any other count is the same tripwire.
    """
    palette = {}
    with open(path) as f:
        for line in f:
            m = re.match(r"^\s*(\w+):\s*0x([0-9a-fA-F]{6}),\s*//\s*[\w.]+\s*$", line)
            if m:
                palette[m.group(1)] = m.group(2).lower()
    if len(palette) != 16:
        raise SystemExit(f"crossroads.py: read {len(palette)} colours from {path}, expected 16")
    return palette


PALETTE = read_palette(PALETTE_TS)
```

- [ ] **Step 2: The K is the default layout, rotated 0.3**

One ruling against the spec's letter, recorded in `read_palette`'s comment: section 6 asks for a JSON emitted from `palette.ts`; the script reads `palette.ts` itself with the gate's own pattern instead, which is one file fewer to keep in step and the same guarantee.

`LAYOUT = arg("--layout", "k")` and `K_ROTATE = float(arg("--k-rotate", "0.3"))`. Update the head docstring and the comment above `--layout`: the K is the place now, `fan` stays reachable for comparison. The stills pipeline in the README runs with no `--layout` and therefore renders the K, which is what spec section 6.3 asks.

- [ ] **Step 3: The K in the floor's own material**

The glow planes go for the K layout. The strokes, the hub and the node discs are drawn into a mask image with numpy and fed to the floor material's emission, so the Cycles renders, the floor bake in Task 2 and the runtime all show the same floor. Constants `FLOOR_SIZE = 100`, `MASK_PX = 2048`, `GLOW = float(arg("--glow", "0.3"))`, `HUB_GAIN = 1.4` (the hub is the mark's largest and brightest element).

```python
import numpy as np


def k_mask(px, size, lanes, stroke, hub, node, hub_gain):
    """
    The letter as a picture on the floor's UV square.

    1 on a stroke or a node disc, `hub_gain` on the hub, 0 elsewhere, and every
    edge one texel soft so the bake does not alias it. Rows run in Blender's
    image order, bottom up: row 0 is v = 0, the floor's near edge (three.js
    +z), because image.pixels is filled in that order and the floor's UVs put
    v = 0 there (see floor_k below).
    """
    half = size / 2
    texel = size / px
    xs = (np.arange(px) + 0.5) / px * size - half
    zs = half - (np.arange(px) + 0.5) / px * size
    X, Z = np.meshgrid(xs, zs)
    m = np.zeros((px, px), dtype=np.float32)

    def disc(cx, cz, r, value):
        d = np.hypot(X - cx, Z - cz)
        np.maximum(m, value * np.clip((r - d) / texel + 0.5, 0, 1), out=m)

    def segment(ax, az, bx, bz, w):
        vx, vz = bx - ax, bz - az
        u = np.clip(((X - ax) * vx + (Z - az) * vz) / (vx * vx + vz * vz), 0, 1)
        d = np.hypot(X - (ax + u * vx), Z - (az + u * vz))
        np.maximum(m, np.clip((w / 2 - d) / texel + 0.5, 0, 1), out=m)

    for lane in lanes:
        nx = -lane["dist"] * math.sin(lane["angle"])
        nz = -lane["dist"] * math.cos(lane["angle"])
        segment(0, 0, nx, nz, stroke)
        disc(nx, nz, node, 1.0)
    disc(0, 0, hub, hub_gain)
    return m


def mask_image(name, m):
    px = m.shape[0]
    img = bpy.data.images.new(name, px, px, alpha=False, float_buffer=True)
    img.colorspace_settings.name = "Non-Color"
    rgba = np.dstack([m, m, m, np.ones_like(m)]).ravel()
    img.pixels.foreach_set(rgba)
    return img


def floor_k(mask):
    """
    The floor with the letter in it. Principled for the light to fall on, and
    the mask as emission strength, so the strokes glow the accent at GLOW and
    the hub at GLOW times HUB_GAIN. The plane carries UVs from (0, 0) at the
    near left corner to (1, 1) at the far right, which is the mapping k_mask
    and Task 2's floor bake both assume.
    """
    mat = bpy.data.materials.new("floor.k")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = lin(PALETTE["floor"])
    bsdf.inputs["Roughness"].default_value = FLOOR_ROUGH
    bsdf.inputs["Specular IOR Level"].default_value = 0.6
    bsdf.inputs["Emission Color"].default_value = lin(PALETTE["accent"])
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = mask
    tex.interpolation = "Linear"
    tex.extension = "CLIP"
    gain = nodes.new("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = GLOW
    links.new(tex.outputs["Color"], gain.inputs[0])
    links.new(gain.outputs["Value"], bsdf.inputs["Emission Strength"])

    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=FLOOR_SIZE / 2)
    uv_layer = bm.loops.layers.uv.new("UVMap")
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            loop[uv_layer].uv = (co.x / FLOOR_SIZE + 0.5, co.y / FLOOR_SIZE + 0.5)
    ob = finish("floor", bm, mat, None, (0, 0, 0))
    ob["kc"] = "floor"
    return ob


floor_ob = floor_k(mask_image("k-mask", k_mask(MASK_PX, FLOOR_SIZE, LANES, 2.1, 2.7, 1.9, HUB_GAIN)))
```

Note `bmesh.ops.create_grid`'s `size` is the half extent in 4.5 (a size of 150 made the 300 wide plane the script has today), so `FLOOR_SIZE / 2` is a 100 wide floor. Measure it after the first run (`ob.dimensions`) and correct the comment if the API says otherwise.

For `LAYOUT == "fan"` keep today's floor and glow planes untouched.

- [ ] **Step 4: Tags on the objects**

Every mesh gets a custom property `kc` so Task 2's bake and export, and the runtime, can tell bodies from screens from emitters without parsing names. In `screen(...)` add a `kind` argument and set `ob["kc"] = f"screen:{kind}"` (`landing`, `dashboard`, `work`); the off screen in the office gets no kind and stays a body. In `build_care`, the lit LEDs (`bay{k}.led1`, `led2`) and `status.lamp` get `ob["kc"] = "emitter"`. Everything else defaults to body. Bodies join into one mesh per way in Task 2; screens and emitters stay separate so the runtime can swap their materials.

- [ ] **Step 5: One static rig for the whole letter**

Baked light cannot move per shot, so for the K the lights are placed once and the per-shot block in the render loop runs only for `fan`. In three.js coordinates, converted with `P()`:

```python
def rig_k():
    """
    Thirteen lights, placed once, so that the six poses, the fallback stills
    and the bake all see the same light.

    The ceiling is today's junction key over the K: 44 by 44, 12 kW, a broad
    soft light so every node is lit and the graph reads from above. Each node
    then gets the close-up rig the stills used, fixed at that lane's own
    geometry: the key above and to the right of the object a little towards
    the hub, the fill where the standing camera stands, the cool rim behind
    the object. `forward` is the direction from the hub to the node, which is
    exactly the direction the standing camera looks, so the numbers are the
    ones the stills were lit with.
    """
    ceiling = light("ceiling", "AREA", KEY_COLOR, JUNCTION_KEY_W * 2)
    ceiling.data.shape = "SQUARE"
    ceiling.data.size = 44
    ceiling.data.spread = math.radians(110)
    ceiling.location = P(2, 20, 0)
    aim(ceiling, P(0, 1.5, -2))
    lamps = [ceiling]
    for geom in LANES:
        target = lane_target(geom["angle"], geom["dist"], geom["aimY"])
        forward = Vector((target.x, 0, target.z)).normalized()
        right = Vector((-forward.z, 0, forward.x))
        key = light(f"key.{geom['key']}", "AREA", KEY_COLOR, KEY_W)
        key.data.shape = "RECTANGLE"
        key.data.size, key.data.size_y = 6, 4
        key.data.spread = math.radians(SPREAD)
        key.location = P(*(target + Vector((0, 7.5, 0)) - forward * 3.0 + right * 4.0))
        aim(key, P(*target))
        rim = light(f"rim.{geom['key']}", "AREA", PALETTE["lightFill"], RIM_W)
        rim.data.size = 8
        rim.location = P(*(target + forward * 7 + Vector((0, 6, 0)) - right * 3))
        aim(rim, P(*target))
        fill = light(f"fill.{geom['key']}", "POINT", PALETTE["lightFill"], FILL_W)
        fill.data.shadow_soft_size = 1.5
        fill.location = P(*(stand_off(target, geom["back"]) + Vector((0, 1.0, 0))))
        lamps += [key, rim, fill]
    for lamp in lamps:
        lamp.visible_glossy = False
        lamp.visible_camera = False
    return lamps
```

`stand_off` returns a Vector in three.js coordinates today, so `P(*...)` converts it. The `key`, `fill`, `rim` module-level lights and the per-shot block stay for `fan` only, inside `if LAYOUT == "fan":`.

- [ ] **Step 6: Six poses**

For the K, `SHOTS` starts as:

```python
SHOTS = {
    "junction": {
        "pos": vec_arg(CAM_OVERRIDE, Vector((14, 32, 30)) if LAYOUT == "k" else Vector((0, 5, 15))),
        "look": vec_arg(LOOK_OVERRIDE, Vector((6, 0, 0)) if LAYOUT == "k" else Vector((0, 1.6, -10))),
        "fit": (WIDE_FIT_H, WIDE_FIT_V),
        "fstop": 11.0,
    }
}
if LAYOUT == "k":
    first = LANES[0]
    SHOTS["hub"] = {
        "pos": Vector((0, 6, 0)),
        "look": lane_target(first["angle"], first["dist"], first["aimY"]),
        "fit": (LANE_FIT_H, LANE_FIT_V),
        "fstop": 8.0,
    }
```

The default `--shots` list for the K is `junction,hub,website,app,capacity,care`; the stills pipeline passes its own five. The hub pose in the JSON carries the look of the first way; the runtime replaces the look per transit (spline.ts, Task 3).

- [ ] **Step 7: `layout.json`**

After the render loop, for the K layout, write `<out>/layout.json` with the shape at the top of this task, from a function `layout_report()` that returns the dict (Task 2's `scene.json` starts from the same function). Convert Blender vectors to three.js with `(v.x, v.z, -v.y)`; `anchors` are today's `anchors[key]` (already Blender space, converted), `bounds` from `lane_box(key)` converted the same way (mind that min z and max z swap sign: take the min and max after converting the eight corners). Round to 3 decimals.

- [ ] **Step 8: Render for review**

From `web/`, in the background:

```bash
nohup ~/opt/blender/blender -b -P tools/blender/crossroads.py -- --out tools/blender/renders/review --frame full --scale 0.6 --samples 96 --shots junction,hub,website,app,capacity,care > tools/blender/renders/review.log 2>&1 &
```

Poll `grep -c "Blender quit" tools/blender/renders/review.log` every 30 s. Expect six PNGs and `layout.json`. Look at each one (Read the PNG) before sending. Send the six PNGs to the owner with SendUserFile and ask three things: does the K read as the mark from the map, does each stand frame its object, is the glow right. Wait for the answer. Apply changes (any of R, the map camera, `back`/`aimY`, GLOW, the rig) and re-render the affected poses until the owner says go.

- [ ] **Step 9: Gates and commit**

Run every gate. Then:

```bash
git add web/tools/blender/crossroads.py README.md
git commit -m "The place in Blender: the K in the floor, one rig for the whole letter, six poses, the palette read from its source"
```

---
### Task 2: Baked and exported: lightmaps, the floor, glTFs, the manifest, the loader, and a viewer beside the renders

Done by the controller (Blender), with the TypeScript modules written by an implementer if the controller prefers. Ends with the owner's review of the viewer beside the Cycles renders.

**Files:**
- Modify: `web/tools/blender/crossroads.py` (`--bake <dir>`)
- Create: `web/tools/blender/emit-scene.mjs`
- Modify: `web/package.json`, `web/package-lock.json` (`three@0.185.1`, `@types/three@^0.185.4`, `gltfpack` at the version npm reports, 1.2.0 on 2 September 2026)
- Create: `web/public/crossroads/scene/{website,app,capacity,care}.glb`, `lightmap-<key>.webp`, `lightmap-<key>@2x.webp`, `floor.webp`, `floor@2x.webp`
- Create (generated): `web/src/components/crossroads/scene-manifest.ts`
- Modify: `web/src/components/crossroads/types.ts`
- Create: `web/src/components/crossroads/assets.ts`, `camera.ts`, `studio.ts`, `post.ts`, `registry.ts`
- Create: `web/tests/unit/crossroads-manifest.spec.ts`
- Modify: `web/tests/unit/crossroads-stills.spec.ts` (the left-to-right test, see Step 10)
- Create: `web/tools/blender/viewer/index.html`, `viewer.js`, `serve.mjs`, `shoot.mjs`
- Re-render: `web/public/crossroads/*.webp`, `web/public/crossroads.webp`, `web/public/crossroads-phone.webp`, `web/src/components/crossroads/stills.ts`
- Modify: `.gitignore`, `web/.prettierignore` (`web/tools/blender/scene/`, `web/tools/blender/viewer/_build/`), `README.md`

**Interfaces produced (Tasks 3 to 5 consume exactly these):**

`types.ts` gains:

```ts
import type { Vector3 } from 'three';

export type Vec3 = readonly [number, number, number];

/**
 * One camera pose as the pipeline exports it: where it stands, what it looks
 * at, the half-angles it must cover (see fovFor in camera.ts) and its
 * aperture as an f-stop, which post.ts turns into a depth of field.
 */
export type Pose = { pos: Vec3; look: Vec3; fitH: number; fitV: number; fstop: number };

/** The camera as the runtime moves it: the same five things with live vectors, rewritten in place every frame. */
export type CameraState = { pos: Vector3; look: Vector3; fitH: number; fitV: number; fstop: number };

/** Where one way's name belongs on screen, in CSS pixels inside the view. `front` is false behind the lens. */
export type Mark = { x: number; y: number; front: boolean };
```

`scene-manifest.ts` (generated, the shape is fixed here):

```ts
// Generated by tools/blender/emit-scene.mjs from a Blender bake. Do not edit by hand:
// re-bake and run the emitter, so the numbers and the files never disagree.

import type { Pose, ServiceKey, Vec3 } from './types';

export type PoseKey = 'junction' | 'hub' | ServiceKey;
/** One texture at 1x and 2x, as site-root paths. The runtime picks by device pixel ratio. */
export type Picture = { x1: string; x2: string };
export type Lane = { key: ServiceKey; angle: number; dist: number; node: Vec3; back: number; aimY: number };
export type WayAsset = {
  model: string;
  lightmap: Picture;
  /** Multiplies the 0..1 lightmap back into the bake's own light (lightMapIntensity). */
  lightScale: number;
  anchor: Vec3;
  bounds: { min: Vec3; max: Vec3 };
};

export const SCENE_ORDER: readonly ServiceKey[] = ['website', 'app', 'capacity', 'care'];
export const LAYOUT: {
  rotate: number; strokeWidth: number; hub: number; node: number; floorSize: number;
  fade: readonly [number, number]; lanes: readonly Lane[];
} = { /* generated */ };
export const POSES: Record<PoseKey, Pose> = { /* generated */ };
export const WAYS: Record<ServiceKey, WayAsset> = { /* generated */ };
export const FLOOR: { texture: Picture; scale: number } = { /* generated */ };
/** Bytes of every 1x file above together: what a visitor at 1x fetches. */
export const BYTES_1X = 0;
```

`camera.ts`:

```ts
export function fovFor(fitH: number, fitV: number, aspect: number): number;
/** Camera at `state`, composed into the free region right of `reserve` on a view of viewW by viewH CSS pixels. Updates the world matrix. */
export function applyPose(camera: PerspectiveCamera, state: CameraState, viewW: number, viewH: number, reserve: number): void;
/** `point` to view pixels, into `out`. */
export function projectTo(camera: PerspectiveCamera, point: Vector3, viewW: number, viewH: number, out: Mark): Mark;
export function stateOf(pose: Pose): CameraState;
```

`assets.ts`:

```ts
export const EMITTER_GAIN = 2.5;
export const ENVIRONMENT_INTENSITY = 0.4;
/** Device pixel ratio at and above which the 2x textures are fetched. */
export const RETINA = 1.5;
export type LoadedWay = { key: ServiceKey; group: Group; box: Box3; anchor: Vector3; screens: Mesh[]; emitters: Mesh[] };
export type Loaded = { floor: Mesh; ways: LoadedWay[]; dispose(): void };
export type LoadOptions = {
  dpr: number;
  labels: SceneLabels;
  /** Site-root path to URL: `asset` from lib/base-path on the page, a prefix in the viewer. */
  url: (path: string) => string;
  environment: Texture | null;
};
export function loadScene(opts: LoadOptions): Promise<Loaded>;
```

`post.ts`:

```ts
export const BLOOM = { strength: 0.35, radius: 0.3, threshold: 1.05 } as const;
export const BLOOM_SCALE = 0.5;
/** BokehPass blurs by (focus - depth) * aperture, clamped to maxblur, in UV units: gain / fstop is the aperture. */
export const DOF = { gain: 0.006, maxblur: 0.012 } as const;
export type Post = { render(): void; setSize(width: number, height: number): void; setFocus(distance: number, fstop: number): void; dispose(): void };
export function createPost(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): Post;
```

`studio.ts` and `registry.ts`: the August modules as they stand at `claude/crossroads-depth-2026-09-02` (`git show claude/crossroads-depth-2026-09-02:web/src/components/crossroads/studio.ts`), `bakeStudio(renderer): Texture` and `createRegistry()`.

- [ ] **Step 1: Dependencies**

From `web/`: `npm install three@0.185.1` and `npm install --save-dev @types/three@^0.185.4 gltfpack`. Check `npx gltfpack -h` prints usage. Commit nothing yet.

- [ ] **Step 2: `--bake <dir>` in `crossroads.py`**

New arguments: `BAKE = arg("--bake", "")`, `BAKE_SAMPLES = int(arg("--bake-samples", "128"))`, constants `LIGHTMAP_PX = 2048`, `FLOOR_PX = 4096`. When `BAKE` is set (K layout only) the shot loop is skipped and `bake_all(BAKE)` runs. Pieces:

```python
def select_only(obs, active):
    for ob in scene.objects:
        ob.select_set(False)
    for ob in obs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = active


def own_space(ob):
    """
    Modifiers applied, parent cleared, transforms applied: the mesh becomes its
    own world-space self. join() drops the modifiers of every object but the
    active one and keeps parent transforms nowhere, so both have to be baked
    into the vertices first, and an exported mesh with no parent lands in
    three.js exactly where the scene had it.
    """
    select_only([ob], ob)
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        for mod in list(ob.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def join_way(key):
    """One body per way with a lightmap UV of its own, and the screens and emitters beside it."""
    obs = lane_objects[key]
    for ob in obs:
        own_space(ob)
    bodies = [ob for ob in obs if ob.get("kc", "body") == "body"]
    others = [ob for ob in obs if ob not in bodies]
    select_only(bodies, bodies[0])
    with bpy.context.temp_override(active_object=bodies[0], selected_objects=bodies, selected_editable_objects=bodies):
        bpy.ops.object.join()
    body = bodies[0]
    body.name = f"way.{key}"
    body["kc"] = "body"
    me = body.data
    # The lightmap is always the SECOND UV layer, so it exports as TEXCOORD_1
    # and the runtime reads it from channel 1 on every way. A way built only
    # of boxes has no UV layer at all before this, so one is made for it.
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    lm = me.uv_layers.new(name="lightmap")
    me.uv_layers.active = lm
    select_only([body], body)
    with bpy.context.temp_override(object=body, active_object=body, selected_objects=[body], selected_editable_objects=[body]):
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode="OBJECT")
    return body, others


def bake_into(obs, name, px, kind, uv_layer):
    """
    Bakes `obs` into one new float image. Every material slot of every object
    gets an Image Texture node named BAKE pointing at it and made active,
    which is how Cycles chooses where a bake lands. `kind` is `light` for a
    lightmap (diffuse direct plus indirect, no colour: the object's own colour
    is multiplied back in by three.js) or `floor` for the combined floor.
    """
    img = bpy.data.images.new(name, px, px, alpha=False, float_buffer=True)
    img.colorspace_settings.name = "Linear Rec.709"
    for ob in obs:
        for slot in ob.material_slots:
            nodes = slot.material.node_tree.nodes
            node = nodes.get("BAKE")
            if node is None:
                node = nodes.new("ShaderNodeTexImage")
                node.name = "BAKE"
            node.image = img
            nodes.active = node
    bake = scene.render.bake
    bake.margin = 16
    bake.use_clear = True
    bake.target = "IMAGE_TEXTURES"
    scene.cycles.samples = BAKE_SAMPLES
    select_only(obs, obs[0])
    with bpy.context.temp_override(active_object=obs[0], selected_objects=obs, selected_editable_objects=obs):
        if kind == "light":
            bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, uv_layer=uv_layer)
        else:
            bpy.ops.object.bake(type="COMBINED", pass_filter={"DIRECT", "INDIRECT", "DIFFUSE", "GLOSSY", "EMIT"}, uv_layer=uv_layer)
    return img


def normalise(img, floor_of_peak):
    """
    Scales the bake into 0..1 and returns what to multiply it by at runtime.
    The 99.5th percentile rather than the maximum, so one hot texel under a
    lamp does not push everything else into the bottom bits of a PNG.
    """
    px = img.size[0]
    buf = np.empty(px * px * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    rgba = buf.reshape(-1, 4)
    peak = max(float(np.percentile(rgba[:, :3].max(axis=1), 99.5)), floor_of_peak, 1e-6)
    rgba[:, :3] = np.clip(rgba[:, :3] / peak, 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    return peak


def denoise_to_png(img, path):
    """
    OpenImageDenoise over a bake, through the compositor. Cycles denoises a
    render and not a bake, and a 128 sample lightmap is grainy in every
    shadow. A scene of nothing with a Denoise node between the image and the
    output renders the denoised picture in seconds, and that scene's Standard
    view writes the same sRGB PNG a render would.
    """
    s = bpy.data.scenes.new("denoise")
    s.render.engine = "BLENDER_WORKBENCH"
    s.render.resolution_x, s.render.resolution_y = img.size
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGB"
    s.render.image_settings.color_depth = "8"
    s.view_settings.view_transform = "Standard"
    s.view_settings.look = "None"
    s.use_nodes = True
    t = s.node_tree
    t.nodes.clear()
    src = t.nodes.new("CompositorNodeImage")
    src.image = img
    dn = t.nodes.new("CompositorNodeDenoise")
    out = t.nodes.new("CompositorNodeComposite")
    t.links.new(src.outputs["Image"], dn.inputs["Image"])
    t.links.new(dn.outputs["Image"], out.inputs["Image"])
    s.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=s.name)
    bpy.data.scenes.remove(s)


def export_way(key, body, others, out_dir):
    for ob in others:
        kind = ob.get("kc", "")
        # No PNG in the file: the runtime draws every screen per language.
        if kind.startswith("screen:"):
            ob.data.materials[0] = emission(f"placeholder.{kind}", "ffffff", 1.0)
    obs = [body] + others
    select_only(obs, body)
    with bpy.context.temp_override(active_object=body, selected_objects=obs, selected_editable_objects=obs):
        bpy.ops.export_scene.gltf(
            filepath=os.path.join(out_dir, f"{key}.glb"),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_image_format="NONE",
            export_extras=True,
            export_yup=True,
            export_animations=False,
            export_lights=False,
            export_cameras=False,
            export_skins=False,
            export_morph=False,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
        )


def bake_all(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    ways = {}
    joined = {key: join_way(key) for key in lane_objects}
    for key, (body, others) in joined.items():
        img = bake_into([body], f"lightmap.{key}", LIGHTMAP_PX, "light", "lightmap")
        scale = normalise(img, 1e-6)
        denoise_to_png(img, os.path.join(out_dir, f"lightmap-{key}.png"))
        ways[key] = {"glb": f"{key}.glb", "lightmap": f"lightmap-{key}.png", "lightScale": round(scale, 4)}
        print(f"baked {key}: peak {scale:.3f}")
    floor_img = bake_into([floor_ob], "floor", FLOOR_PX, "floor", "UVMap")
    floor_scale = normalise(floor_img, 1.0)
    denoise_to_png(floor_img, os.path.join(out_dir, "floor.png"))
    for key, (body, others) in joined.items():
        export_way(key, body, others, out_dir)
    report = dict(layout_report())
    report["ways"] = ways
    report["floor"] = {"texture": "floor.png", "scale": round(floor_scale, 4)}
    with open(os.path.join(out_dir, "scene.json"), "w") as f:
        json.dump(report, f, indent=2)
```

`layout_report()` is the dict Task 1 writes to `layout.json`, factored into a function. `floor_ob` is the object `floor_k` returned. If the compositor denoise refuses to run in this Blender build, fall back to `img.save_render(path, scene=scene)` and raise `--bake-samples` to 512, and say so in the commit.

Run it, in the background, and expect it to take 30 to 60 minutes on this CPU (four 2048 lightmaps at 128 samples, one 4096 floor):

```bash
rm -rf tools/blender/scene && nohup ~/opt/blender/blender -b -P tools/blender/crossroads.py -- --bake tools/blender/scene --bake-samples 128 > tools/blender/scene.log 2>&1 &
```

Poll for `Blender quit`. Expect `scene.json`, four `.glb`, four `lightmap-*.png` at 2048, `floor.png` at 4096. Open two of the PNGs (Read) and check they are not black and not grainy.

- [ ] **Step 3: `emit-scene.mjs`**

Modelled on `emit-stills.mjs`. `node tools/blender/emit-scene.mjs --bake tools/blender/scene`:

1. Reads `scene.json`. Refuses if a lightmap is not `LIGHTMAP_PX` square or the floor not `FLOOR_PX` square (sharp metadata).
2. For each way: `npx gltfpack -i <bake>/<key>.glb -o public/crossroads/scene/<key>.glb -cc -kn -km -ke` (`execFileSync('npx', [...], { cwd: WEB })`). `-kn` keeps the named nodes apart (gltfpack merges meshes otherwise, and the screens and emitters must stay separate meshes), `-km` keeps material names, `-ke` keeps the extras that carry the `kc` tags.
3. Lightmaps: WebP quality 82 at 2x (2048) and 1x (1024, lanczos3). Floor: WebP quality 80 at 2x (4096) and 1x (2048). Files `lightmap-<key>@2x.webp`, `lightmap-<key>.webp`, `floor@2x.webp`, `floor.webp` under `public/crossroads/scene/`.
4. Sums the sizes of the 1x files and the glTFs into `BYTES_1X`, prints every file's size, refuses over 1.5 MB (the same cap as the gate, so the pipeline fails before the gate does).
5. Writes `src/components/crossroads/scene-manifest.ts` with the shape above, `LAYOUT` and `POSES` and the per-way `anchor`/`bounds` from `scene.json`, then runs prettier on it.

- [ ] **Step 4: `types.ts`, `registry.ts`, `studio.ts`, `camera.ts`**

`registry.ts` and `studio.ts` verbatim from the August branch (studio imports `PALETTE`). `camera.ts`:

```ts
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';

import type { CameraState, Mark, Pose } from './types';

/**
 * Field of view for a shot that must cover these half-angles at this aspect.
 *
 * Vertical, because that is the only fov three.js takes. Whichever of the two
 * requirements the aspect makes harder is the one that sets it, so both are
 * always satisfied and a wide monitor spends its extra width on air around
 * the subject rather than on a different composition.
 */
export const fovFor = (fitH: number, fitV: number, aspect: number): number =>
  2 * Math.max(fitV, MathUtils.radToDeg(Math.atan(Math.tan(MathUtils.degToRad(fitH)) / aspect)));

export const stateOf = (pose: Pose): CameraState => ({
  pos: new Vector3(pose.pos[0], pose.pos[1], pose.pos[2]),
  look: new Vector3(pose.look[0], pose.look[1], pose.look[2]),
  fitH: pose.fitH,
  fitV: pose.fitV,
  fstop: pose.fstop,
});

/**
 * The camera at `state`, composed into the free region.
 *
 * The lens is computed against the aspect of the part of the view nobody is
 * standing on, and the frustum is shifted by half the reserve through
 * setViewOffset, which moves the image right by exactly reserve / viewW in
 * normalised device coordinates: the middle of the free region. A view with
 * no panel passes 0 and gets the symmetric frustum. setViewOffset calls
 * updateProjectionMatrix; the world matrix is updated here so projectTo can
 * be called straight after without trailing the picture by a frame.
 */
export function applyPose(
  camera: PerspectiveCamera,
  state: CameraState,
  viewW: number,
  viewH: number,
  reserve: number,
): void {
  const w = Math.max(1, viewW);
  const h = Math.max(1, viewH);
  camera.position.copy(state.pos);
  camera.lookAt(state.look);
  camera.aspect = w / h;
  camera.fov = fovFor(state.fitH, state.fitV, Math.max(1, w - reserve) / h);
  camera.setViewOffset(w, h, -reserve / 2, 0, w, h);
  camera.updateMatrixWorld();
}

const scratch = new Vector3();

export function projectTo(
  camera: PerspectiveCamera,
  point: Vector3,
  viewW: number,
  viewH: number,
  out: Mark,
): Mark {
  scratch.copy(point).applyMatrix4(camera.matrixWorldInverse);
  // Camera space, so -z is how far in front of the lens the point is. Behind
  // it the perspective divide mirrors the point onto the screen.
  if (-scratch.z <= camera.near) {
    out.front = false;
    return out;
  }
  scratch.applyMatrix4(camera.projectionMatrix);
  out.x = (scratch.x * 0.5 + 0.5) * viewW;
  out.y = (-scratch.y * 0.5 + 0.5) * viewH;
  out.front = true;
  return out;
}
```

- [ ] **Step 5: `assets.ts`**

```ts
import {
  Box3, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, SRGBColorSpace, TextureLoader, Vector3, type Texture,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { PALETTE } from './palette';
import { createRegistry } from './registry';
import { FLOOR, LAYOUT, SCENE_ORDER, WAYS, type Picture } from './scene-manifest';
import { DASHBOARD_SIZE, LANDING_SIZE, WORK_SIZE, drawDashboard, drawLanding, drawWorkScreen } from './textures';
import type { SceneLabels, ServiceKey } from './types';
```

Rules the function follows, each with a why in its comment:

- `pick(p: Picture)` returns `p.x2` when `dpr >= RETINA`, else `p.x1`.
- Lightmaps: `TextureLoader.loadAsync(url(pick(way.lightmap)))`, then `colorSpace = SRGBColorSpace`, `flipY = false`, `channel = 1`. `flipY` is false because the UVs come from a glTF, whose origin is the top left, exactly as the PNG Blender wrote is read (Blender's exporter flips v on the way out).
- The floor: `PlaneGeometry(LAYOUT.floorSize, LAYOUT.floorSize)` rotated `-PI/2` about x, at y 0. Two rulings against the spec's letter, recorded in the file's head comment: the floor is built at runtime rather than exported as a glTF, because it is one quad and the manifest carries its size, and its material is `MeshStandardMaterial`, not the `MeshBasicMaterial` section 4 names, because a basic material cannot take the pointer light the same section asks for on the floor. The bake rides in the emissive channel, so the floor is unlit by anything but the bake until the cursor light arrives on its diffuse channel. `MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.9, metalness: 0, emissive: 0xffffff, emissiveMap: floorTexture, emissiveIntensity: FLOOR.scale, alphaMap: radialFade(), transparent: true })` and `envMapIntensity = 0`. The floor texture keeps `flipY` at its default (true), because PlaneGeometry's v = 1 edge lands at -z after the rotation, which is where the bake's v = 1 row is. The bake carries the look, the diffuse channel only answers the pointer light. `radialFade()` is a 256 by 256 canvas with a radial gradient, white inside `LAYOUT.fade[0] / floorSize` of the half width, black beyond `LAYOUT.fade[1] / floorSize`, as a CanvasTexture: the far floor fades to whatever ink the section paints, in either theme.
- Screens: `screenTexture(kind)` draws once per kind onto a canvas of `LANDING_SIZE`, `DASHBOARD_SIZE` or `WORK_SIZE` with `drawLanding(g, labels.landing)`, `drawDashboard(g, labels.dashboard)` or `drawWorkScreen(g)`; `CanvasTexture` with `colorSpace = SRGBColorSpace`, `flipY = false` (glTF UVs again); material `MeshBasicMaterial({ map, toneMapped: false })`. A screen's white is exactly 1.0, under the bloom threshold of 1.05 (see post.ts).
- Emitters: `MeshBasicMaterial({ color: new Color(PALETTE.status).multiplyScalar(EMITTER_GAIN), toneMapped: false })`, 2.5 times over white so the bloom finds them and nothing else.
- Bodies: every `MeshStandardMaterial` GLTFLoader built (base colour, roughness, metalness from Blender) gets `lightMap`, `lightMapIntensity = way.lightScale`, `envMap = environment`, `envMapIntensity = ENVIRONMENT_INTENSITY`. `material.needsUpdate = true` after.
- Tags: `const tag = (o) => String(o.userData.kc ?? o.parent?.userData.kc ?? 'body')`, because GLTFLoader puts a node's extras on the object it makes for the node, which is the Mesh for a one-primitive node and a Group over per-material Meshes for the joined body.
- `GLTFLoader` with `setMeshoptDecoder(MeshoptDecoder)`; every glTF and texture loads in parallel with `Promise.all`; on any rejection the loaded ones are disposed before the error propagates.
- `box` from `way.bounds`, `anchor` from `way.anchor`. `group` is `gltf.scene`.
- Every geometry, material and texture goes through `createRegistry().track`, and `dispose()` frees them all.

- [ ] **Step 6: `post.ts`**

The August module with a BokehPass between the render pass and the bloom, and `NoToneMapping`: the bakes already carry the look, so the composer's output pass only encodes to sRGB. Passes in order: `RenderPass`, `BokehPass(scene, camera, { focus: 10, aperture: DOF.gain / 11, maxblur: DOF.maxblur })`, `UnrealBloomPass` at `BLOOM_SCALE` of the canvas, `OutputPass`. `setFocus(distance, fstop)` writes `bokeh.uniforms.focus.value = distance` and `bokeh.uniforms.aperture.value = DOF.gain / fstop`. The target is `WebGLRenderTarget` with `samples: 4` and `HalfFloatType` for the same reasons the August file records. `setSize` sizes the composer, then the bloom at its own scale, then `bokeh.setSize(width * ratio, height * ratio)`.

- [ ] **Step 7: The manifest test**

`web/tests/unit/crossroads-manifest.spec.ts`:

```ts
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  BYTES_1X, FLOOR, LAYOUT, POSES, SCENE_ORDER, WAYS,
} from '../../src/components/crossroads/scene-manifest';

const PUBLIC = path.join(__dirname, '..', '..', 'public');
/** Spec section 7: what the scene may cost a visitor at 1x, lazily. */
const ASSETS_CAP = 1.5 * 1024 * 1024;
const ARM = Math.atan2(19, 18);

test('the K has the mark\'s proportions, in the order the rows stand', () => {
  expect(LAYOUT.lanes.map((l) => l.key)).toEqual([...SCENE_ORDER]);
  const R = LAYOUT.rotate;
  const want = [
    { dist: 18, angle: R },
    { dist: 26.2, angle: R - ARM },
    { dist: 26.2, angle: R - (Math.PI - ARM) },
    { dist: 18, angle: R + Math.PI },
  ];
  LAYOUT.lanes.forEach((lane, i) => {
    expect(lane.dist).toBeCloseTo(want[i]!.dist, 5);
    expect(lane.angle).toBeCloseTo(want[i]!.angle, 5);
    expect(lane.node[0]).toBeCloseTo(-lane.dist * Math.sin(lane.angle), 2);
    expect(lane.node[1]).toBe(0);
    expect(lane.node[2]).toBeCloseTo(-lane.dist * Math.cos(lane.angle), 2);
  });
  expect(LAYOUT.strokeWidth).toBe(2.1);
  expect(LAYOUT.hub).toBe(2.7);
  expect(LAYOUT.node).toBe(1.9);
});

test('every asset the manifest names exists, and the 1x set is under the cap', () => {
  const files = [FLOOR.texture.x1, FLOOR.texture.x2];
  let bytes = statSync(path.join(PUBLIC, FLOOR.texture.x1)).size;
  for (const key of SCENE_ORDER) {
    const way = WAYS[key];
    files.push(way.model, way.lightmap.x1, way.lightmap.x2);
    bytes += statSync(path.join(PUBLIC, way.model)).size;
    bytes += statSync(path.join(PUBLIC, way.lightmap.x1)).size;
  }
  for (const f of files) {
    expect(f).toMatch(/^\/crossroads\/scene\/[\w@.-]+$/);
    expect(existsSync(path.join(PUBLIC, f)), `${f} is missing`).toBe(true);
  }
  expect(bytes).toBe(BYTES_1X);
  expect(bytes).toBeLessThan(ASSETS_CAP);
});

test('six poses, every stand on its own lane looking at its own node', () => {
  expect(Object.keys(POSES).sort()).toEqual(['app', 'capacity', 'care', 'hub', 'junction', 'website']);
  for (const lane of LAYOUT.lanes) {
    const pose = POSES[lane.key];
    expect(pose.look[0]).toBeCloseTo(lane.node[0], 2);
    expect(pose.look[2]).toBeCloseTo(lane.node[2], 2);
    expect(pose.look[1]).toBeCloseTo(lane.aimY, 2);
    // On the lane: the camera's floor point is the node scaled towards the hub.
    const cross = pose.pos[0] * lane.node[2] - pose.pos[2] * lane.node[0];
    expect(Math.abs(cross)).toBeLessThan(0.05);
    const standing = Math.hypot(pose.pos[0] - lane.node[0], pose.pos[2] - lane.node[2]);
    expect(standing).toBeCloseTo(lane.back, 2);
  }
  expect(POSES.hub.pos).toEqual([0, 6, 0]);
});

test('every anchor floats above its own bounds', () => {
  for (const key of SCENE_ORDER) {
    const { anchor, bounds } = WAYS[key];
    expect(anchor[1]).toBeGreaterThan(bounds.max[1]);
    expect(anchor[0]).toBeGreaterThanOrEqual(bounds.min[0]);
    expect(anchor[0]).toBeLessThanOrEqual(bounds.max[0]);
    expect(anchor[2]).toBeGreaterThanOrEqual(bounds.min[2]);
    expect(anchor[2]).toBeLessThanOrEqual(bounds.max[2]);
    expect(WAYS[key].lightScale).toBeGreaterThan(0);
  }
});
```

Run `npm run test:unit`, expect green.

- [ ] **Step 8: The viewer**

`web/tools/blender/viewer/serve.mjs`: compiles `types.ts`, `palette.ts`, `labels.ts`, `textures.ts`, `scene-manifest.ts`, `registry.ts`, `camera.ts`, `studio.ts`, `post.ts`, `assets.ts` with `tsc` exactly as `capture-textures.mjs` does (same TSC_ARGS, same expected alias diagnostics, same `.js` extension fix, bare `three` specifiers left alone) into `tools/blender/viewer/_build/`, then serves `web/` on 127.0.0.1:4174 with a plain `node:http` static handler (mime for html, js, json, glb as `model/gltf-binary`, webp, png). It logs the URL and stays up until killed.

`index.html`: an import map `{ "imports": { "three": "/node_modules/three/build/three.module.js", "three/examples/jsm/": "/node_modules/three/examples/jsm/" } }`, a `<canvas id="view" width="1440" height="998">`, an `<img id="cycles">` beside it, a `<select id="pose">` with the six poses, `<script type="module" src="/tools/blender/viewer/viewer.js">`.

`viewer.js`: `WebGLRenderer({ canvas, antialias: true })` at pixel ratio 1, `NoToneMapping`, background `#1c201c`; `scene.environment = bakeStudio(renderer)` at the loader's intensity; `loadScene({ dpr: 1, labels: LABELS.de, url: (p) => '/public' + p, environment })`; a `PerspectiveCamera(50, 1440 / 998, 0.1, 400)`; `createPost`. `show(key)`: `applyPose(camera, stateOf(POSES[key]), 1440, 998, 632)`, with the hub's look replaced by `POSES.website.look`; `post.setFocus(pos.distanceTo(look), fstop)`; `post.render()`; sets `img.src` to `/tools/blender/renders/review/<key>.png`; increments `window.__frames`. Keys 1 to 6 switch poses.

`shoot.mjs`: Playwright chromium, viewport 1440x998, opens `http://127.0.0.1:4174/tools/blender/viewer/`, for each pose selects it, waits for `__frames` to advance, screenshots the canvas, and composites it beside the Cycles PNG (resized to 1440 wide with sharp) into `tools/blender/renders/review/viewer-<pose>.png`.

Run: `node tools/blender/viewer/serve.mjs &`, then `node tools/blender/viewer/shoot.mjs`. Look at every pair (Read). Send the six pairs to the owner and ask whether the live look matches the render closely enough to build on, and what to change (bloom, depth of field, the environment's strength, the glow). Wait. Apply and re-shoot until the owner says go. Every tuning number lands in `post.ts` or `assets.ts` with its measurement.

- [ ] **Step 9: The stills and the poster on the K**

The fallback and the poster are the same place now (spec section 6.3):

```bash
node tools/blender/capture-textures.mjs tools/blender/textures   # only if the textures directory is missing; needs a built, served site
rm -rf tools/blender/renders/stills && nohup ~/opt/blender/blender -b -P tools/blender/crossroads.py -- --out tools/blender/renders/stills --samples 128 --scale 2 --shots junction,website,app,capacity,care > tools/blender/renders/stills.log 2>&1 &
```

then the poster into `tools/blender/poster` with `--frame poster --samples 128`, then `node tools/blender/emit-stills.mjs --renders tools/blender/renders/stills --poster tools/blender/poster`. Look at the two poster crops in `public/`: the fractions in `emit-stills.mjs` were cut for the fan, and the K may want other ones. Measure on the poster PNG where the letter and the objects sit, move the fractions if they cut an object, and write the measurement in the comment. Check `check:bundle`'s stills cap: re-measure and move `STILLS_CAP` with a measured comment if the K stills weigh more.

- [ ] **Step 10: The stills test on the K**

`tests/unit/crossroads-stills.spec.ts` asserts the four junction anchors run left to right in row order. On the K they do not: from the map camera the far and near ends of the stem stand over each other, so the order across the screen is website, care, app, capacity. Replace that test with one that asserts the four junction anchors are pairwise at least 60 still pixels apart (measured: the closest pair on the fan stills was 191), which is the property the chips need. Run the browser suite: the clash test at the junction exercises the new stills at three widths.

- [ ] **Step 11: Ignore rules, README, gates, commit**

`.gitignore` and `web/.prettierignore` gain `web/tools/blender/scene/` and `web/tools/blender/viewer/_build/`. README's recipe gains the bake, the emitter and the viewer (three lines, same style as the stills lines). Every gate green. Then:

```bash
git add -A web/public/crossroads web/public/crossroads.webp web/public/crossroads-phone.webp web/src/components/crossroads web/tools/blender web/tests/unit web/package.json web/package-lock.json web/scripts .gitignore web/.prettierignore README.md
git commit -m "The place, baked and exported: lightmaps and the floor from Cycles, the models as glTF, the manifest, the loader, and a viewer beside the renders"
```

---
### Task 3: The maths with no GPU in it: the track, the flight, the glide, the labels

**Files:**
- Modify: `web/src/components/crossroads/track.ts`
- Create: `web/src/components/crossroads/spline.ts`, `journey.ts`, `marks.ts`
- Modify: `web/tests/unit/crossroads-track.spec.ts`
- Create: `web/tests/unit/crossroads-spline.spec.ts`, `crossroads-journey.spec.ts`, `crossroads-marks.spec.ts`

**Interfaces:**
- Consumes: `Pose`, `CameraState`, `Mark` from `./types`; `POSES`, `SCENE_ORDER` from `./scene-manifest`; `stateOf` from `./camera`.
- Produces: everything exported below. Task 4 drives the camera with `buildFlight`, `glideAt`, `settleState`, `stateSettled`, `copyState`, `parallaxOf`, `offsetPosition`; Task 5 reads `scrollT`, `scrollWay`, `nearestStop`, `shownWays`, `placeMarks`, `applyMarks`.

- [ ] **Step 1: The track, test first**

Replace `web/tests/unit/crossroads-track.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import {
  BAND_SVH, WAYS, nearestStop, scrollT, scrollWay, shownWays,
} from '../../src/components/crossroads/track';

test('the scroll places the camera continuously, 0 at the map and k at stop k', () => {
  const band = 270;
  expect(BAND_SVH).toBe(30);
  expect(WAYS).toBe(4);
  expect(scrollT(0, band)).toBe(0);
  expect(scrollT(135, band)).toBeCloseTo(0.5);
  expect(scrollT(band, band)).toBe(1);
  expect(scrollT(4 * band, band)).toBe(4);
  // Past the last stop the track runs out: the camera stays at the last stop.
  expect(scrollT(99 * band, band)).toBe(4);
  expect(scrollT(-50, band)).toBe(0);
  expect(scrollT(100, 0)).toBe(0);
  expect(scrollT(Number.NaN, band)).toBe(0);
});

test('the row lights when the camera is nearer its stop than the last one', () => {
  const band = 270;
  expect(nearestStop(0.49)).toBe(0);
  expect(nearestStop(0.5)).toBe(1);
  expect(nearestStop(3.6)).toBe(4);
  expect(nearestStop(9)).toBe(4);
  expect(scrollWay(0, band)).toBe(-1);
  expect(scrollWay(band / 2 - 1, band)).toBe(-1);
  expect(scrollWay(band / 2 + 1, band)).toBe(0);
  expect(scrollWay(band + 2, band)).toBe(0);
  expect(scrollWay(2 * band + 2, band)).toBe(1);
  expect(scrollWay(4 * band + 2, band)).toBe(3);
  expect(scrollWay(9 * band, band)).toBe(3);
  expect(scrollWay(100, 0)).toBe(-1);
});

test('the map names all four, a stop names its own, a hovered row names only itself', () => {
  expect(shownWays(0, -1)).toEqual([true, true, true, true]);
  expect(shownWays(0.4, -1)).toEqual([true, true, true, true]);
  expect(shownWays(0.6, -1)).toEqual([true, false, false, false]);
  expect(shownWays(2, -1)).toEqual([false, true, false, false]);
  expect(shownWays(4, -1)).toEqual([false, false, false, true]);
  expect(shownWays(0, 2)).toEqual([false, false, true, false]);
  expect(shownWays(3, 0)).toEqual([true, false, false, false]);
});
```

Run `npm run test:unit -- crossroads-track`, expect failures on the missing exports.

- [ ] **Step 2: `track.ts`**

```ts
/**
 * The pinned track, as numbers.
 *
 * Five stops, the map then the four ways, one band apart: the track adds
 * 150svh of travel, about nine wheel notches at 900px, with a snap on every
 * boundary so a flick lands on a stop. The same 30 is written in globals.css
 * in the `.crossroads-track` height, because CSS cannot read a constant, and
 * the two have to move together.
 *
 * What changed with the real-time scene: the scroll no longer SELECTS a
 * picture, it PLACES the camera. `scrollT` is the continuous position along
 * the flight, 0 at the map and k at stop k, and the row, the chips and the
 * camera are all read off it, so they cannot disagree about where the reader
 * is. The stills world reads only `scrollWay`, which is the nearest stop.
 */
export const BAND_SVH = 30;

/** How many ways the track walks. The flight and the stills are built for exactly this many. */
export const WAYS = 4;

/**
 * Where along the flight the reader is when the section's top has scrolled
 * `y` pixels above the viewport's top, with bands `band` pixels tall. 0 at
 * the map, k at stop k, clamped to the last stop: past it the stage releases
 * because the track runs out, not because this says so.
 */
export function scrollT(y: number, band: number, ways = WAYS): number {
  if (band <= 0 || !Number.isFinite(y)) return 0;
  return Math.min(ways, Math.max(0, y / band));
}

/** The stop nearest to t: 0 for the map, k for way k - 1. */
export function nearestStop(t: number, ways = WAYS): number {
  return Math.min(ways, Math.max(0, Math.round(t)));
}

/**
 * The way the track has selected, or -1 for the map.
 *
 * The nearest stop rather than the band the reader is in: the row lights
 * when the camera is more than halfway to it, the way the August glide named
 * its destination the moment it left, so the camera arrives at a thing that
 * is already named.
 */
export function scrollWay(y: number, band: number, ways = WAYS): number {
  return nearestStop(scrollT(y, band, ways), ways) - 1;
}

/**
 * Which chips may show at position t with `focus` on a row (-1 for none).
 * The map names all four, which is what a map is for. Nearer a stop than
 * the map, only that stop's way. A hovered or focused row names only itself,
 * wherever the track is. Whether a chip then FITS is marks.ts's question.
 */
export function shownWays(t: number, focus: number, ways = WAYS): boolean[] {
  const stop = focus >= 0 ? focus + 1 : nearestStop(t, ways);
  const out: boolean[] = [];
  for (let i = 0; i < ways; i += 1) out.push(stop === 0 || stop === i + 1);
  return out;
}
```

Run the track test, expect green.

- [ ] **Step 3: The flight, test first**

`web/tests/unit/crossroads-spline.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { Vector3 } from 'three';

import { stateOf } from '../../src/components/crossroads/camera';
import { POSES, SCENE_ORDER } from '../../src/components/crossroads/scene-manifest';
import { buildFlight } from '../../src/components/crossroads/spline';
import type { CameraState } from '../../src/components/crossroads/types';

const fresh = (): CameraState => ({ pos: new Vector3(), look: new Vector3(), fitH: 0, fitV: 0, fstop: 1 });
const stands = SCENE_ORDER.map((key) => POSES[key]);
const flight = buildFlight(POSES.junction, POSES.hub, stands);

test('every stop is exactly its pose', () => {
  expect(flight.stops).toBe(4);
  const poses = [POSES.junction, ...stands];
  poses.forEach((pose, k) => {
    const s = flight.at(k, fresh());
    const want = stateOf(pose);
    expect(s.pos.distanceTo(want.pos)).toBeLessThan(1e-6);
    expect(s.look.distanceTo(want.look)).toBeLessThan(1e-6);
    expect(s.fitH).toBeCloseTo(pose.fitH, 6);
    expect(s.fitV).toBeCloseTo(pose.fitV, 6);
    expect(s.fstop).toBeCloseTo(pose.fstop, 6);
  });
});

test('between two stops the camera passes over the hub, looking down the next stroke', () => {
  for (let k = 0; k < 4; k += 1) {
    const s = flight.at(k + 0.5, fresh());
    expect(s.pos.distanceTo(new Vector3(...POSES.hub.pos))).toBeLessThan(1e-6);
    const next = stateOf(stands[k]!);
    expect(s.look.distanceTo(next.look)).toBeLessThan(1e-6);
  }
});

test('the parameter is monotone and the camera never jumps', () => {
  let last = flight.at(0, fresh());
  let longest = 0;
  for (let t = 0.005; t <= 4; t += 0.005) {
    const now = flight.at(t, fresh());
    const step = now.pos.distanceTo(last.pos);
    expect(Number.isFinite(step)).toBe(true);
    longest = Math.max(longest, step);
    expect(now.look.distanceTo(now.pos), `the look point met the camera at t=${t}`).toBeGreaterThan(2);
    last = now;
  }
  // The longest stroke is 26.2 units and a half band covers it: about 0.3
  // units per 0.005 of t on a straight line, a bit more on the curve.
  expect(longest).toBeLessThan(0.8);
  expect(flight.at(-1, fresh()).pos.distanceTo(flight.at(0, fresh()).pos)).toBe(0);
  expect(flight.at(9, fresh()).pos.distanceTo(flight.at(4, fresh()).pos)).toBe(0);
});
```

- [ ] **Step 4: `spline.ts`**

```ts
import { CatmullRomCurve3, Vector3 } from 'three';

import type { CameraState, Pose } from './types';

/**
 * The flight: the camera's path through the six poses, as one parameter.
 *
 * t is 0 at the map and k at stop k. Between two stops the path passes over
 * the hub at k + 0.5, looking down the stroke it is about to fly, so the
 * hub is one pose used three times with three different looks. Positions
 * and look points are two centripetal Catmull-Rom curves through the same
 * waypoints, which pass through every waypoint exactly and never cusp or
 * loop between them; the lens and the aperture interpolate linearly on the
 * same waypoint index. The look point holds still on the way from the hub to
 * a stand, so the camera flies at the thing it is looking at.
 */
export type Flight = {
  /** The camera at t, into `out`. t is clamped to [0, stops]. */
  at(t: number, out: CameraState): CameraState;
  stops: number;
};

const toVector = (v: readonly [number, number, number]) => new Vector3(v[0], v[1], v[2]);

export function buildFlight(map: Pose, hub: Pose, stands: readonly Pose[]): Flight {
  if (stands.length === 0) throw new Error('crossroads: a flight needs a stop');
  const waypoints: Pose[] = [map];
  for (const stand of stands) waypoints.push({ ...hub, look: stand.look }, stand);
  const positions = new CatmullRomCurve3(waypoints.map((p) => toVector(p.pos)), false, 'centripetal');
  const looks = new CatmullRomCurve3(waypoints.map((p) => toVector(p.look)), false, 'centripetal');
  const stops = stands.length;
  const last = waypoints.length - 1;
  return {
    stops,
    at(t, out) {
      const clamped = Math.min(stops, Math.max(0, Number.isFinite(t) ? t : 0));
      // Waypoint index i sits at u = i / last, and stop k is waypoint 2k, so
      // u = 2k / (2 stops) = k / stops: an integer t lands on its stop exactly.
      positions.getPoint(clamped / stops, out.pos);
      looks.getPoint(clamped / stops, out.look);
      const p = clamped * 2;
      const i = Math.min(last - 1, Math.floor(p));
      const w = p - i;
      const a = waypoints[i];
      const b = waypoints[i + 1];
      if (a === undefined || b === undefined) throw new Error('crossroads: the flight lost a waypoint');
      out.fitH = a.fitH + (b.fitH - a.fitH) * w;
      out.fitV = a.fitV + (b.fitV - a.fitV) * w;
      out.fstop = a.fstop + (b.fstop - a.fstop) * w;
      return out;
    },
  };
}
```

Run the spline test, expect green. If the "never jumps" bound or the "look point met the camera" bound fails, print the offending t and the numbers, and fix the POSES (the hub's height, a stand's `back`) in Blender and re-export rather than loosening the test: those bounds are what keeps the flight watchable.

- [ ] **Step 5: The glide and the hand, test first**

`web/tests/unit/crossroads-journey.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { Vector3 } from 'three';

import {
  GLIDE_MS, PARALLAX_X, PARALLAX_Y, SETTLE_MS, blend, copyState, glideAt, isSettled,
  offsetPosition, parallaxOf, settle, settleState, smooth, stateSettled,
} from '../../src/components/crossroads/journey';
import type { CameraState } from '../../src/components/crossroads/types';

const state = (x: number, fitH = 24): CameraState => ({
  pos: new Vector3(x, 2, 10), look: new Vector3(x, 1, 0), fitH, fitV: 18, fstop: 2,
});
const fresh = (): CameraState => ({ pos: new Vector3(), look: new Vector3(), fitH: 0, fitV: 0, fstop: 1 });

test('a glide eases both ends and arrives exactly', () => {
  const from = state(0);
  const to = state(10, 30);
  const out = fresh();
  expect(glideAt(from, to, 1000, 1000, out)).toBe(false);
  expect(out.pos.x).toBe(0);
  glideAt(from, to, 1000, 1000 + GLIDE_MS / 2, out);
  expect(out.pos.x).toBeCloseTo(5, 6);
  expect(out.fitH).toBeCloseTo(27, 6);
  expect(glideAt(from, to, 1000, 1000 + GLIDE_MS, out)).toBe(true);
  expect(out.pos.x).toBe(10);
  expect(glideAt(from, to, 1000, 1000 + 5 * GLIDE_MS, out)).toBe(true);
  expect(smooth(0.25)).toBeLessThan(0.25);
  expect(smooth(0.75)).toBeGreaterThan(0.75);
  expect(glideAt(from, to, 0, 0, out, 0)).toBe(true);
  expect(out.pos.x).toBe(10);
});

test('settle is the same after any slicing of the same time', () => {
  const whole = settle(0, 1, 300);
  let sliced = 0;
  for (let i = 0; i < 30; i += 1) sliced = settle(sliced, 1, 10);
  expect(sliced).toBeCloseTo(whole, 6);
  expect(settle(0, 1, 0)).toBe(0);
  expect(settle(0, 1, 3 * SETTLE_MS)).toBeGreaterThan(0.95);
  expect(isSettled(0.9995, 1)).toBe(true);
  expect(isSettled(0.9, 1)).toBe(false);
  const a = state(0);
  settleState(a, state(10, 30), 10 * SETTLE_MS, SETTLE_MS);
  expect(stateSettled(a, state(10, 30))).toBe(true);
});

test('blend at 0 and 1 is its ends, in place', () => {
  const out = fresh();
  blend(state(0), state(10, 30), 0, out);
  expect(out.pos.x).toBe(0);
  expect(out.fitH).toBe(24);
  blend(state(0), state(10, 30), 1, out);
  expect(out.pos.x).toBe(10);
  expect(out.fitH).toBe(30);
  const copy = copyState(state(3, 20), fresh());
  expect(copy.pos.x).toBe(3);
  expect(copy.fitH).toBe(20);
  expect(stateSettled(copy, state(3, 20))).toBe(true);
});

test('the hand moves the camera in its own screen plane and never further than the reach', () => {
  expect(parallaxOf(0, 0)).toEqual([0, 0]);
  expect(parallaxOf(1, 1)).toEqual([PARALLAX_X, -PARALLAX_Y]);
  expect(parallaxOf(5, -5)).toEqual([PARALLAX_X, PARALLAX_Y]);
  const pos = new Vector3(0, 2, 10);
  const look = new Vector3(0, 1, 0);
  const out = new Vector3();
  offsetPosition(pos, look, 1, 0, out);
  // Looking down -z, right is +x.
  expect(out.x).toBeCloseTo(1, 6);
  expect(out.z).toBeCloseTo(10, 6);
  offsetPosition(pos, look, 0, 1, out);
  expect(out.y).toBeGreaterThan(2);
  expect(out.distanceTo(pos)).toBeCloseTo(1, 6);
  offsetPosition(pos, look, 0, 0, out);
  expect(out.equals(pos)).toBe(true);
});
```

- [ ] **Step 6: `journey.ts`**

```ts
import type { Vector3 } from 'three';

import type { CameraState } from './types';

/**
 * The choreography, with no renderer in it.
 *
 * Two kinds of camera motion and one hand. A GLIDE is what a hovered or
 * focused row asks for: smoothstep from wherever the camera is to the way's
 * pose over GLIDE_MS, and back to the track's own position when the row is
 * let go. A SETTLE is how the camera follows the track between glides: an
 * exponential ease towards the flight's position at the current scroll, so a
 * wheel notch reads as travel rather than as a cut. The hand is a parallax
 * offset in the camera's own screen plane and a light on the floor, both
 * eased with the same settle. Every function here is pure or writes only
 * into the object it is handed, which is why the unit suite needs no GPU.
 */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Smoothstep. Eases both ends of every glide. */
export const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * How long a glide between two poses takes. Long enough that the camera
 * reads as travelling through a place rather than cutting, short enough that
 * a pointer sweeping down four rows arrives before the eye has moved on. The
 * August scene measured it against the 40svh a move used to take at a
 * normal wheel pace, which was about this.
 */
export const GLIDE_MS = 720;

/** Time constant of every pointer-driven ease, in milliseconds. */
export const SETTLE_MS = 140;

/**
 * Time constant of the camera following the track. Shorter than the hand's:
 * the scroll is the reader's own motion and a camera that lags it by more
 * than a few frames feels like it is being dragged.
 */
export const SCROLL_TAU_MS = 90;

/** Time constant of the cursor light going out. Three of these is 95% gone. */
export const LIGHT_FADE_MS = 100;

/**
 * How far the camera may stand from its pose in its own screen plane, in
 * world units, with the pointer at the edge of the stage. Half a unit at a
 * standoff of nine to thirteen is about two and a half degrees of pan:
 * enough to move the floor behind the subject, not enough to move the
 * subject out of frame, which crossroads-framing.spec.ts holds.
 */
export const PARALLAX_X = 0.5;
export const PARALLAX_Y = 0.25;

/** Closer than this to its target, an eased value has arrived. */
export const SETTLED = 1e-3;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** `from` into `out`, every field. */
export function copyState(from: CameraState, out: CameraState): CameraState {
  out.pos.copy(from.pos);
  out.look.copy(from.look);
  out.fitH = from.fitH;
  out.fitV = from.fitV;
  out.fstop = from.fstop;
  return out;
}

/** `from` towards `to` by `t`, into `out`. `out` may be `from`. */
export function blend(from: CameraState, to: CameraState, t: number, out: CameraState): CameraState {
  out.pos.lerpVectors(from.pos, to.pos, t);
  out.look.lerpVectors(from.look, to.look, t);
  out.fitH = lerp(from.fitH, to.fitH, t);
  out.fitV = lerp(from.fitV, to.fitV, t);
  out.fstop = lerp(from.fstop, to.fstop, t);
  return out;
}

/**
 * Where the camera is at `now` on a glide that left `from` for `to` at
 * `startedAt`, into `out`. True once it has arrived, which is what tells the
 * loop it can park. `to` may move while the glide runs (the track scrolls
 * under a returning camera): the glide is towards wherever `to` is now.
 */
export function glideAt(
  from: CameraState,
  to: CameraState,
  startedAt: number,
  now: number,
  out: CameraState,
  duration: number = GLIDE_MS,
): boolean {
  const raw = duration <= 0 ? 1 : clamp01((now - startedAt) / duration);
  blend(from, to, smooth(raw), out);
  return raw >= 1;
}

/**
 * One step of an exponential ease from `current` towards `target`, `dtMs`
 * after the last one. The residual after any total time is exp(-time / tau)
 * however the time was sliced into frames, so a parked loop that wakes up
 * late does not jump and a fast loop does not crawl.
 */
export function settle(current: number, target: number, dtMs: number, tauMs = SETTLE_MS): number {
  if (dtMs <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
}

export const isSettled = (current: number, target: number): boolean =>
  Math.abs(target - current) < SETTLED;

/** `state` eased towards `target` in place, every field. */
export function settleState(state: CameraState, target: CameraState, dtMs: number, tauMs: number): void {
  const k = dtMs <= 0 ? 0 : 1 - Math.exp(-dtMs / tauMs);
  state.pos.lerp(target.pos, k);
  state.look.lerp(target.look, k);
  state.fitH = lerp(state.fitH, target.fitH, k);
  state.fitV = lerp(state.fitV, target.fitV, k);
  state.fstop = lerp(state.fstop, target.fstop, k);
}

export const stateSettled = (state: CameraState, target: CameraState): boolean =>
  state.pos.distanceToSquared(target.pos) < SETTLED * SETTLED &&
  state.look.distanceToSquared(target.look) < SETTLED * SETTLED &&
  isSettled(state.fitH, target.fitH) &&
  isSettled(state.fitV, target.fitV) &&
  isSettled(state.fstop, target.fstop);

const clampUnit = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);

/**
 * Where the camera stands off its pose for a pointer at (px, py), each in
 * [-1, 1] across the stage. Screen y grows downward and the camera's up does
 * not, which is the minus sign.
 */
export function parallaxOf(px: number, py: number): [number, number] {
  return [clampUnit(px) * PARALLAX_X + 0, -clampUnit(py) * PARALLAX_Y + 0];
}

/**
 * `pos` moved `dx` to the camera's right and `dy` up, in the screen plane of
 * a camera at `pos` looking at `look`, into `out`. The subject stays framed
 * and everything at another depth moves behind it, which is what parallax is.
 */
export function offsetPosition(pos: Vector3, look: Vector3, dx: number, dy: number, out: Vector3): Vector3 {
  out.copy(pos);
  if (dx === 0 && dy === 0) return out;
  let fx = look.x - pos.x;
  let fy = look.y - pos.y;
  let fz = look.z - pos.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = forward x world up, which for a camera looking down -z is +x.
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  // up = right x forward.
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  out.set(pos.x + rx * dx + ux * dy, pos.y + uy * dy, pos.z + rz * dx + uz * dy);
  return out;
}
```

Run the journey test, expect green.

- [ ] **Step 7: The labels' rules, test first**

`web/tests/unit/crossroads-marks.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import { MARK_GAP, placeMarks, type Metrics } from '../../src/components/crossroads/marks';

const metrics: Metrics = { reserve: 632, stageW: 1440, stageH: 900, half: [104, 122, 92, 85], tall: 30 };

test('a chip stands at its anchor when there is room', () => {
  const [a] = placeMarks([{ x: 900, y: 400, on: true }], metrics);
  expect(a).toEqual({ x: 900, y: 400, on: true });
});

test('a chip is nudged into the free region by up to half its width, and dropped past that', () => {
  const [nudged] = placeMarks([{ x: 700, y: 400, on: true }], metrics);
  expect(nudged!.x).toBe(632 + MARK_GAP + 104);
  expect(nudged!.on).toBe(true);
  const [dropped] = placeMarks([{ x: 600, y: 400, on: true }], metrics);
  expect(dropped!.on).toBe(false);
  // 1370 is 46px past the right bound of 1324, under half the chip's 104.
  const [right] = placeMarks([{ x: 1370, y: 400, on: true }], metrics);
  expect(right!.x).toBe(1440 - MARK_GAP - 104);
  expect(right!.on).toBe(true);
});

test('a chip is held under the top edge and dropped off the bottom', () => {
  // Held at MARK_GAP + tall = 42: a 12px move, inside the half-height rule.
  const [top] = placeMarks([{ x: 900, y: 30, on: true }], metrics);
  expect(top!.y).toBe(MARK_GAP + 30);
  expect(top!.on).toBe(true);
  // From 5 the hold would be 37px, past half the chip's height, so it is dropped.
  const [far] = placeMarks([{ x: 900, y: 5, on: true }], metrics);
  expect(far!.on).toBe(false);
  const [low] = placeMarks([{ x: 900, y: 895, on: true }], metrics);
  expect(low!.on).toBe(false);
});

test('a chip clashing with one placed to its left is lifted a line, twice at most', () => {
  // Same line, 60px apart, chips 208 and 244 wide: one lift of tall + 4 clears it.
  const [first, second] = placeMarks(
    [{ x: 900, y: 400, on: true }, { x: 960, y: 400, on: true }],
    metrics,
  );
  expect(first!.y).toBe(400);
  expect(second!.y).toBe(400 - (30 + 4));
  expect(second!.on).toBe(true);
  // Four on one line: the second lifts once, the third twice, the fourth has
  // nowhere left to go inside two lifts and is dropped.
  const four = placeMarks(
    [{ x: 900, y: 400, on: true }, { x: 910, y: 400, on: true }, { x: 920, y: 400, on: true }, { x: 930, y: 400, on: true }],
    { ...metrics, half: [104, 104, 104, 104] },
  );
  expect(four.map((c) => c.y)).toEqual([400, 366, 332, 400]);
  expect(four.map((c) => c.on)).toEqual([true, true, true, false]);
});

test('a chip that is off is left where it is and stays off', () => {
  const [off] = placeMarks([{ x: 100, y: 100, on: false }], metrics);
  expect(off!.on).toBe(false);
});
```

- [ ] **Step 8: `marks.ts`**

Today's `place()` from `index.tsx` lines 298 to 404, made pure. Keep every comment from there (the nudge, the lift, the drop test) with the code it explains.

```ts
/**
 * Where the four labels stand, and whether they stand at all.
 *
 * A pure pass over four candidates in stage pixels, shared by both worlds:
 * the stills world's candidates come from the render's anchors through the
 * contain transform, the live world's from the camera projecting the
 * objects' anchors every frame. What both need is the same three rules
 * written once: a chip is nudged into the free region beside the panel,
 * lifted clear of a neighbour, and dropped when neither is enough.
 */
export type Metrics = { reserve: number; stageW: number; stageH: number; half: number[]; tall: number };
export type Candidate = { x: number; y: number; on: boolean };
export type Placement = { x: number; y: number; on: boolean };

/**
 * How much clear space a label needs on every side before it is shown at all.
 * (today's comment)
 */
export const MARK_GAP = 12;

export function placeMarks(candidates: readonly Candidate[], m: Metrics): Placement[] {
  const { reserve, stageW, stageH, half, tall } = m;
  const chips = candidates.map((at, i) => {
    const w = half[i] ?? 0;
    const low = reserve + MARK_GAP + w;
    const high = stageW - MARK_GAP - w;
    return {
      at, w, low, high,
      x: low > high ? at.x : Math.min(Math.max(at.x, low), high),
      y: Math.max(at.y, MARK_GAP + tall),
      on: at.on,
    };
  });
  const clashes = (chip: (typeof chips)[number], before: number) =>
    chips.some(
      (other, j) =>
        j < before && other.on && Math.abs(chip.x - other.x) < chip.w + other.w && Math.abs(chip.y - other.y) < tall,
    );
  for (let i = 0; i < chips.length; i += 1) {
    const chip = chips[i];
    if (!chip || !chip.on) continue;
    for (let attempt = 0; attempt < 2 && clashes(chip, i); attempt += 1) {
      chip.y = Math.max(chip.y - (tall + 4), MARK_GAP + tall);
    }
    if (clashes(chip, i)) chip.on = false;
  }
  return chips.map(({ at, w, low, high, x, y, on }) => ({
    x: Math.round(x),
    y: Math.round(y),
    on:
      on &&
      low <= high &&
      Math.abs(x - at.x) <= w * 0.5 &&
      y - at.y <= tall * 0.5 &&
      y <= stageH - MARK_GAP,
  }));
}

/** Writes placements onto the label elements: one transform and data-on each, nothing else. */
export function applyMarks(placements: readonly Placement[], els: readonly (HTMLElement | null)[]): void {
  for (let i = 0; i < placements.length; i += 1) {
    const el = els[i];
    const p = placements[i];
    if (!el || !p) continue;
    el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    el.dataset.on = String(p.on);
  }
}
```

Note the top-edge rule: today a chip at y under `MARK_GAP + tall` is held at that line and still shown; the test above asserts that. The rounding moves from the DOM write to the placement so the unit test can assert whole numbers.

Run the marks test, expect green. Then all gates (typecheck will complain about nothing yet, since index.tsx still has its own copy of the rules; that copy goes in Task 5).

- [ ] **Step 9: Commit**

```bash
git add web/src/components/crossroads/track.ts web/src/components/crossroads/spline.ts web/src/components/crossroads/journey.ts web/src/components/crossroads/marks.ts web/tests/unit
git commit -m "The flight, the glide and the labels as plain maths: the track places the camera, six poses on one curve, the chips' rules shared by both worlds"
```

---
### Task 4: The scene: boot, the parked loop, the hand, the handle, and the framing suite

**Files:**
- Create: `web/src/components/crossroads/scene.ts`, `pointer.ts`
- Modify: `web/src/components/crossroads/types.ts` (`Handle`, `BootOptions`)
- Create: `web/tests/unit/crossroads-framing.spec.ts`

**Interfaces:**
- Consumes: `loadScene`, `RETINA` from `./assets`; `applyPose`, `projectTo`, `stateOf` from `./camera`; `buildFlight` from `./spline`; everything from `./journey`; `createPost` from `./post`; `bakeStudio` from `./studio`; `createRegistry` from `./registry`; `POSES`, `SCENE_ORDER`, `WAYS`, `LAYOUT` from `./scene-manifest`; `PALETTE`.
- Produces (Task 5 talks to the scene only through this):

```ts
/** What boot() resolves to. */
export type Handle = {
  /** Glide to way `way`'s pose, or back to the track's position for -1. The same way twice is a no-op. */
  aim(way: number): void;
  /** The track's position: 0 the map, k stop k, fractions between. The camera settles onto the flight there. */
  scroll(t: number): void;
  /** The section has come into view. Called once; later calls do nothing. */
  reveal(): void;
  /**
   * The pointer is at (x, y) in CSS pixels inside the view. Returns the way
   * under it, or -1. Also aims the parallax and the cursor light.
   */
  pointer(x: number, y: number): number;
  /** The pointer has left the stage. Parallax and light ease to rest. */
  pointerLeave(): void;
  /** Where each way's label belongs this frame, in the order the ways were handed over. Rewritten in place. */
  marks(): readonly Mark[];
  /** The ink the world stands in: anything THREE.Color accepts, in practice the section's computed background. */
  setBackground(css: string): void;
  /** True while the loop is parked: nothing moving, no frame scheduled. */
  parked(): boolean;
  /** Frames drawn since boot. The browser suite reads it through the component. */
  frames(): number;
  /** Cancels the loop, drops listeners, disposes every GPU resource. */
  stop(): void;
};

export type BootOptions = {
  /** The copy panel, so the camera composes into what is left of the view. */
  panel: HTMLElement | null;
  ways: readonly Way[];
  labels: SceneLabels;
  /** The section's computed background. */
  background: string;
  /** prefers-reduced-motion: the camera cuts between stops, no glide, no parallax, no light. */
  reduced: boolean;
  /** `asset` from lib/base-path. */
  url: (path: string) => string;
  /** After every drawn frame, and once more when the loop parks. */
  onFrame: () => void;
};

export function boot(canvas: HTMLCanvasElement, host: HTMLElement, options: BootOptions): Promise<Handle>;
```

- [ ] **Step 1: `pointer.ts`**

The August module verbatim (`hitBox`, `rayThrough`, `hitOf`, `floorPoint`, `HIT_MARGIN`), from `git show claude/crossroads-depth-2026-09-02:web/src/components/crossroads/pointer.ts`.

- [ ] **Step 2: `scene.ts`**

Written in the August file's voice (`git show claude/crossroads-depth-2026-09-02:web/src/components/crossroads/scene.ts` is the model for the loop, the hand, `apply`, `marks`, `frame`, `invalidate`, `stop`). What is different, and why, goes in the head comment: the place is loaded, not built; the light is baked, so the only runtime light is the cursor's; the camera has two masters, the track and the row.

`boot()` in order:

1. Refuse unless `options.ways.length === SCENE_ORDER.length` and every `ways[i].key === SCENE_ORDER[i]` (the same loud failure the August boot had).
2. `WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })`, `setPixelRatio(Math.min(RETINA, window.devicePixelRatio || 1))`, `toneMapping = NoToneMapping`, `outputColorSpace = SRGBColorSpace`, `shadowMap.enabled = false`. The pixel ratio cap is 1.5 and the reason is measured in Task 6: the composer's depth of field is a full-resolution pass, and at a ratio of 2 on a 1440x900 view it is four times the pixels of ratio 1.
3. `scene.background = new Color(options.background)`; no fog (the floor's own alpha fades it to the background).
4. `scene.environment = reg.track(bakeStudio(renderer))`.
5. `await loadScene({ dpr: renderer.getPixelRatio(), labels, url, environment: scene.environment })`; add `loaded.floor` and every `way.group` to the scene.
6. `const camera = new PerspectiveCamera(50, 2, 0.1, 400)`; `const post = reg.track(createPost(renderer, scene, camera))`.
7. The cursor light: `PointLight(PALETTE.lightFill, 0, 9, 2)` at height 1.4, as August (`CURSOR_LIGHT = 10`, reach 60).
8. The flight: `buildFlight(POSES.junction, POSES.hub, SCENE_ORDER.map((k) => POSES[k]))`; the stand states `stateOf(POSES[key])` per way.
9. State: `current` (CameraState), `goal` (CameraState scratch), `from` (CameraState scratch), `tNow = 0`, `aimed = -1`, `gliding = false`, `startedAt`, `parallax`/`parallaxTarget`, `lightAt`/`lightTarget`, `light`/`lightOn`, `lastAdvance`, `raf`, `alive`, `drawn = 0`, `revealed = false`.

`goalNow(out)`: `aimed >= 0 ? copyState(stands[aimed], out) : flight.at(reduced ? nearestStop(tNow) : tNow, out)`. Reduced motion rounds t so the camera stands only at stops and cuts between them.

`advance(now)`:

```ts
const dt = lastAdvance === -Infinity ? 0 : Math.min(100, now - lastAdvance);
lastAdvance = now;
// The hand, as August: parallax and the light settle towards their targets.
goalNow(goal);
if (gliding) {
  const done = glideAt(from, goal, startedAt, now, current, reduced ? 0 : GLIDE_MS);
  if (done) gliding = false;
} else if (reduced) {
  copyState(goal, current);
} else {
  settleState(current, goal, dt, SCROLL_TAU_MS);
  if (stateSettled(current, goal)) copyState(goal, current);
}
apply(current, parallax[0], parallax[1]);
return gliding || !stateSettled(current, goal) || hand;
```

`apply(state, dx, dy)`: `offsetPosition(state.pos, state.look, dx, dy, eye)`, then `applyPose(camera, { ...state, pos: eye } as the scratch state, viewW, viewH, reserved)`, then `post.setFocus(eye.distanceTo(state.look), state.fstop)`, `cursor.position.copy(lightAt)`, `cursor.intensity = CURSOR_LIGHT * light`. No lights to move: the light is in the textures.

`aim(way)`: `if (way === aimed) return; aimed = way; copyState(current, from); startedAt = performance.now(); gliding = true; invalidate()`.
`scroll(t)`: `if (t === tNow) return; tNow = clamp; invalidate()`.
`reveal()`: `revealed = true; invalidate()` (the canvas's own opacity is the component's, through `data-revealed`).
`pointer(x, y)`: as August, normalised across the free region, ray through the pixel, floor hit for the light, hit test against `hitBox(way.box)` for the four ways; reduced motion returns the hit only, leaving parallax and light at rest.
`marks()`: `projectTo(camera, way.anchor, viewW, viewH, marked[i])` per way.
`frame(now)`: `raf = 0; if (!alive) return; const more = advance(now); post.render(); drawn += 1; onFrame(); if (more) invalidate(); else onFrame();` (the second call is the park notice: the component writes `data-parked`).
`resize()`: as August (`reserveOf`, `renderer.setSize(w, h, false)`, `post.setSize(w, h)`, `apply`, `invalidate`).
`stop()`: as August, plus `loaded.dispose()`.

Every allocation the loop touches per frame is made once at boot: `goal`, `from`, `eye`, the marks array, the ray, the floor hit vector.

- [ ] **Step 3: The framing suite**

`web/tests/unit/crossroads-framing.spec.ts`, no GPU. The August suite's `frame()` projection (reach and area in composed-frame units, the view offset included) against the manifest's bounds corners instead of built solids:

```ts
const CANVASES = [
  // The pinned stage at each viewport the live world mounts on, and how much
  // of it the copy panel is standing on. The container is 72rem, capped and
  // centred, with 2rem of padding, the panel 30rem bled 1.5rem left: the
  // panel's right edge is (viewport - 1152) / 2 + 32 - 24 + 480, which is
  // 488 at 1024, 632 at 1440 and 872 at 1920. Measured against the build by
  // tools/shoot.mjs, which prints the reserve.
  { name: '1024 wide', w: 1024, h: 736, reserve: 488 },
  { name: '1440 wide', w: 1440, h: 900, reserve: 632 },
  { name: '1920 wide', w: 1920, h: 1080, reserve: 872 },
] as const;
```

Tests:

1. `every stand holds its own way whole, at rest and at every hand extreme` (reach ≤ 1 for the way's eight bound corners; the map holds all four; the hub pose holds the first way in front, reach unasserted).
2. `no stand has a neighbour standing in its shot`: neighbours' area under 8% at rest and 12% at the hand extremes (recorded, not designed: the K's arms are 46.5 degrees apart where the fan's lanes were 30, so print the numbers and move the caps DOWN to what is measured plus a quarter, with the measurement in the comment).
3. `the flight never swings faster than this scene already does`: walk `flight.at` in steps of 0.002 across [0, 4], yaw change per step under 1.2 degrees per 1% of a band (measure first, set to the measurement plus a half), and the look point never within 2 units of the camera.
4. `every stand aims at the middle of its object`: `|aimY - (bounds.min.y + bounds.max.y) / 2| < 0.42`, as August.

Run `npm run test:unit`, expect green. If the framing fails, the numbers to move are in Blender (`K_LANES` `back`/`aimY`, the map camera) and the manifest is re-exported; do not paper over it in the test.

- [ ] **Step 4: Gates and commit**

Every gate (nothing on the page changes yet, so the browser suite is unchanged). Then:

```bash
git add web/src/components/crossroads/scene.ts web/src/components/crossroads/pointer.ts web/src/components/crossroads/types.ts web/tests/unit/crossroads-framing.spec.ts
git commit -m "The scene: the loaded place, a camera with two masters, the hand, and a loop that parks"
```

---
### Task 5: The section: one shell, two worlds, and the browser suite

**Files:**
- Modify: `web/src/components/crossroads/index.tsx` (becomes the shell)
- Create: `web/src/components/crossroads/stills-world.tsx`, `live-world.tsx`
- Modify: `web/src/components/crossroads/labels.ts`, `textures.ts` (head comments: they ship again, deferred with the scene)
- Modify: `web/src/app/globals.css`
- Modify: `web/tests/e2e/crossroads.spec.ts`
- Modify: `web/tools/shoot.mjs`

**Interfaces:**
- Consumes: `boot`, `Handle` from `./scene`; `scrollT`, `scrollWay`, `nearestStop`, `shownWays`, `BAND_SVH` from `./track`; `placeMarks`, `applyMarks`, `type Metrics` from `./marks`; `STILL`, `STILLS`, `STILL_ORDER` from `./stills`.
- Produces, on the DOM, for the tests and the tools: on `<section id="services">` `data-enhanced` (`true` unless the price board alone), `data-world` (`stills` or `live`, absent in the fallback), `data-pinned`, `data-revealed`, `data-stop` (`junction` or a way key: the hovered row's way, else the track's nearest stop), `data-reduced`; on the live world `canvas.crossroads-canvas[data-scene="kc-crossroads"]` with `data-ready` once booted, and on the section `data-parked` (`true` when the loop is parked) and `data-frames` (drawn frames); on the stage `data-hit`; the stills world keeps `.crossroads-stills > img.crossroads-still[data-key][data-on]`; the label layer `.crossroads-marks > .crossroads-mark[data-on] > .crossroads-mark-box[data-focus]`; `.crossroads-stop` times five when pinned.

- [ ] **Step 0: Pictures of the section as it is**

Before anything on the page changes, the "before" shots for the pull request. Build, serve, and run `node tools/shoot.mjs` and `node tools/shoot.mjs --dark`, then move the results: `mkdir -p shots/before && mv shots/1440x900-* shots/1024x736-* shots/1920x1080-* shots/dark-* shots/before/`. Keep them until Task 6.

- [ ] **Step 1: The shell**

`index.tsx` keeps everything about the section that is not the world: `ORDER`, `inOrder`, `ROOM`, `PIN`, `STRIP`, the mode decision, the panel, the rows, the hint, the marks layer, the stops, the reveal, the track reading. It loses the stills stack, `fit()`, `place()` and the stack transform, which move to the stills world, and `MARK_GAP`, which moved to `marks.ts`.

The mode:

```ts
type World = 'board' | 'stills' | 'live';

/**
 * Whether this visitor gets a world, and which.
 *
 * Room first, as before: under 64rem the panel would cover the picture, so
 * there is no picture. With room, a browser that can make a WebGL context
 * gets the live scene and one that cannot gets the stills, which need no
 * context at all. Probed on the client, and re-decided when ROOM flips.
 */
function worldFor(): World {
  if (typeof window === 'undefined' || !window.matchMedia(ROOM).matches) return 'board';
  try {
    const probe = document.createElement('canvas');
    return probe.getContext('webgl2') ?? probe.getContext('webgl') ? 'live' : 'stills';
  } catch {
    return 'stills';
  }
}
```

State: `world`, `pinned`, `phoneCrop`, `focus`, `hinted`, `scrollWayNow`, `revealed`, `reduced` (from `matchMedia('(prefers-reduced-motion: reduce)')`, watched like ROOM). `enhanced = world !== 'board'`. `aim = focus >= 0 ? focus : scrollWayNow`. `stop: StopKey = aim >= 0 ? ORDER[aim] : 'junction'` written as `data-stop`.

The track reading effect keeps today's shape (pinned only, passive scroll and resize, the one pixel of tolerance with its comment) and now computes both: `const t = scrollT(1 - top, band); setScrollWayNow(nearestStop(t) - 1); track.publish(t)`. Unpinned it publishes 0. `track` is created once with `useRef` and never changes identity:

```ts
/**
 * The track's position, published to the world without a re-render: the
 * scroll fires sixty times a second and a React state for it would render
 * the panel, the rows and the chips on every notch to move a camera.
 */
export type TrackRef = {
  /** The last published position. */
  t: number;
  publish(t: number): void;
  /** Returns the unsubscribe. The listener is called at once with the current position. */
  subscribe(listener: (t: number) => void): () => void;
};

function createTrack(): TrackRef {
  const listeners = new Set<(t: number) => void>();
  const track: TrackRef = {
    t: 0,
    publish(t) {
      if (t === track.t) return;
      track.t = t;
      for (const fn of listeners) fn(t);
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(track.t);
      return () => listeners.delete(fn);
    },
  };
  return track;
}
```

The metrics measure (stage box, panel box, chip widths, on mount, on fonts ready, on resize, pinned in the deps) stays in the shell and is handed to the worlds through a ref, because both worlds place chips against the same numbers.

The live world can fail to boot (assets missing, a context lost on the way in): it calls `onFail`, and the shell drops to `stills` with `console.warn('crossroads: the scene did not start', error)`, which is the August behaviour with a better fallback.

Both worlds get:

```ts
export type WorldProps = {
  lang: Lang;
  ordered: readonly Way[];
  focus: number;
  /** The track's position, published without a re-render. */
  track: TrackRef;
  reduced: boolean;
  revealed: boolean;
  pinned: boolean;
  metrics: RefObject<Metrics>;
  sectionRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  copyRef: RefObject<HTMLDivElement | null>;
  markRefs: RefObject<(HTMLDivElement | null)[]>;
  /** A pointer on an object or a chip lights that row, and nothing else. -1 clears it. */
  onHint(way: number): void;
  /** A click on an object opens its row. */
  onOpen(way: number): void;
  onFail(error: unknown): void;
};
```

The marks layer's chips keep their own `onMouseEnter`/`onMouseLeave`/`onClick` (through `onHint`/`onOpen`), so a chip works the same over either world.

- [ ] **Step 2: The stills world**

`stills-world.tsx`: today's stack (`crossroads-stills`, five `img.crossroads-still`), `fit()`, the measure's stack transform and the placement, unchanged in behaviour, with the placement now `applyMarks(placeMarks(candidates, metrics.current), markRefs.current)` where a candidate is `{ x: ox + anchor.x * s, y: oy + anchor.y * s, on: anchor.on }` from `STILLS[stop].marks`. The stop shown is `focus >= 0 ? ORDER[focus] : (nearestStop(track.t) - 1 >= 0 ? ORDER[...] : 'junction')`, read from `track` by subscription so a scroll without a re-render still switches the still. The world writes nothing to the section; the shell owns `data-stop`.

- [ ] **Step 3: The live world**

`live-world.tsx`:

- Renders `<canvas ref className="crossroads-canvas" aria-hidden="true" />` filling the stage (CSS below).
- One effect boots: `Promise.all([import('./scene'), import('./labels')])`, then `boot(canvas, stage, { panel: copyRef.current, ways: ordered, labels: LABELS[lang], background: groundOf(sectionRef.current), reduced, url: asset, onFrame })`. The labels and the scene are fetched together, deferred, for the reason the August component recorded (a static import would put both languages' mock copy into First Load JS for every phone). On resolve: `canvas.dataset.scene = 'kc-crossroads'`, `canvas.dataset.ready = 'true'`, `handleRef.current = handle`, `handle.scroll(track.t)`, `handle.aim(focus)`, and if `revealed` then `handle.reveal()`. On reject: `onFail(error)`. Cleanup: `cancelled = true; handle.stop()`.
- `onFrame`: `applyMarks(placeMarks(candidates, metrics.current), markRefs.current)` where the candidates are `handle.marks()` combined with `shownWays(track.t, focus)`: `{ x, y, on: front && shown[i] }`; then `section.dataset.parked = String(handle.parked())`, `section.dataset.frames = String(handle.frames())`. All DOM writes, no state.
- Effects: `handle.aim(focus)` on focus change; a `track.subscribe((t) => handle.scroll(t))`; `handle.reveal()` on `revealed`; the theme repaint from August (`MutationObserver` on `data-theme`, `prefers-color-scheme` change) calling `handle.setBackground(groundOf(section))` and writing `section.dataset.ground = colour`.
- The hand, as the August component: `pointermove` on the stage (over the panel: `pointerLeave` and `data-hit=false`; else `handle.pointer(x, y)`, `stage.dataset.hit`, and `onHint(way)` for a hit, `onHint(-1)` for a miss), `pointerleave`, `click` (a hit opens the row through `onOpen`). Hover on an object lights the row and leaves the camera alone (spec section 2: a chip and an object are the same weak input).

- [ ] **Step 4: CSS**

In `globals.css`'s crossroads block:

```css
/* The live world: one canvas the size of the stage, under the panel and the
   chips, faded up by the reveal like the stills. The scene composes into the
   part of the stage the panel is not standing on (see applyPose in
   camera.ts), so the canvas is full bleed and never sized to the free region. */
.crossroads-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  opacity: 0;
}

[data-revealed='true'] .crossroads-canvas {
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .crossroads-canvas {
    transition: opacity 700ms ease;
  }
}

/* An object under the pointer is a link, and the stage says so. */
[data-world='live'] .crossroads-stage[data-hit='true'] {
  cursor: pointer;
}

/* The chips are live at every stop in the live world, not only at the map:
   pointing at one lights its row and leaves the camera alone, so there is
   no control that moves out from under the pointer, which was the whole
   reason the stills limit them to the junction. */
[data-world='live'] .crossroads-mark-box {
  pointer-events: auto;
  cursor: pointer;
}
```

The stills world's rules (`.crossroads-stills`, `.crossroads-still`, `[data-still='junction'] .crossroads-mark-box`) stay, with `data-still` renamed to `data-stop` in the one selector. Update the block's head comment: the place is a live scene where the browser can run one, and the stills where it cannot.

- [ ] **Step 5: The browser suite**

`tests/e2e/crossroads.spec.ts`, restructured. Helpers: `withoutWebGL(page)` (the August route: `HTMLCanvasElement.prototype.getContext` returns null for WebGL types, installed with `addInitScript`), `arrive(page)` as today plus, for the live world, `await expect(page.locator(canvas)).toHaveAttribute('data-ready', 'true', { timeout: 15000 })` and a wait for `data-parked="true"` (`expect.poll`, 15 s: headless Chromium draws through SwiftShader and a frame can cost a third of a second there). `settled(page)` waits for `data-parked="true"`.

Groups:

1. **however the visitor arrives**: live (canvas present, `data-world=live`, `data-stop=junction`, four chips on), stills without WebGL (today's "with stills" test under `withoutWebGL`), reduced motion (live world mounts, `data-reduced=true`), phone, narrow laptop, JavaScript off: all as today.
2. **the rows are links, the fallback is not dimmed**: as today.
3. **the view follows the pointer, and the keyboard is the same input** (live): hover a row, `data-stop` changes, the row's `data-focus`, its chip's `data-focus`, then `settled`; sweep; leave; keyboard. The same test once more under `withoutWebGL` against the stills (today's test body).
4. **the chips and the objects are live**: chip hover lights the row and `data-stop` stays; chip click navigates. Object hover: put the pointer at the chip's anchor and walk down in 10px steps until `data-hit=true` (the August approach), expect the row's `data-focus`, `data-stop` unchanged; click opens the row.
5. **no console errors**: hover all four, leave, scroll through the track, wait for parked, expect none.
6. **every object is named at itself and no two names collide**: the `labels()` evaluation as today, at the three sizes, in both worlds (a loop over `[false, true]` for `withoutWebGL`), at the map and at each row's hover after `settled`.
7. **the name is read once**, **hidden until looked at** (the canvas's opacity is 0 before `arrive`), **under the pin height**: as today.
8. **pinned, the track walks the four routes** (live): as today, with `data-stop` and, at each stop, `settled` and then the section's `data-frames` recorded; then **a scroll that ends past a stop settles back**: as today.
9. **a still page costs no frames, and a scroll gets them**: at a stop, after `settled`, read `data-frames`, wait 800 ms, expect it unchanged; scroll half a band, expect it to grow within 3 s and `data-parked` to return to true.
10. **both themes paint the same ink**: `emulateMedia({ colorScheme: 'dark' })`, arrive, expect `section.dataset.ground` to equal `getComputedStyle(section).backgroundColor`; then toggle the site's theme control if there is one on the page (`[data-theme]` on `<html>`, set through `page.evaluate`) and expect it to follow.
11. **de and en name their own service**: as today, live, plus the English screens: no assertion on pixels, only that `LABELS.en` was drawn, which the unit suite already holds.

Run `npm run build` then `npm run test:e2e -- --workers=1`. Fix what fails in the component, not in the test, unless the test's expectation was the stills' and the spec says otherwise.

- [ ] **Step 6: `tools/shoot.mjs`**

Wait on `canvas[data-ready="true"]` or the still when `SHOOT_WORLD=stills` (installs the no-WebGL init script), and on `data-parked="true"` before each screenshot instead of the fixed 800 ms. Print `world` in the per-viewport line. Keep the label report.

- [ ] **Step 7: The bundle gate measures the scene again**

`scripts/check-bundle.mjs` today refuses any chunk carrying three.js. Rewrite it on the August gate's model (`git show claude/crossroads-depth-2026-09-02:web/scripts/check-bundle.mjs`), keeping today's eager measurement and stills cap, with three budgets and the reasons for each marker in the comments:

- **eager**: every script `out/de/index.html` references, gzipped, against `scripts/bundle-baseline.json` plus 2 kB slack. And none of them may contain `THREE_MARKER`: three.js in an eager chunk is a First Load JS leak whatever the total says (spec section 7).
- **deferred**: every chunk under `out/_next/static/chunks` that is not eager and contains `THREE_MARKER = 'BufferGeometry'` (three itself), or `OWN_MARKER = 'lightScale'` (a property name from the generated manifest, imported by nothing but the scene, which survives minification), or any of `ADDON_MARKERS = ['LuminosityHighPassShader', 'BokehShader', 'KHR_draco_mesh_compression', 'decodeGltfBuffer']` (the bloom's shader name, the depth of field's, a string GLTFLoader carries, a method name the meshopt decoder exposes). Cap `DEFERRED_CAP = 260 * 1024`. With `BASE.expectSceneChunk` true, refuse if no chunk matched `THREE_MARKER` or none matched `OWN_MARKER`: a gate that measures nothing is worse than none, which the August file records at length.
- **assets**: the strings matching `/'\/crossroads\/scene\/[^']+'/g` in `src/components/crossroads/scene-manifest.ts`; every one must exist under `public/`; the ones without `@2x` are the 1x set and their bytes must be under `ASSETS_CAP = 1.5 * 1024 * 1024`. Plus today's `STILLS_CAP` over `public/crossroads/*.webp` and the two posters, re-measured after Task 2 (move the number with the measurement in the comment).

`bundle-baseline.json` gains `"expectSceneChunk": true` and keeps `eagerGzipBytes` unless the eager chunk moved (it should not: the shell is the same size as today's component, give or take the mode probe; if it grew past the slack, say by how much and why in the commit).

Print the three lines (`eager`, `deferred ... of which ... own ... addons`, `assets ... over N files (cap ...)`, `stills ...`).

- [ ] **Step 8: Gates and commit**

Every gate green, the bundle gate included. Then:

```bash
git add web/src/components/crossroads web/src/app/globals.css web/tests/e2e/crossroads.spec.ts web/tools/shoot.mjs web/scripts/check-bundle.mjs web/scripts/bundle-baseline.json
git commit -m "The section runs the live scene where the browser can, and the stills where it cannot, under a budget that measures the scene again"
```

---
### Task 6: The flight timed on the GPU, the pictures, the pull request

**Files:**
- Create: `web/tools/fps.mjs`
- Create: `web/tests/e2e/crossroads-flight.spec.ts`
- Modify: `web/playwright.e2e.config.ts` (the opt-in `gpu` project)
- Modify: `README.md` (the recipe, the gates, the GPU test)
- Modify: `docs/superpowers/specs/2026-09-02-crossroads-realtime-k-design.md` section 7 if a budget moved (say why in the commit)
- Create: `docs/pr/2026-09-02-crossroads-realtime-k/*.jpg`

- [ ] **Step 1: The timing test**

`playwright.e2e.config.ts`: `projects` becomes `[{ name: 'chromium', testIgnore: /crossroads-flight/ }, ...(process.env.CROSSROADS_GPU ? [{ name: 'gpu', testMatch: /crossroads-flight/, use: { ...devices['Desktop Chrome'], headless: false, launchOptions: { args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] } } }] : [])]`. The comment says why: headless Chromium draws WebGL through SwiftShader, which measures the CPU and not the machine's graphics, so the timing test runs headed on the display, on this laptop, opted in by `CROSSROADS_GPU=1`, and never in CI.

`tests/e2e/crossroads-flight.spec.ts`:

1. 1440x900, `/de/`, arrive, wait for `data-ready` and `data-parked`.
2. Record: `page.evaluate` installs a `requestAnimationFrame` sampler collecting `performance.now()` deltas into `window.__frames`, then scrolls from the section's top to stop 4 in 150 equal steps, one per animation frame (`window.scrollTo` with `behavior: 'instant'`), then waits two more seconds for the camera to settle, then returns the deltas taken while the scene reported frames growing.
3. Assert: mean under 17.5 ms and the 95th percentile under 25 ms over the flight (60 Hz is 16.7; the slack is one dropped frame in twenty). Print mean, p95, max and the scene's frame count.
4. A second `test.describe` at `deviceScaleFactor: 2` prints the same numbers and asserts mean under 25 ms: the spec's gate is 1440x900 at 1x, and the 2x number is recorded so the pixel ratio cap in `scene.ts` has a measurement behind it. If 2x fails, lower `RETINA`'s companion cap in `boot()` to 1.25 and record both numbers in the comment.

Run: `CROSSROADS_GPU=1 npm run test:e2e -- --project=gpu` on this machine, with the display up. Paste the printed numbers into the commit message.

`tools/fps.mjs` is the same measurement as a script (headed chromium, prints the numbers, no assertion), for looking at a change by hand. Document it in the README next to `shoot.mjs`.

- [ ] **Step 2: Pictures**

Build and serve. `node tools/shoot.mjs` and `--dark` for the live world at the three viewports (they land in `shots/`). Then:

```bash
node tools/blender/pr-pictures.cjs shots/before/1440x900 shots/1440x900 docs/pr/2026-09-02-crossroads-realtime-k
```

for the five before/after pairs at 1440x900, plus single frames: `junction-1024x736`, `junction-1920x1080`, `junction-dark-theme`, two mid-flight frames (scroll to t = 0.5 and t = 1.5 by `window.scrollTo`, screenshot: the hub pass and the stem), and the stills fallback at 1440x900 (`SHOOT_WORLD=stills`). Convert everything to JPEG quality 88 with sharp (`pr-pictures.cjs` writes PNG; add `--jpeg` to it or convert after), as the stills pull request did (`git show --stat 468c32f`). Look at every picture before committing it.

- [ ] **Step 3: The record**

README: the recipe (capture, render review, bake, emit-scene, stills, emit-stills, viewer), the GPU test, `fps.mjs`. The head comments of `labels.ts` and `textures.ts` say they ship again, deferred with the scene. Spec section 7 if any number moved.

- [ ] **Step 4: Gates and commit**

Every gate, plus the GPU project. Then:

```bash
git add web/tools/fps.mjs web/tests/e2e/crossroads-flight.spec.ts web/playwright.e2e.config.ts README.md docs/pr/2026-09-02-crossroads-realtime-k docs/superpowers/specs
git commit -m "The flight measured on the laptop it has to run on, and pictures for the pull request"
```

- [ ] **Step 5: Hand over**

Not a pull request yet. Invoke `superpowers:finishing-a-development-branch` and present the menu to the owner. The pull request's base is `claude/crossroads-stills-2026-09-02` while #22 is open and unmerged, else `main`: ask which. The body carries the pictures, the three budget lines the bundle gate printed, the timing numbers, and the two open questions from the spec (the angle brackets on the floor, the 1536x864 laptop under the pin floor).

---

## What the reviewer checks at the end

The whole-branch review on the most capable model, after Task 6, against the spec:

- Section 2: the map, the flight through the hub, the hand (parallax, light, chip and object hover, click), depth of field and bloom, everything else as today.
- Section 3: the K numbers, in the manifest and in the unit test.
- Section 4: bodies with lightmaps and an environment, the floor with the bake, screens per language, emitters over the threshold, one runtime light.
- Section 5: deferred three.js, meshopt glTFs, WebP at two sizes, six poses, the glide, the parked loop, the stills fallback.
- Section 6: `crossroads.py` reads the palette, exports the scene; `emit-scene.mjs` writes the manifest; the stills come from the same file.
- Section 7: the four budgets, each with its measurement in a comment.
- Section 8: every listed unit and browser test exists and is green.
- The hard rules: English, no long dash, no attribution, measured numbers in comments.
