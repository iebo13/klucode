/**
 * The baked place, loaded.
 *
 * Everything the scene draws comes out of `tools/blender/crossroads.py`
 * through `tools/blender/emit-scene.mjs`: four glTF bodies, a lightmap each,
 * one texture for the whole floor, and `scene-manifest.ts` saying where they
 * are and what to multiply them by. Nothing here decides how the place looks.
 * The light was decided in Cycles and this module only puts it back on the
 * surfaces it was baked off, which is why every material below is either
 * unlit or lit by a map rather than by a lamp.
 *
 * Two rulings against the letter of the design spec, both recorded here
 * because this is the file that makes them.
 *
 * The floor is built here rather than exported as a glTF. It is one quad, and
 * the manifest already carries its size and the radii its alpha fades
 * between, so a file on the wire would be a hundred bytes of geometry and one
 * more thing to keep in step.
 *
 * The floor's material is a MeshStandardMaterial, not the MeshBasicMaterial
 * section 4 names. A basic material takes no light at all, and the same
 * section asks for a light that follows the pointer across the floor. So the
 * bake rides in the emissive channel, where nothing can dim it, and the
 * diffuse channel is left dark and empty for that light to arrive on later.
 */
import {
  Box3,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { PALETTE } from './palette';
import { createRegistry } from './registry';
import { FLOOR, LAYOUT, SCENE_ORDER, WAYS, type Picture } from './scene-manifest';
import {
  DASHBOARD_SIZE,
  LANDING_SIZE,
  WORK_SIZE,
  drawDashboard,
  drawLanding,
  drawWorkScreen,
} from './textures';
import type { SceneLabels, ServiceKey } from './types';

/**
 * How far over white an emitter is drawn.
 *
 * The bloom's threshold is 1.05 and a screen's white is exactly 1.0 (see
 * post.ts, which records why that gap exists). An emitter has to clear the
 * threshold on its own, because nothing lights it: 2.5 puts the status lamp
 * and the lit LEDs well past 1.05 in every channel and leaves everything else
 * in the scene under it.
 */
export const EMITTER_GAIN = 2.5;

/**
 * What the studio is worth on a baked surface.
 *
 * The bake already carries every bounce Cycles found, so the environment is
 * here for one thing the lightmap cannot do: a highlight that moves when the
 * camera does. At 1 it would add a second, static ambient on top of the baked
 * one and flatten it.
 */
export const ENVIRONMENT_INTENSITY = 0.4;

/** Device pixel ratio at and above which the 2x textures are fetched. */
export const RETINA = 1.5;

/**
 * What a Cycles diffuse light pass is worth as a three.js irradiance.
 *
 * The two renderers put the Lambert division in different places. Cycles
 * composes a surface as albedo times its diffuse pass, so the pass is already
 * the outgoing radiance per unit albedo. three.js composes it as irradiance
 * times BRDF_Lambert, which is albedo over pi, so handing it the pass
 * unchanged renders every baked body pi times too dark.
 *
 * Measured on the six viewer pairs with this factor left out: the app's
 * database cylinder came back at 47.6 display luminance against Cycles' 81.9,
 * its server rack at 38.0 against 61.7, its monitor bezel at 73.9 against
 * 126.4, the care rack at 41.6 against 65.1 and the cloud at 44.9 against
 * 76.5. That is 0.58 to 0.64 of the render, which at the sRGB transfer
 * function is 0.32 of it in linear light, and 1 / pi is 0.3183.
 */
const LAMBERT = Math.PI;

export type LoadedWay = {
  key: ServiceKey;
  group: Group;
  box: Box3;
  anchor: Vector3;
  screens: Mesh[];
  emitters: Mesh[];
};

export type Loaded = { floor: Mesh; ways: LoadedWay[]; dispose(): void };

export type LoadOptions = {
  dpr: number;
  labels: SceneLabels;
  /** Site-root path to URL: `asset` from lib/base-path on the page, a prefix in the viewer. */
  url: (path: string) => string;
  environment: Texture | null;
};

type ScreenKind = 'landing' | 'dashboard' | 'work';

/**
 * A node's `kc` tag, or its parent's.
 *
 * GLTFLoader puts a node's glTF extras on the object it makes for that node.
 * A node of one primitive becomes a Mesh and carries the tag itself; the
 * joined body has a primitive per material, so it becomes a Group with the
 * tag and Meshes under it with none.
 */
const tagOf = (o: Object3D): string => String(o.userData.kc ?? o.parent?.userData.kc ?? 'body');

/**
 * The alpha the floor fades out with, as a picture.
 *
 * The far floor has to end in whatever ink the section paints, in either
 * theme, and a fade to a colour would be a lighter plane with a horizon on it
 * the moment the theme changed. So the plane loses its alpha instead. The
 * canvas covers the whole 100 by 100 floor, so a radius of r world units is
 * r / floorSize of the canvas's own width: full alpha out to LAYOUT.fade[0],
 * which is 34 of 100, and nothing past LAYOUT.fade[1], which is 48, and the
 * far node of an arm stands at 26.2 with its objects reaching about 28, so
 * the letter itself is never touched.
 */
function radialFade(): CanvasTexture {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('crossroads: this browser gave no 2D context for the floor fade');
  const gradient = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px);
  gradient.addColorStop(LAYOUT.fade[0] / LAYOUT.floorSize, '#ffffff');
  gradient.addColorStop(LAYOUT.fade[1] / LAYOUT.floorSize, '#000000');
  g.fillStyle = gradient;
  g.fillRect(0, 0, px, px);
  return new CanvasTexture(canvas);
}

export async function loadScene(opts: LoadOptions): Promise<Loaded> {
  const registry = createRegistry();
  const pick = (p: Picture): string => (opts.dpr >= RETINA ? p.x2 : p.x1);

  const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const textureLoader = new TextureLoader();
  const loadTexture = async (path: string): Promise<Texture> =>
    registry.track(await textureLoader.loadAsync(opts.url(path)));
  const loadModel = async (path: string): Promise<Group> => {
    const gltf = await gltfLoader.loadAsync(opts.url(path));
    trackTree(registry, gltf.scene);
    return gltf.scene;
  };

  /**
   * Everything on the wire at once, and nothing left dangling if one fails.
   *
   * allSettled rather than the Promise.all the plan named: all rejects the
   * moment the first request fails, while the other eight are still in
   * flight, and whatever those hand back afterwards has nobody left to free
   * it. Each load above tracks what it built as it arrives, so waiting for
   * every one of them and then disposing is what frees the lot.
   */
  const floorJob = loadTexture(pick(FLOOR.texture));
  const wayJobs = SCENE_ORDER.map((key) => ({
    key,
    scene: loadModel(WAYS[key].model),
    lightmap: loadTexture(pick(WAYS[key].lightmap)),
  }));
  const settled = await Promise.allSettled<unknown>([
    floorJob,
    ...wayJobs.flatMap((job) => [job.scene, job.lightmap]),
  ]);
  const failure = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failure) {
    registry.disposeAll();
    throw failure.reason;
  }

  const floorTexture = await floorJob;
  floorTexture.colorSpace = SRGBColorSpace;
  // flipY stays at its default of true. PlaneGeometry's v = 1 edge lands at
  // -z once the plane is laid down, which is where the bake's v = 1 row is:
  // crossroads.py gives the floor UVs from (0, 0) at the near left corner,
  // and Blender writes a PNG top row first, so the flip is what puts them
  // back the same way round.
  const fade = registry.track(radialFade());
  const floorMaterial = registry.track(
    new MeshStandardMaterial({
      color: PALETTE.floor,
      roughness: 0.9,
      metalness: 0,
      emissive: 0xffffff,
      emissiveMap: floorTexture,
      emissiveIntensity: FLOOR.scale,
      alphaMap: fade,
      transparent: true,
    }),
  );
  // Nothing from the studio on the floor: it is a baked picture, and a
  // reflection of a softbox across it would be a second light source the bake
  // never saw.
  floorMaterial.envMapIntensity = 0;
  const floor = new Mesh(
    registry.track(new PlaneGeometry(LAYOUT.floorSize, LAYOUT.floorSize)),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;

  const screenMaterials = new Map<ScreenKind, MeshBasicMaterial>();
  const screenMaterial = (kind: ScreenKind): MeshBasicMaterial => {
    const had = screenMaterials.get(kind);
    if (had) return had;
    const canvas = document.createElement('canvas');
    const size =
      kind === 'landing' ? LANDING_SIZE : kind === 'dashboard' ? DASHBOARD_SIZE : WORK_SIZE;
    canvas.width = size[0];
    canvas.height = size[1];
    const g = canvas.getContext('2d');
    if (!g) throw new Error(`crossroads: this browser gave no 2D context for the ${kind} screen`);
    if (kind === 'landing') drawLanding(g, opts.labels.landing);
    else if (kind === 'dashboard') drawDashboard(g, opts.labels.dashboard);
    else drawWorkScreen(g);
    const texture = registry.track(new CanvasTexture(canvas));
    texture.colorSpace = SRGBColorSpace;
    // The UVs came out of a glTF, whose v runs down from the top left, and
    // the canvas is drawn the same way down from its own top left.
    texture.flipY = false;
    // toneMapped false, and a white that is exactly 1.0: the bloom's
    // threshold sits five per cent above it on purpose (post.ts).
    const material = registry.track(new MeshBasicMaterial({ map: texture, toneMapped: false }));
    screenMaterials.set(kind, material);
    return material;
  };

  const emitterMaterial = registry.track(
    new MeshBasicMaterial({
      color: new Color(PALETTE.status).multiplyScalar(EMITTER_GAIN),
      toneMapped: false,
    }),
  );

  const ways: LoadedWay[] = [];
  for (const job of wayJobs) {
    const key = job.key;
    const way = WAYS[key];
    const group = await job.scene;
    const lightmap = await job.lightmap;
    lightmap.colorSpace = SRGBColorSpace;
    // The UVs came out of a glTF, so v runs down from the top left, which is
    // the row order the PNG is stored in: no flip.
    lightmap.flipY = false;
    // The lightmap unwrap is always the second UV layer (join_way in
    // crossroads.py), so it arrives as TEXCOORD_1 and reads from channel 1.
    lightmap.channel = 1;

    const screens: Mesh[] = [];
    const emitters: Mesh[] = [];
    group.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const tag = tagOf(o);
      if (tag.startsWith('screen:')) {
        o.material = screenMaterial(tag.slice('screen:'.length) as ScreenKind);
        screens.push(o);
      } else if (tag === 'emitter') {
        o.material = emitterMaterial;
        emitters.push(o);
      } else if (o.material instanceof MeshStandardMaterial) {
        o.material.lightMap = lightmap;
        o.material.lightMapIntensity = way.lightScale * LAMBERT;
        o.material.envMap = opts.environment;
        o.material.envMapIntensity = ENVIRONMENT_INTENSITY;
        o.material.needsUpdate = true;
      }
    });

    ways.push({
      key,
      group,
      box: new Box3(
        new Vector3(way.bounds.min[0], way.bounds.min[1], way.bounds.min[2]),
        new Vector3(way.bounds.max[0], way.bounds.max[1], way.bounds.max[2]),
      ),
      anchor: new Vector3(way.anchor[0], way.anchor[1], way.anchor[2]),
      screens,
      emitters,
    });
  }

  return { floor, ways, dispose: () => registry.disposeAll() };
}

/** Every geometry and material a loaded glTF brought with it, so dispose() can free them. */
function trackTree(registry: ReturnType<typeof createRegistry>, root: Object3D): void {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    registry.track(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
      registry.track(material as Material);
    }
  });
}
