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
  const positions = new CatmullRomCurve3(
    waypoints.map((p) => toVector(p.pos)),
    false,
    'centripetal',
  );
  const looks = new CatmullRomCurve3(
    waypoints.map((p) => toVector(p.look)),
    false,
    'centripetal',
  );
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
      if (a === undefined || b === undefined)
        throw new Error('crossroads: the flight lost a waypoint');
      out.fitH = a.fitH + (b.fitH - a.fitH) * w;
      out.fitV = a.fitV + (b.fitV - a.fitV) * w;
      out.fstop = a.fstop + (b.fstop - a.fstop) * w;
      return out;
    },
  };
}
