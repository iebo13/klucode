/**
 * The lens, and the two things every shot needs from it: a field of view that
 * covers what the pose promised at whatever aspect the browser hands us, and
 * a projection of a world point back into the pixels a chip stands on.
 *
 * Nothing here holds state. The camera and the CameraState belong to the
 * runtime, which rewrites both in place every frame.
 */
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
