"""
The crossroads, rebuilt in Blender and rendered with Cycles.

Spike, 2 September 2026. The question it answers: does the same composition
(four ways on lanes from a junction, the same objects, the same shots) read as
professional once it is lit and rendered properly, instead of drawn from code
primitives in three.js?

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
import sys

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

# ---------------------------------------------------------------- arguments

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def arg(name, default):
    return argv[argv.index(name) + 1] if name in argv else default


HERE = os.path.dirname(os.path.abspath(__file__))
OUT = arg("--out", os.path.join(HERE, "renders"))
SHOTS_WANTED = arg("--shots", "junction" if arg("--frame", "free") == "poster" else "junction,website,app,capacity,care").split(",")
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
VIEW = arg("--view", "Standard")
PREVIEW = arg("--preview", "0") == "1"
LANE_FSTOP = float(arg("--fstop", "0.8"))
SPREAD = float(arg("--spread", "80"))
KEY_COLOR = arg("--key-color", "fff1dc")
MIST_DEPTH = float(arg("--mist", "20"))

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

PALETTE = {
    "background": "1c201c",
    "floor": "444844",
    "accent": "5ea472",
    "accentLight": "9ed3af",
    "blueprint": "5cc2f0",
    "metal": "a8ada9",
    "screen": "ffffff",
    "metalMid": "757975",
    "metalDark": "5c605c",
    "wood": "8a6440",
    "cloud": "64748c",
    "status": "76e39b",
    "lightAmbient": "44546c",
    "lightKey": "ffd9a4",
    "lightFill": "7fa8d0",
}


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


def screen(name, w, h, parent, pos, mat):
    """A plane facing the viewer (three +z, Blender -y), textured upright."""
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
    return link(ob)


def empty(name, parent=None, pos=(0, 0, 0), rot_z=0.0):
    ob = bpy.data.objects.new(name, None)
    ob.location = P(*pos)
    ob.rotation_euler.z = rot_z
    ob.parent = parent
    return link(ob)


# ------------------------------------------------------------- the lanes

LANES = [
    {"key": "website", "angle": 0.8, "dist": 17, "back": 9.1, "aimY": 2.33},
    {"key": "app", "angle": 0.28, "dist": 17, "back": 11.4, "aimY": 2.6},
    {"key": "capacity", "angle": -0.28, "dist": 17, "back": 13.2, "aimY": 0.98},
    {"key": "care", "angle": -0.8, "dist": 17, "back": 11.2, "aimY": 2.78},
]

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
    screen("web.screen", 5, 3.13, lane, (0, 2.9, z + 0.13), emission("landing", None, SCREEN, images["landing"]))


def build_app(lane, z):
    frame = material("frame", PALETTE["metal"], 0.5, 0.2)
    box("app.frame", 6, 3.6, 0.22, 0.05, lane, (0, 3.4, z), frame)
    box("app.neck", 0.32, 1.5, 0.32, 0.04, lane, (0, 0.85, z), frame)
    box("app.base", 2.3, 0.14, 1.2, 0.04, lane, (0, 0.06, z), frame)
    screen("app.screen", 5.6, 3.15, lane, (0, 3.4, z + 0.13), emission("dashboard", None, SCREEN, images["dashboard"]))
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
            screen(f"desk{k}.screen", 1.24, 0.76, lane, (x, 1.42, dz - 0.235), work)
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
        sphere(f"bay{k}.led1", 0.035, lane, (0.55, y + 0.08, z + 0.68), lit)
        sphere(f"bay{k}.led2", 0.035, lane, (0.64, y + 0.08, z + 0.68), lit)
        sphere(f"bay{k}.led0", 0.035, lane, (0.46, y + 0.08, z + 0.68), dark)
    cloud = material("cloud", PALETTE["cloud"], 0.95)
    for i, (px, py, pz, r) in enumerate([(0, 4.85, 0, 1.25), (-1, 4.7, 0.15, 0.9), (1, 4.75, -0.15, 0.95), (0.05, 5.15, 0, 0.72)]):
        sphere(f"cloud{i}", r, lane, (px, py, z + pz), cloud, squash=(1, 0.55, 0.85))
    rung = material("rung", PALETTE["accent"], 0.4)
    for k in range(5):
        w = 0.22 + k * 0.11
        box(f"rung{k}", w, 0.07, w, 0.02, lane, (0, 3.22 + k * 0.24, z), rung)
    sphere("status.lamp", 0.1, lane, (0.7, 2.7, z + 0.66), emission("status", PALETTE["status"], 10.0))


BUILDERS = {"website": build_website, "app": build_app, "capacity": build_capacity, "care": build_care}

# The floor, the hub and the strips.
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


def aim(ob, target):
    d = target - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


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


SHOTS = {"junction": {"pos": Vector((0, 5, 15)), "look": Vector((0, 1.6, -10)), "fit": (WIDE_FIT_H, WIDE_FIT_V), "fstop": 11.0}}
for geom in LANES:
    target = lane_target(geom["angle"], geom["dist"], geom["aimY"])
    SHOTS[geom["key"]] = {"pos": stand_off(target, geom["back"]), "look": target, "fit": (LANE_FIT_H, LANE_FIT_V), "fstop": LANE_FSTOP}

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

# Compositor: mist to the page's ink (so the far floor fades to exactly what the
# CSS paints around the canvas), then a bloom on what is brighter than white.
scene.use_nodes = True
tree = scene.node_tree
tree.nodes.clear()
rl = tree.nodes.new("CompositorNodeRLayers")
mix = tree.nodes.new("CompositorNodeMixRGB")
mix.blend_type = "MIX"
mix.inputs[2].default_value = lin(PALETTE["background"])
glare = tree.nodes.new("CompositorNodeGlare")
comp = tree.nodes.new("CompositorNodeComposite")
tree.links.new(rl.outputs["Mist"], mix.inputs["Fac"])
tree.links.new(rl.outputs["Image"], mix.inputs[1])
# Cycles hands the compositor premultiplied colour. The mix above paints the
# sky ink at alpha 0, which is not premultiplied any more; re-apply the alpha
# so the sky is (0, 0, 0, 0) again and an alpha-over adds the ink once.
premul = tree.nodes.new("CompositorNodeSetAlpha")
premul.mode = "APPLY"
tree.links.new(mix.outputs["Image"], premul.inputs["Image"])
# The edges fade to nothing: a soft box multiplies the alpha, so the near
# floor and the sides of the still end in the page's ink wherever the still
# is placed, at any stage size. The objects and the light pool sit well
# inside the box. Its width is set per shot below (the junction's fan reaches
# further out than a close-up).
# In Blender 4.5 the box's place and size are input sockets. Measured on a
# 404x499 frame: Position is a fraction of each axis (y from the bottom), Size
# is a fraction of the image WIDTH on both axes, and the node's own `width`
# and `height` are its box on the editor canvas, which is a trap this script
# fell into once. So a height of 1.05 on the 808x998 still is 848 px, from
# 55 px under the top to 95 px above the bottom before the blur.
MASK_HEIGHT = 1.05
box_mask = tree.nodes.new("CompositorNodeBoxMask")
box_mask.inputs["Position"].default_value = (0.5, 0.52)
box_mask.inputs["Size"].default_value = (0.92, MASK_HEIGHT)
# Measured at half scale: a size of 120 turned the box's hard edge into a
# soft zone about 80 px wide on each side, so the number is not a radius.
# Scaled with the render, so the fade is the same fraction of the still at
# 1x and 2x.
mask_blur = tree.nodes.new("CompositorNodeBlur")
mask_blur.filter_type = "FAST_GAUSS"
mask_blur.use_relative = False
mask_blur.size_x = int(200 * SCALE)
mask_blur.size_y = int(200 * SCALE)
tree.links.new(box_mask.outputs["Mask"], mask_blur.inputs["Image"])
alpha_mul = tree.nodes.new("CompositorNodeMath")
alpha_mul.operation = "MULTIPLY"
tree.links.new(rl.outputs["Alpha"], alpha_mul.inputs[0])
if MASK:
    tree.links.new(mask_blur.outputs["Image"], alpha_mul.inputs[1])
else:
    alpha_mul.inputs[1].default_value = 1.0
tree.links.new(alpha_mul.outputs["Value"], premul.inputs["Alpha"])
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
    # box is wider than a close-up's, but not the full width: at 0.98 the
    # fade sat on the frame edge and the first column of pixels was at half
    # alpha, a visible step once the still is letterboxed on a pinned stage.
    box_mask.inputs["Size"].default_value = (0.94 if name == "junction" else 0.9, MASK_HEIGHT)
    cam_data.dof.use_dof = DOF
    cam_data.dof.focus_distance = (look - pos).length
    cam_data.dof.aperture_fstop = shot["fstop"]
    calibrate_shift(look)

    # Lights ride with the shot, as they do on the page: the key above and to
    # the right of the subject, a little towards the camera; the fill at the
    # camera; a cool rim behind the subject to lift it off the dark.
    forward = (look - pos)
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

with open(os.path.join(OUT, "anchors.json"), "w") as f:
    json.dump(report, f, indent=2)
