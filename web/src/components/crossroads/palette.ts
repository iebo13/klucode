/**
 * The scene's colours, as plain numeric literals.
 *
 * Not imported by the site any more: the homepage shows five pre-rendered
 * Blender stills, so this file ships nothing. It stays as the record
 * `web/scripts/check-scene-palette.mjs` checks against the tokens, and as the
 * reference for `tools/blender/crossroads.py`'s own copy of these colours,
 * which the gate does not yet check (a follow-up, not in this pass).
 *
 * Hex literals rather than an import of tokens.json: a JSON module imports as
 * one object and does not tree-shake per key, so importing it would ship the
 * whole token file, oklch metadata and all, to every visitor. The trailing
 * comment on each line is load-bearing regardless of who reads the file:
 * check-scene-palette.mjs parses it and fails the build the moment a number
 * stops matching the token it names.
 */
export const PALETTE = {
  background: 0x1c201c, // stone.950
  /**
   * stone.800, and it was stone.900.
   *
   * One step off the background is not a floor, it is the absence of one. At
   * #2D322D against a #1C201C background the ground read as void everywhere the
   * key light did not reach, so the establishing shot looked like four drawings
   * hanging in the dark rather than four ways leading somewhere, and the fog
   * had nothing to fade. Two steps is enough to see the surface recede without
   * lifting the scene out of the dark it is meant to be in.
   */
  floor: 0x444844, // stone.800
  accent: 0x5ea472, // viridian.500
  accentLight: 0x9ed3af, // viridian.300
  blueprint: 0x5cc2f0, // scene.blueprint
  metal: 0xa8ada9, // stone.400
  screen: 0xffffff, // stone.0
  metalMid: 0x757975, // stone.600
  metalDark: 0x5c605c, // stone.700
  // Scene furniture, and the reason color.scene exists. A desk, a person, a
  // cloud and a status lamp are not brand roles, so they are deliberately not
  // emitted as CSS variables: nothing outside this file can reach them.
  wood: 0x8a6440, // scene.wood
  people: 0x46708f, // scene.people
  /**
   * Was #CFDCEA, which is very nearly white, and this is an albedo rather than
   * a swatch: what matters is what it renders as.
   *
   * The cloud sits at y 4.85 and the key light hangs at y 7, so of everything
   * on the floor it is the object closest to the lamp. Sampled off the render,
   * #CFDCEA came back #C9C7BF: the brightest thing in the scene by some way,
   * brighter than the dashboard two lanes over, which is the one surface here
   * that is supposed to pull the eye. It also arrived warm, the key having
   * overwhelmed a colour picked to be cool.
   *
   * So the albedo is chosen against the measurement rather than against the
   * eye. #64748C is darker and considerably bluer than the result wanted,
   * because the light between it and the camera adds both back.
   */
  cloud: 0x64748c, // scene.cloud
  status: 0x76e39b, // scene.status
  // The three lights. They are not decoration: every surface in the section is
  // rendered through them, so a drift here repaints the whole scene. They live
  // as tokens for the same reason the surfaces do, and because
  // check-scene-palette.mjs reads this file and nothing else.
  lightAmbient: 0x44546c, // scene.lightAmbient
  lightKey: 0xffd9a4, // scene.lightKey
  lightFill: 0x7fa8d0, // scene.lightFill
} as const;
