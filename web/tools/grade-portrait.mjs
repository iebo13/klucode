/**
 * The portrait, cropped and graded into the palette.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 26 August visual audit's tenth finding: the headshot is an untreated
 * grey-studio photograph, the brightest rectangle on the site, and 82 CIE L*
 * away from everything around it. It is a good photograph and it belonged to a
 * different design — a picture that has nothing in common with the page it
 * sits on reads as a stock image even when it is the actual person.
 *
 * The treatment is a DUOTONE and not a filter. Luminance is taken to all three
 * channels and then mapped onto a line between two of the site's own colours:
 * viridian.950 in the shadows and stone.200 in the highlights. Every value in
 * the picture is therefore a value the rest of the page is already made of,
 * which is what makes it belong rather than merely match. The two ends are
 * chosen rather than eyeballed:
 *
 *   shadow  viridian.950  the darkest step the brand hue reaches, so the
 *                         jacket and the hair carry the brand colour instead
 *                         of a neutral black
 *   high    stone.200     one step DARKER than the light page. At stone.50 the
 *                         studio backdrop lands within a hair of the paper and
 *                         the portrait loses its own edge; one step down and it
 *                         reads as a distinct rectangle with a soft boundary,
 *                         in both schemes.
 *
 * It replaced the one-liner that used to live in brand/photos/README.md. A
 * command in a README is a command somebody retypes slightly differently, and
 * the crop window below is framed rather than centred — losing it costs the
 * headroom the photograph was composed with.
 *
 *     node tools/grade-portrait.mjs      # run from web/
 *
 * Writes public/founder.webp. Commit the result. The 4 MB source stays in
 * brand/photos/ because none of this is reversible from the derivative.
 */
import sharp from 'sharp';

const SOURCE = '../brand/photos/founder-source.png';
const OUT = 'public/founder.webp';

/**
 * Framed, not centred: the hair starts around y 310 and the chin around y 890,
 * so a 1700-tall window from y 140 puts the head a tenth of the way down the
 * frame and ends at mid-jacket. A centred crop takes the same number of pixels
 * off the top and cuts into the headroom.
 */
const CROP = { left: 0, top: 140, width: 1360, height: 1700 };

/** The 4:5 slot on /ueber-mich, cropped at source so CSS has nothing left to do. */
const SIZE = { width: 1000, height: 1250 };

/**
 * Luminance to all three channels.
 *
 * `.greyscale()` would be the obvious call and it is the wrong one here: it
 * produces a one-band image, and `.linear()` refuses to expand bands, so the
 * pipeline fails outright. A recomb whose three rows are the same luminance
 * weights leaves three bands carrying the same value, which is what the map
 * below needs.
 */
const LUMA = [
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
];

const SHADOW = [0x11, 0x24, 0x13]; // viridian.950
const HIGH = [0xd7, 0xdb, 0xd8]; // stone.200

const slope = HIGH.map((h, i) => (h - SHADOW[i]) / 255);

const info = await sharp(SOURCE)
  .extract(CROP)
  .resize(SIZE.width, SIZE.height, { fit: 'cover' })
  .recomb(LUMA)
  .linear(slope, SHADOW)
  .webp({ quality: 82 })
  .toFile(OUT);

console.log(`${OUT}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} kB`);
