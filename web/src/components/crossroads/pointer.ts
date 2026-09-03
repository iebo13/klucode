/**
 * A pixel to a ray, and a ray to a thing.
 *
 * Four boxes and a plane, which is why there is no Raycaster: Ray is already
 * in the shipped chunk and intersects a Box3 and a Plane on its own. The boxes
 * are the objects' world-space bounds grown by a margin, so a hover need not
 * land on a bezel. No state: everything here is a function of its arguments.
 */
import { Plane, Vector3, type Box3, type PerspectiveCamera, type Ray } from 'three';

/** How far a hit box reaches past the thing it wraps, in world units. */
export const HIT_MARGIN = 0.3;

const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const ndc = new Vector3();
const point = new Vector3();

/** A hit box for the thing standing in `box`. A new box; the argument is untouched. */
export const hitBox = (box: Box3): Box3 => box.clone().expandByScalar(HIT_MARGIN);

/**
 * The ray from the camera through pixel (x, y) of a view w by h, into `out`.
 *
 * unproject reads the camera's projection matrix, so the view offset scene.ts
 * sets for the copy panel is honoured: the pixel is mapped through the same
 * frustum that drew it.
 */
export function rayThrough(
  x: number,
  y: number,
  w: number,
  h: number,
  camera: PerspectiveCamera,
  out: Ray,
): Ray {
  ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1, 0.5).unproject(camera);
  out.origin.copy(camera.position);
  out.direction.copy(ndc).sub(camera.position).normalize();
  return out;
}

/** The nearest of `boxes` the ray enters, by index, or -1 for none. */
export function hitOf(ray: Ray, boxes: readonly Box3[]): number {
  let best = -1;
  let nearest = Infinity;
  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];
    if (box === undefined) continue;
    if (ray.intersectBox(box, point) === null) continue;
    const d = point.distanceToSquared(ray.origin);
    if (d < nearest) {
      nearest = d;
      best = i;
    }
  }
  return best;
}

/** Where the ray meets the floor, into `out`. False when it never does. */
export function floorPoint(ray: Ray, out: Vector3): boolean {
  return ray.intersectPlane(FLOOR, out) !== null;
}
