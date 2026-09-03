/**
 * The room the objects reflect.
 *
 * Every MeshStandardMaterial in the scene takes image-based lighting from
 * scene.environment, and this is the environment: not three.js's
 * RoomEnvironment, which is a white room and lifts a dark scene out of its
 * dark, but a black box with two softboxes and a floor bounce in the scene's
 * own light tokens. It is baked to a PMREM once at boot and thrown away.
 *
 * What it buys is a gradient across every bevel and every cylinder, a
 * highlight that moves with the camera, and a shadowed side lit by the room
 * rather than black. What it does not touch: the screens, which are
 * MeshBasicMaterial and ignore it, and the floor, which is roughness 0.9 and
 * is handed envMapIntensity 0 (assets.ts), so it takes exactly nothing from
 * this rather than almost nothing. The floor is a baked picture, and a
 * softbox reflected across it would be a light the bake never saw.
 */
import {
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  type Material,
  type Texture,
  type WebGLRenderer,
} from 'three';

import { PALETTE } from './palette';

/**
 * The three lights, as emissive panels facing the origin.
 *
 * `gain` is what makes them lights rather than coloured cards: a
 * MeshBasicMaterial colour may exceed 1 and the PMREM target is half float,
 * so a softbox at six times its token is six times as bright in the bake,
 * which is what a real softbox is next to a wall.
 *
 * The key hangs high on the camera's right and a little behind the subject,
 * the fill high on the left and a little in front, the bounce is the floor.
 * Right is +x, because every shot in the scene looks roughly down -z.
 */
export const STUDIO_PANELS = [
  { color: PALETTE.lightKey, gain: 6, size: [14, 4], at: [10, 12, -4] },
  { color: PALETTE.lightFill, gain: 3, size: [6, 6], at: [-9, 10, 3] },
  { color: PALETTE.lightAmbient, gain: 1, size: [20, 20], at: [0, -12, 0] },
] as const satisfies readonly {
  color: number;
  gain: number;
  size: readonly [number, number];
  at: readonly [number, number, number];
}[];

const ROOM = 40;

/** The studio as a scene, so it can be inspected without a renderer. */
export function studioScene(): Scene {
  const studio = new Scene();
  studio.add(
    new Mesh(
      new BoxGeometry(ROOM, ROOM, ROOM),
      new MeshBasicMaterial({ color: PALETTE.background, side: BackSide }),
    ),
  );
  for (const panel of STUDIO_PANELS) {
    const mesh = new Mesh(
      new BoxGeometry(panel.size[0], panel.size[1], 0.4),
      new MeshBasicMaterial({ color: new Color(panel.color).multiplyScalar(panel.gain) }),
    );
    mesh.position.set(panel.at[0], panel.at[1], panel.at[2]);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
  }
  return studio;
}

/**
 * Bakes the studio to the environment texture and frees everything else.
 * The caller owns the texture and disposes it on teardown.
 */
export function bakeStudio(renderer: WebGLRenderer): Texture {
  const studio = studioScene();
  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(studio, 0.04).texture;
  pmrem.dispose();
  studio.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as Material).dispose();
    }
  });
  return texture;
}
