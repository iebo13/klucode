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
 * is. The live world takes the position itself; the shell and the stills world
 * take `nearestStop` of it, because a row lights and a picture changes at a
 * stop and not at a fraction.
 *
 * There used to be a `scrollWay(y, band)` here, which was `nearestStop(scrollT(
 * ...)) - 1` in one call, and it went when the shell started needing both
 * halves of that from ONE reading: the row wants the stop and the camera wants
 * the position, and a helper that threw the position away meant reading the
 * scroll twice and letting the two disagree.
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

/**
 * The stop nearest to t: 0 for the map, k for way k - 1. Its caller takes one
 * off it to get a way, or -1 for the map.
 *
 * The NEAREST stop rather than the band the reader is in, and that is the
 * whole of what this rounds for: the row lights when the camera is more than
 * halfway to it, the way the August glide named its destination the moment it
 * left, so the camera arrives at a thing that is already named.
 */
export function nearestStop(t: number, ways = WAYS): number {
  return Math.min(ways, Math.max(0, Math.round(t)));
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
