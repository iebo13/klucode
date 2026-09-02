"""
The crossroads, built and rendered in Blender with Cycles.

The homepage's services section shows five stills of this scene, junction and
four ways, plus a poster for the fallback. This script builds the same lanes,
objects and shots the live three.js scene used to draw, from the screen
textures `capture-textures.mjs` writes, and renders each shot as a transparent
PNG with the label anchors it was rendered with. `emit-stills.mjs` turns the
renders into the WebPs and the generated `stills.ts` the page reads.

It began as the 2 September 2026 spike that answered whether the composition
reads as professional once it is lit and rendered properly. It did.

The floor plan defaults to the K, the mark's own graph: a stem through the
hub and two arms, four terminal nodes, drawn into the floor material's
emission rather than as separate glow planes, lit by one static rig so the
map and every stand share the same baked light. `--layout fan` keeps the
earlier five-lane spread reachable for comparison. The palette comes from
`src/components/crossroads/palette.ts`, read by the pattern
`check-scene-palette.mjs` already holds it to, so the two files cannot drift.
For the K layout the script also writes `layout.json` beside the renders: the
lanes, the poses and the anchors in three.js coordinates, which Task 2's bake
and the runtime both read.

Coordinates: the page's scene is three.js, y up, the camera looking down -z.
Blender is z up. Every three.js point (x, y, z) becomes the Blender point
(x, -z, y); that mapping is a rotation, so an angle about three's y axis is
the same angle about Blender's z axis.

Run headless:
  blender -b -P crossroads.py -- --out renders --shots junction,website --scale 0.5 --samples 32
"""

import json
import math
import os
import re
import sys

import bmesh
import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

# ---------------------------------------------------------------- arguments

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def arg(name, default):
    return argv[argv.index(name) + 1] if name in argv else default


HERE = os.path.dirname(os.path.abspath(__file__))
OUT = arg("--out", os.path.join(HERE, "renders"))
# `--layout k` lays the four routes out as the mark's own graph: a stem
# through the hub and two arms, four terminal nodes, the K itself, and is the
# default now that the section's floor plan is the mark. `--layout fan` keeps
# the earlier five-lane spread reachable for comparison. `--k-rotate` turns
# the K on the floor (radians, 0 puts the stem's top node straight away from
# the camera). `--cam x,y,z` and `--look x,y,z` (three.js coordinates)
# override the junction shot, which a K needs raised so the letter reads.
LAYOUT = arg("--layout", "k")
K_ROTATE = float(arg("--k-rotate", "0.3"))
CAM_OVERRIDE = arg("--cam", "")
LOOK_OVERRIDE = arg("--look", "")
if arg("--frame", "free") == "poster":
    DEFAULT_SHOTS = "junction"
elif LAYOUT == "k":
    DEFAULT_SHOTS = "junction,hub,website,app,capacity,care"
else:
    DEFAULT_SHOTS = "junction,website,app,capacity,care"
SHOTS_WANTED = arg("--shots", DEFAULT_SHOTS).split(",")
SCALE = float(arg("--scale", "1"))
SAMPLES = int(arg("--samples", "128"))
DOF = arg("--dof", "1") == "1"
LINES = arg("--lines", "0") == "1"
TEX = arg("--textures", os.path.join(HERE, "textures"))
KEY_W = float(arg("--key", "1400"))
JUNCTION_KEY_W = float(arg("--junction-key", "6000"))
FILL_W = float(arg("--fill", "450"))
RIM_W = float(arg("--rim", "500"))
SCREEN = float(arg("--screen", "1.0"))
FLOOR_ROUGH = float(arg("--floor-rough", "0.45"))
GLOW = float(arg("--glow", "0.3"))
VIEW = arg("--view", "Standard")
PREVIEW = arg("--preview", "0") == "1"
LANE_FSTOP = float(arg("--fstop", "0.8"))
SPREAD = float(arg("--spread", "80"))
KEY_COLOR = arg("--key-color", "fff1dc")
MIST_DEPTH = float(arg("--mist", "20"))
# `--bake <dir>` takes the scene rather than rendering it: each way is joined
# into one body, unwrapped and baked to a lightmap, the floor is baked whole,
# all of it is exported as glTF, and `scene.json` beside them carries the same
# layout report `--out` writes as layout.json. `tools/blender/emit-scene.mjs`
# turns that directory into the site's assets and its generated manifest. The
# two modes cannot share a run: the bake applies every modifier and clears
# every parent, which is not the scene the shots were composed against.
BAKE = arg("--bake", "")
BAKE_SAMPLES = int(arg("--bake-samples", "128"))
# A lightmap is one square per way, shipped at 2048 for retina and 1024 for
# everyone else: measured on this bake, the four 1x files are 94.6 kB of WebP
# together and the four 2x files 208.6 kB, against a 1536 kB budget for the
# whole scene, so a way's light is the cheap part of it. The floor is one
# square for the whole 100 by 100 plane, and 4096 is what the letter needs: a
# stroke 2.1 units wide crosses 2.1 / 100 * 4096 = 86 texels there, against 43
# in the 2048 mask the render draws from, so the baked edge is no softer than
# the rendered one.
LIGHTMAP_PX = 2048
FLOOR_PX = 4096

os.makedirs(OUT, exist_ok=True)

# The frame. `free` is the still the page ships: the 808x998 region beside the
# copy panel at the 1440x900 viewport, with the principal point in its middle.
# `full` is the whole 1440x998 stage with the panel's 632 px reserve, which is
# what the spike rendered. `poster` is the junction in a wide frame for the
# phone and fallback picture.
FRAME = arg("--frame", "free")
if FRAME == "full":
    W, H, RESERVE = 1440, 998, 632
elif FRAME == "poster":
    W, H, RESERVE = 1600, 1000, 0
else:
    W, H, RESERVE = 808, 998, 0
FREE = W - RESERVE
MASK = arg("--mask", "0" if FRAME == "poster" else "1") == "1"

# ------------------------------------------------------------------ palette

PALETTE_TS = os.path.normpath(os.path.join(HERE, "..", "..", "src", "components", "crossroads", "palette.ts"))


def read_palette(path):
    """
    The scene's colours, read from the one file that records them.

    palette.ts is what scripts/check-scene-palette.mjs holds to the brand
    tokens, and the pattern below is that script's DECL: a line that does not
    read `name: 0xRRGGBB, // token.path` is not a colour there either. This
    script used to carry a second copy of the sixteen values, which the gate
    could not see and which drifted the day one of them moved. Sixteen is the
    gate's EXPECTED, and refusing on any other count is the same tripwire.

    One ruling against the spec's letter, recorded here because this is where
    it bites: section 6 asks for a JSON emitted from palette.ts, and this
    reads palette.ts itself with the gate's own pattern instead, which is one
    file fewer to keep in step and the same guarantee.
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


def lin(hexstr):
    """sRGB hex to linear RGBA, which is what Blender's colour sockets take."""

    def channel(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (int(hexstr[i : i + 2], 16) for i in (0, 2, 4))
    return (channel(r), channel(g), channel(b), 1.0)


# ------------------------------------------------------------------- scene

scene = bpy.context.scene
for ob in list(scene.objects):
    bpy.data.objects.remove(ob, do_unlink=True)


def link(ob):
    scene.collection.objects.link(ob)
    return ob


def P(x, y, z):
    """three.js point to Blender point."""
    return Vector((x, -z, y))


MATS = {}


def material(name, hexstr, rough, metal=0.0):
    key = (name, hexstr, rough, metal)
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = lin(hexstr)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    MATS[key] = m
    return m


def emission(name, hexstr, strength, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    if image is not None:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Cubic"
        links.new(tex.outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = lin(hexstr)
    links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m


def glow_plane(name, hexstr, alpha, strength=1.5):
    """An unlit, part-transparent plane: the lane strips and the hub."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    mix = nodes.new("ShaderNodeMixShader")
    trans = nodes.new("ShaderNodeBsdfTransparent")
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = lin(hexstr)
    em.inputs["Strength"].default_value = strength
    mix.inputs["Fac"].default_value = alpha
    links.new(trans.outputs["BSDF"], mix.inputs[1])
    links.new(em.outputs["Emission"], mix.inputs[2])
    links.new(mix.outputs["Shader"], out.inputs["Surface"])
    m.blend_method = "BLEND"
    return m


def finish(name, bm, mat, parent, pos, rot_z=0.0, scale=None, smooth=False, bevel=0.0):
    if smooth:
        for f in bm.faces:
            f.smooth = True
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    ob.location = P(*pos)
    ob.rotation_euler.z = rot_z
    if scale is not None:
        ob.scale = scale
    ob.parent = parent
    if bevel > 0:
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = "ANGLE"
        mod.harden_normals = True
    return link(ob)


def box(name, w, h, d, r, parent, pos, mat, rot_z=0.0):
    """A three.js box of (width, height, depth), bevelled by r."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h))
    return finish(name, bm, mat, parent, pos, rot_z, bevel=r)


def cylinder(name, r, h, n, parent, pos, mat):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=r, radius2=r, depth=h)
    return finish(name, bm, mat, parent, pos, smooth=False)


def sphere(name, r, parent, pos, mat, squash=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=r)
    scale = None if squash is None else (squash[0], squash[2], squash[1])
    return finish(name, bm, mat, parent, pos, scale=scale, smooth=True)


def screen(name, w, h, parent, pos, mat, kind=None):
    """
    A plane facing the viewer (three +z, Blender -y), textured upright.

    `kind` tags the object `screen:<kind>` (landing, dashboard, work) so
    Task 2's bake and export, and the runtime, can swap its material without
    parsing the name. The office's off screen passes no kind and stays a
    plain body, like everything else this tag is not asked for.
    """
    me = bpy.data.meshes.new(name)
    v0 = (-w / 2, 0, -h / 2)
    v1 = (-w / 2, 0, h / 2)
    v2 = (w / 2, 0, h / 2)
    v3 = (w / 2, 0, -h / 2)
    me.from_pydata([v0, v3, v2, v1], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new()
    for loop, co in zip(me.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[loop.index].uv = co
    me.update()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    ob.location = P(*pos)
    ob.parent = parent
    if kind is not None:
        ob["kc"] = f"screen:{kind}"
    return link(ob)


def empty(name, parent=None, pos=(0, 0, 0), rot_z=0.0):
    ob = bpy.data.objects.new(name, None)
    ob.location = P(*pos)
    ob.rotation_euler.z = rot_z
    ob.parent = parent
    return link(ob)


# ------------------------------------------------------------- the lanes

FAN_LANES = [
    {"key": "website", "angle": 0.8, "dist": 17, "back": 9.1, "aimY": 2.33},
    {"key": "app", "angle": 0.28, "dist": 17, "back": 11.4, "aimY": 2.6},
    {"key": "capacity", "angle": -0.28, "dist": 17, "back": 13.2, "aimY": 0.98},
    {"key": "care", "angle": -0.8, "dist": 17, "back": 11.2, "aimY": 2.78},
]
ARM = math.atan2(19, 18)
K_LANES = [
    {"key": "website", "angle": K_ROTATE, "dist": 18, "back": 9.1, "aimY": 2.33},
    {"key": "app", "angle": K_ROTATE - ARM, "dist": 26.2, "back": 11.4, "aimY": 2.6},
    {"key": "capacity", "angle": K_ROTATE - (math.pi - ARM), "dist": 26.2, "back": 13.2, "aimY": 0.98},
    {"key": "care", "angle": K_ROTATE + math.pi, "dist": 18, "back": 11.2, "aimY": 2.78},
]
LANES = K_LANES if LAYOUT == "k" else FAN_LANES

images = {
    "landing": bpy.data.images.load(os.path.join(TEX, "canvas-1280x800.png")),
    "dashboard": bpy.data.images.load(os.path.join(TEX, "canvas-1280x720.png")),
    "work": bpy.data.images.load(os.path.join(TEX, "canvas-512x320.png")),
}


def build_website(lane, z):
    frame = material("frame", PALETTE["metal"], 0.5, 0.2)
    box("web.frame", 5.4, 3.5, 0.22, 0.05, lane, (0, 2.9, z), frame)
    box("web.neck", 0.3, 1.1, 0.3, 0.04, lane, (0, 0.6, z), frame)
    box("web.base", 2.1, 0.14, 1.2, 0.04, lane, (0, 0.06, z), frame)
    screen("web.screen", 5, 3.13, lane, (0, 2.9, z + 0.13), emission("landing", None, SCREEN, images["landing"]), kind="landing")


def build_app(lane, z):
    frame = material("frame", PALETTE["metal"], 0.5, 0.2)
    box("app.frame", 6, 3.6, 0.22, 0.05, lane, (0, 3.4, z), frame)
    box("app.neck", 0.32, 1.5, 0.32, 0.04, lane, (0, 0.85, z), frame)
    box("app.base", 2.3, 0.14, 1.2, 0.04, lane, (0, 0.06, z), frame)
    screen("app.screen", 5.6, 3.15, lane, (0, 3.4, z + 0.13), emission("dashboard", None, SCREEN, images["dashboard"]), kind="dashboard")
    db = material("db", PALETTE["metalMid"], 0.55, 0.3)
    cylinder("app.db", 0.95, 1.4, 48, lane, (-2.5, 0.72, z + 0.9), db)
    cylinder("app.db.ring1", 0.97, 0.1, 48, lane, (-2.5, 1.45, z + 0.9), db)
    cylinder("app.db.ring2", 0.97, 0.1, 48, lane, (-2.5, 1.05, z + 0.9), db)
    server = material("server", PALETTE["metalDark"], 0.45, 0.4)
    box("app.server", 1.3, 2.3, 1.1, 0.05, lane, (2.5, 1.15, z + 0.9), server)
    for k in range(5):
        box(f"app.slat{k}", 1.04, 0.1, 0.06, 0.015, lane, (2.5, 0.5 + k * 0.4, z + 1.47), server)
    wire = material("wire", PALETTE["accent"], 0.4)
    box("app.wire1", 1.6, 0.07, 0.07, 0.0, lane, (-1.6, 1.5, z + 0.6), wire)
    box("app.wire2", 1.6, 0.07, 0.07, 0.0, lane, (1.6, 1.7, z + 0.55), wire)


def build_capacity(lane, z):
    desks = material("desk", PALETTE["wood"], 0.76)
    metal = material("office.metal", PALETTE["metalMid"], 0.45, 0.35)
    off = material("screen.off", PALETTE["metalDark"], 0.35, 0.2)
    work = emission("work", None, SCREEN, images["work"])
    legs = [(-1.0, 0.5), (1.0, 0.5), (-1.0, -0.5), (1.0, -0.5)]
    DESKS = [(-2.8, -0.55), (0, 0.75), (2.8, -0.55)]
    for k, (x, ddz) in enumerate(DESKS):
        dz = z + ddz
        free = k == 1
        box(f"desk{k}", 2.3, 0.14, 1.35, 0.04, lane, (x, 0.78, dz), desks)
        for j, (lx, lz) in enumerate(legs):
            box(f"desk{k}.leg{j}", 0.12, 0.78, 0.12, 0.03, lane, (x + lx, 0.39, dz + lz), desks)
        box(f"desk{k}.monitor", 1.35, 0.85, 0.07, 0.02, lane, (x, 1.42, dz - 0.28), metal)
        box(f"desk{k}.stand", 0.12, 0.28, 0.12, 0.03, lane, (x, 0.99, dz - 0.28), metal)
        if free:
            screen(f"desk{k}.screen", 1.24, 0.76, lane, (x, 1.42, dz - 0.235), off)
        else:
            screen(f"desk{k}.screen", 1.24, 0.76, lane, (x, 1.42, dz - 0.235), work, kind="work")
        chair = empty(f"chair{k}", lane, (x, 0, dz + (1.5 if free else 1.05)), 0.4 if free else 0.0)
        box(f"chair{k}.seat", 0.6, 0.1, 0.6, 0.03, chair, (0, 0.52, 0), metal)
        box(f"chair{k}.back", 0.6, 0.66, 0.09, 0.03, chair, (0, 0.86, 0.28), metal)
        cylinder(f"chair{k}.post", 0.07, 0.44, 16, chair, (0, 0.28, 0), metal)
        cylinder(f"chair{k}.foot", 0.34, 0.06, 24, chair, (0, 0.05, 0), metal)
        if not free:
            cylinder(f"desk{k}.mug", 0.065, 0.12, 16, lane, (x + 0.72, 0.91, dz + 0.3), metal)
    box("partition", 7.6, 1.5, 0.16, 0.05, lane, (0, 0.75, z - 2.1), desks)


def build_care(lane, z):
    rack = material("rack", PALETTE["metalDark"], 0.45, 0.4)
    box("rack", 1.9, 3, 1.2, 0.05, lane, (0, 1.5, z), rack)
    bays = material("bay", PALETTE["floor"], 0.8, 0.1)
    dark = material("lamp.dark", PALETTE["metalDark"], 0.5, 0.3)
    lit = emission("lamp.lit", PALETTE["status"], 12.0)
    for k in range(5):
        y = 0.45 + k * 0.5
        box(f"bay{k}", 1.55, 0.36, 0.1, 0.015, lane, (0, y, z + 0.62), bays)
        led1 = sphere(f"bay{k}.led1", 0.035, lane, (0.55, y + 0.08, z + 0.68), lit)
        led1["kc"] = "emitter"
        led2 = sphere(f"bay{k}.led2", 0.035, lane, (0.64, y + 0.08, z + 0.68), lit)
        led2["kc"] = "emitter"
        sphere(f"bay{k}.led0", 0.035, lane, (0.46, y + 0.08, z + 0.68), dark)
    cloud = material("cloud", PALETTE["cloud"], 0.95)
    for i, (px, py, pz, r) in enumerate([(0, 4.85, 0, 1.25), (-1, 4.7, 0.15, 0.9), (1, 4.75, -0.15, 0.95), (0.05, 5.15, 0, 0.72)]):
        sphere(f"cloud{i}", r, lane, (px, py, z + pz), cloud, squash=(1, 0.55, 0.85))
    rung = material("rung", PALETTE["accent"], 0.4)
    for k in range(5):
        w = 0.22 + k * 0.11
        box(f"rung{k}", w, 0.07, w, 0.02, lane, (0, 3.22 + k * 0.24, z), rung)
    status_lamp = sphere("status.lamp", 0.1, lane, (0.7, 2.7, z + 0.66), emission("status", PALETTE["status"], 10.0))
    status_lamp["kc"] = "emitter"


BUILDERS = {"website": build_website, "app": build_app, "capacity": build_capacity, "care": build_care}

# The K's floor material: the strokes, the hub and the node discs are painted
# into a mask and fed to the floor's emission strength, so the Cycles render,
# Task 2's floor bake and the runtime all draw the same picture instead of
# three separate copies of it. 2048 is high enough that a stroke 2.1 units
# wide on a 100 wide floor crosses about 43 texels, softened one texel at
# each edge so the bake does not alias it. The mark's hub is its largest
# element (radius 6 against strokes of 4.6 and nodes of 4.2 in the identity's
# own drawing), so on strokes 2.1 units wide the hub disc scales to 2.7 and
# each node disc to 1.9, and HUB_GAIN lifts the hub over both in brightness.
FLOOR_SIZE = 100
MASK_PX = 2048
STROKE_W = 2.1
HUB_R = 2.7
NODE_R = 1.9
HUB_GAIN = 1.4
# Where the floor's texture fades from full alpha to nothing, a radius from
# the hub, so the far floor sits on either theme's ink. This script fades the
# render through the compositor's own mist instead (see the render loop
# below); this pair is only carried into layout.json for Task 2's bake and
# the runtime, which both apply it to the floor texture itself.
FLOOR_FADE = (34.0, 48.0)


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
    # bmesh.ops.create_grid's `size` is a half extent in Blender 4.5: measured
    # on this plane, ob.dimensions came back Vector((100.0, 100.0, 0.0)), so
    # FLOOR_SIZE / 2 below makes the 100 by 100 floor its name promises.
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=FLOOR_SIZE / 2)
    uv_layer = bm.loops.layers.uv.new("UVMap")
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            loop[uv_layer].uv = (co.x / FLOOR_SIZE + 0.5, co.y / FLOOR_SIZE + 0.5)
    ob = finish("floor", bm, mat, None, (0, 0, 0))
    ob["kc"] = "floor"
    return ob


if LAYOUT == "k":
    floor_ob = floor_k(mask_image("k-mask", k_mask(MASK_PX, FLOOR_SIZE, LANES, STROKE_W, HUB_R, NODE_R, HUB_GAIN)))
else:
    # The floor, the hub and the strips, exactly as before the K existed.
    floor_mat = material("floor", PALETTE["floor"], FLOOR_ROUGH, 0.0)
    floor_mat.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.6
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=150)
    finish("floor", bm, floor_mat, None, (0, 0, 0))
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.7)
    finish("hub", bm, glow_plane("hub", PALETTE["accent"], 0.16), None, (0, 0.012, 0), rot_z=math.pi / 4)

lane_objects = {}
for geom in LANES:
    lane = empty(f"lane.{geom['key']}", None, (0, 0, 0), geom["angle"])
    if LAYOUT != "k":
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        for v in bm.verts:
            v.co = Vector((v.co.x * 2.1, v.co.y * geom["dist"], 0))
        finish(f"strip.{geom['key']}", bm, glow_plane("strip", PALETTE["accent"], 0.09), lane, (0, 0.014, -geom["dist"] / 2))
    before = set(scene.objects)
    BUILDERS[geom["key"]](lane, -geom["dist"])
    lane_objects[geom["key"]] = [ob for ob in scene.objects if ob not in before and ob.type == "MESH"]

bpy.context.view_layer.update()


def lane_box(key):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for ob in lane_objects[key]:
        for corner in ob.bound_box:
            p = ob.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
    return lo, hi


MARK_LIFT = 0.55
anchors = {}
for geom in LANES:
    lo, hi = lane_box(geom["key"])
    anchors[geom["key"]] = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, hi.z + MARK_LIFT))

# ----------------------------------------------------------------- lights

world = bpy.data.worlds.new("world")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = lin(PALETTE["lightAmbient"])
bg.inputs["Strength"].default_value = 0.35


def light(name, kind, hexstr, power):
    data = bpy.data.lights.new(name, kind)
    data.energy = power
    data.color = lin(hexstr)[:3]
    ob = bpy.data.objects.new(name, data)
    return link(ob)


def aim(ob, target):
    d = target - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


if LAYOUT == "fan":
    key = light("key", "AREA", KEY_COLOR, KEY_W)
    key.data.shape = "RECTANGLE"
    key.data.size = 6
    key.data.size_y = 4
    fill = light("fill", "POINT", PALETTE["lightFill"], FILL_W)
    fill.data.shadow_soft_size = 1.5
    rim = light("rim", "AREA", PALETTE["lightFill"], RIM_W)
    rim.data.size = 8
    # The lights light; they are not seen in the floor. Their mirror images were
    # warm blobs on the damp floor that read as spills, not as light.
    for lamp in (key, fill, rim):
        lamp.visible_glossy = False
        lamp.visible_camera = False


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


# ----------------------------------------------------------------- camera

cam_data = bpy.data.cameras.new("cam")
cam = link(bpy.data.objects.new("cam", cam_data))
scene.camera = cam
cam_data.sensor_fit = "VERTICAL"
cam_data.clip_end = 400


def fov_for(fit_h, fit_v, aspect):
    return 2 * max(fit_v, math.degrees(math.atan(math.tan(math.radians(fit_h)) / aspect)))


CAM_Y = 2.4
WIDE_FIT_H, WIDE_FIT_V = 32.8, 15.2
LANE_FIT_H, LANE_FIT_V = 24, 18


def lane_target(angle, dist, aim_y):
    c, s = math.cos(angle), math.sin(angle)
    x, z = 0, -dist
    return Vector((x * c + z * s, aim_y, -x * s + z * c))


def stand_off(target, back):
    flat = Vector((target.x, 0, target.z))
    length = flat.length
    p = flat / length * (length - back)
    return Vector((p.x, CAM_Y, p.z))


def vec_arg(text, default):
    return Vector(tuple(float(v) for v in text.split(","))) if text else default


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
for geom in LANES:
    target = lane_target(geom["angle"], geom["dist"], geom["aimY"])
    SHOTS[geom["key"]] = {"pos": stand_off(target, geom["back"]), "look": target, "fit": (LANE_FIT_H, LANE_FIT_V), "fstop": LANE_FSTOP}

# Baked light cannot move per shot, so the K's whole rig goes up once here,
# now that lane_target and stand_off, which rig_k stands its lights on, exist.
if LAYOUT == "k":
    rig_k()

# ----------------------------------------------------------------- render

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.use_adaptive_sampling = True
scene.render.resolution_x = int(W * SCALE)
scene.render.resolution_y = int(H * SCALE)
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = VIEW
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0
scene.view_settings.gamma = 1.0
scene.view_layers[0].use_pass_mist = True
world.mist_settings.falloff = "LINEAR"

if LINES:
    scene.render.use_freestyle = True
    scene.render.line_thickness = 1.0
    fs = scene.view_layers[0].freestyle_settings
    ls = fs.linesets.new("blueprint")
    ls.select_silhouette = True
    ls.select_crease = True
    ls.select_border = True
    ls.linestyle.color = lin(PALETTE["blueprint"])[:3]
    ls.linestyle.alpha = 0.35
    ls.linestyle.thickness = 1.2

# Compositor. Two things make a still sit on the page's own ink at any stage
# size and in either theme: the far floor fades to NOTHING with distance, and
# the near floor and the sides fade to nothing at the frame. Both are done to
# the alpha, never by mixing in a colour: the first build misted the floor to
# the light theme's ink and the dark theme, which paints a darker ink, showed
# a lighter plane with a horizon on it. Then a bloom on what is brighter than
# white.
#
# Cycles hands the compositor premultiplied colour, so the fade factor is
# multiplied into the colour and the alpha alike, and the alpha is replaced
# rather than applied a second time (applying would square it on antialiased
# silhouettes and darken every edge).
scene.use_nodes = True
tree = scene.node_tree
tree.nodes.clear()
rl = tree.nodes.new("CompositorNodeRLayers")
glare = tree.nodes.new("CompositorNodeGlare")
comp = tree.nodes.new("CompositorNodeComposite")

# The distance fade: 1 - mist.
far = tree.nodes.new("CompositorNodeMath")
far.operation = "SUBTRACT"
far.inputs[0].default_value = 1.0
tree.links.new(rl.outputs["Mist"], far.inputs[1])

# The frame fade: a soft box. In Blender 4.5 the box's place and size are
# input sockets. Measured on a 404x499 frame: Position is a fraction of each
# axis (y from the bottom), Size is a fraction of the image WIDTH on both
# axes, and the node's own `width` and `height` are its box on the editor
# canvas, which is a trap this script fell into once. So a height of 1.05 on
# the 808x998 still is 848 px, from 55 px under the top to 95 px above the
# bottom before the blur.
MASK_HEIGHT = 1.05
box_mask = tree.nodes.new("CompositorNodeBoxMask")
box_mask.inputs["Position"].default_value = (0.5, 0.52)
box_mask.inputs["Size"].default_value = (0.92, MASK_HEIGHT)
# The blur's size is not a radius. Measured on the finished 1x junction with
# the box at 0.92 (32 px in) and a size of 64 at 1x: alpha 17 of 255 at the
# frame, 128 at 32 px, 252 at 80 px. The close-ups use 200, a soft zone a few
# times wider, because nothing stands near their edges. Both scale with the
# render so the fade is the same fraction of the still at 1x and 2x; the
# per-shot values are set in the render loop below.
mask_blur = tree.nodes.new("CompositorNodeBlur")
mask_blur.filter_type = "FAST_GAUSS"
mask_blur.use_relative = False
tree.links.new(box_mask.outputs["Mask"], mask_blur.inputs["Image"])

# fade = (1 - mist) * mask, or just (1 - mist) for the poster, which is
# shown whole inside a bordered picture and needs no frame fade.
fade = tree.nodes.new("CompositorNodeMath")
fade.operation = "MULTIPLY"
tree.links.new(far.outputs["Value"], fade.inputs[0])
if MASK:
    tree.links.new(mask_blur.outputs["Image"], fade.inputs[1])
else:
    fade.inputs[1].default_value = 1.0

faded_rgb = tree.nodes.new("CompositorNodeMixRGB")
faded_rgb.blend_type = "MULTIPLY"
faded_rgb.inputs["Fac"].default_value = 1.0
tree.links.new(rl.outputs["Image"], faded_rgb.inputs[1])
tree.links.new(fade.outputs["Value"], faded_rgb.inputs[2])
faded_alpha = tree.nodes.new("CompositorNodeMath")
faded_alpha.operation = "MULTIPLY"
tree.links.new(rl.outputs["Alpha"], faded_alpha.inputs[0])
tree.links.new(fade.outputs["Value"], faded_alpha.inputs[1])
premul = tree.nodes.new("CompositorNodeSetAlpha")
premul.mode = "REPLACE_ALPHA"
tree.links.new(faded_rgb.outputs["Image"], premul.inputs["Image"])
tree.links.new(faded_alpha.outputs["Value"], premul.inputs["Alpha"])
tree.links.new(premul.outputs["Image"], glare.inputs["Image"])
if PREVIEW:
    over = tree.nodes.new("CompositorNodeAlphaOver")
    over.inputs[1].default_value = lin(PALETTE["background"])
    tree.links.new(glare.outputs["Image"], over.inputs[2])
    tree.links.new(over.outputs["Image"], comp.inputs["Image"])
else:
    tree.links.new(glare.outputs["Image"], comp.inputs["Image"])
if "Alpha" in comp.inputs:
    tree.links.new(rl.outputs["Alpha"], comp.inputs["Alpha"])


def set_glare(node, **values):
    for name, value in values.items():
        sock = node.inputs.get(name.replace("_", " ").title())
        if sock is not None:
            sock.default_value = value
        elif hasattr(node, name):
            setattr(node, name, value)


try:
    glare.glare_type = "BLOOM"
    set_glare(glare, threshold=1.0, size=6, strength=0.25)
except Exception:
    glare.glare_type = "FOG_GLOW"
    set_glare(glare, threshold=1.0, size=7, mix=-0.6)


def calibrate_shift(look):
    """Put the optical axis on the centre of the free region, like setViewOffset."""
    wanted = (RESERVE + FREE / 2) / W
    forward = cam.matrix_world.to_quaternion() @ Vector((0, 0, -10))
    axis_point = cam.matrix_world.translation + forward
    cam_data.shift_x = 0
    x0 = world_to_camera_view(scene, cam, axis_point).x
    cam_data.shift_x = 1
    x1 = world_to_camera_view(scene, cam, axis_point).x
    cam_data.shift_x = (wanted - x0) / (x1 - x0)


# The shots, unless this run is a bake. A bake owns the scene from here on
# (see bake_all at the foot of this file), so a run is one or the other.
if not BAKE:
    report = {}
    for name in SHOTS_WANTED:
        shot = SHOTS[name]
        pos = P(*shot["pos"])
        look = P(*shot["look"])
        cam.location = pos
        aim(cam, look)
        bpy.context.view_layer.update()
        aspect = FREE / H
        cam_data.angle_y = math.radians(fov_for(shot["fit"][0], shot["fit"][1], aspect))
        # The junction's fan reaches within 48 px of the still's left edge, so its
        # box is wider than a close-up's and its fade is tighter (see the blur's
        # comment above for the measured profile). The landing page's monitor
        # starts at 48 px, so only its outermost strip is touched.
        if name == "junction":
            box_mask.inputs["Size"].default_value = (0.92, MASK_HEIGHT)
            mask_blur.size_x = mask_blur.size_y = int(64 * SCALE)
        else:
            box_mask.inputs["Size"].default_value = (0.9, MASK_HEIGHT)
            mask_blur.size_x = mask_blur.size_y = int(200 * SCALE)
        cam_data.dof.use_dof = DOF
        cam_data.dof.focus_distance = (look - pos).length
        cam_data.dof.aperture_fstop = shot["fstop"]
        calibrate_shift(look)

        if LAYOUT == "fan":
            # Lights ride with the shot, as they do on the page: the key above and to
            # the right of the subject, a little towards the camera; the fill at the
            # camera; a cool rim behind the subject to lift it off the dark. The K's
            # light is a single static rig instead (rig_k above), because baked
            # light cannot move per shot.
            forward = look - pos
            forward.z = 0
            forward.normalize()
            right = Vector((forward.y, -forward.x, 0))
            if name == "junction":
                # One wide soft key over the arc the four objects stand on, so each
                # of them is lit and casts a shadow, rather than one key over the
                # empty middle of the floor.
                key.location = P(0, 11, -13)
                key.data.size = 22
                key.data.size_y = 8
                key.data.energy = JUNCTION_KEY_W
                key.data.spread = math.radians(110)
                aim(key, P(0, 1.5, -15))
            else:
                key.location = look + Vector((0, 0, 7.5)) - forward * 3.0 + right * 4.0
                key.data.size = 6
                key.data.size_y = 4
                key.data.energy = KEY_W
                # A softbox with a grid: the subject is lit, the floor around it is not
                # flooded, so the floor keeps its own colour and falls off to the dark.
                key.data.spread = math.radians(SPREAD)
                aim(key, look)
            fill.location = pos + Vector((0, 0, 1.0))
            rim.location = look + forward * 7 + Vector((0, 0, 6)) - right * 3
            aim(rim, look)

        dist = (look - pos).length
        world.mist_settings.start = dist + 6
        world.mist_settings.depth = MIST_DEPTH

        scene.render.filepath = os.path.join(OUT, f"{name}.png")
        bpy.ops.render.render(write_still=True)

        marks = {}
        for k, anchor in anchors.items():
            v = world_to_camera_view(scene, cam, anchor)
            marks[k] = [round(v.x * W), round((1 - v.y) * H), round(v.z, 2)]
        report[name] = {"frame": FRAME, "width": W, "height": H, "scale": SCALE, "camera": list(pos), "look": list(look), "fov_y": round(math.degrees(cam_data.angle_y), 2), "shift_x": round(cam_data.shift_x, 4), "marks": marks}
        print(f"rendered {name}: {report[name]}")

    # Merged into what is already there, so re-rendering one shot into a
    # directory of five keeps the other four's anchors.
    anchors_path = os.path.join(OUT, "anchors.json")
    merged = {}
    if os.path.exists(anchors_path):
        with open(anchors_path) as f:
            merged = json.load(f)
    merged.update(report)
    with open(anchors_path, "w") as f:
        json.dump(merged, f, indent=2)


def layout_report():
    """
    The K's layout in three.js coordinates: the shape Task 2's scene.json and
    the manifest both start from.

    A Blender vector converts to three.js with (v.x, v.z, -v.y), the inverse
    of P(). A lane's box converts corner by corner rather than as its min and
    max, because the y to z half of that conversion negates: componentwise on
    just the two corners would hand back a box whose min z is greater than
    its max z.
    """

    def to_three(v):
        return [round(v.x, 3), round(v.z, 3), round(-v.y, 3)]

    def bounds_three(key):
        lo, hi = lane_box(key)
        corners = [to_three(Vector((x, y, z))) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
        return {
            "min": [round(min(c[i] for c in corners), 3) for i in range(3)],
            "max": [round(max(c[i] for c in corners), 3) for i in range(3)],
        }

    def pose(shot):
        return {
            "pos": [round(v, 3) for v in shot["pos"]],
            "look": [round(v, 3) for v in shot["look"]],
            "fitH": round(shot["fit"][0], 3),
            "fitV": round(shot["fit"][1], 3),
            "fstop": round(shot["fstop"], 3),
        }

    return {
        "rotate": round(K_ROTATE, 3),
        "strokeWidth": round(STROKE_W, 3),
        "hub": round(HUB_R, 3),
        "node": round(NODE_R, 3),
        "floorSize": FLOOR_SIZE,
        "fade": [round(v, 3) for v in FLOOR_FADE],
        "lanes": [
            {
                "key": geom["key"],
                # Six decimals, not the three every other number here keeps: an
                # arm sits at 0.3 - atan2(19, 18) = -0.5126554 radians, and rounded
                # to three that is -0.513, which is 0.000345 out. The manifest is
                # what the runtime lays the K out from and what the unit test
                # compares against the closed form to five decimals, so the arm
                # would land 0.3 units off at the far node and the test would fail.
                "angle": round(geom["angle"], 6),
                "dist": round(geom["dist"], 3),
                "node": [round(v, 3) for v in lane_target(geom["angle"], geom["dist"], 0)],
                "back": round(geom["back"], 3),
                "aimY": round(geom["aimY"], 3),
            }
            for geom in LANES
        ],
        "poses": {shot_name: pose(shot) for shot_name, shot in SHOTS.items()},
        "anchors": {lane_key: to_three(v) for lane_key, v in anchors.items()},
        "bounds": {lane_key: bounds_three(lane_key) for lane_key in anchors},
    }


if LAYOUT == "k" and not BAKE:
    with open(os.path.join(OUT, "layout.json"), "w") as f:
        json.dump(layout_report(), f, indent=2)


# --------------------------------------------------------------- the bake

# Everything below runs only under `--bake`, and it runs after the renders
# above have had their chance at the scene, because it takes the scene apart:
# modifiers applied, parents cleared, one body per way, a second UV layer on
# each. What comes out is what the page loads: four glTF files, four
# lightmaps, one floor texture, and the report that says where they all go.


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
    # The report first, because join_way is about to remove three quarters of
    # the objects lane_box measures the bounds from: bpy.ops.object.join()
    # frees every object but the active one, and reading a bound_box off a
    # freed object raises rather than returning the box it used to have.
    report = dict(layout_report())
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
    report["ways"] = ways
    report["floor"] = {"texture": "floor.png", "scale": round(floor_scale, 4)}
    with open(os.path.join(out_dir, "scene.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(f"baked the floor: peak {floor_scale:.3f}")


if BAKE:
    if LAYOUT != "k":
        raise SystemExit("crossroads.py: --bake only makes sense on the K layout, which is what the page loads")
    bake_all(BAKE)
