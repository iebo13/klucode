/**
 * The height of one band of the track, in svh. Five bands, junction then the
 * four ways, so the track adds 150svh of travel: about nine wheel notches at
 * 900px, against the eighteen the 25 August audit measured for the old
 * track, and with a snap on every boundary so a flick lands on a route.
 *
 * The same number is written in globals.css, in the `.crossroads-track`
 * height and nowhere else, because CSS cannot read a TypeScript constant.
 * The two have to move together.
 */
export const BAND_SVH = 30;

/** How many ways the track walks. The stills are rendered for exactly this many. */
export const WAYS = 4;

/**
 * The way the track selects when the section's top has scrolled `y` pixels
 * above the viewport's top, with bands `band` pixels tall. Band 0 is the
 * junction, band k is way k - 1, and past the last band the way stays the
 * last one: the stage releases because the track runs out, not because this
 * says so.
 */
export function scrollWay(y: number, band: number, ways = WAYS): number {
  if (band <= 0 || y < band) return -1;
  return Math.min(ways - 1, Math.floor(y / band) - 1);
}
