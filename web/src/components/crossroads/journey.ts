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
export function blend(
  from: CameraState,
  to: CameraState,
  t: number,
  out: CameraState,
): CameraState {
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
export function settleState(
  state: CameraState,
  target: CameraState,
  dtMs: number,
  tauMs: number,
): void {
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
export function offsetPosition(
  pos: Vector3,
  look: Vector3,
  dx: number,
  dy: number,
  out: Vector3,
): Vector3 {
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
