/**
 * The scene's colours, as the numbers three.js wants.
 *
 * Hex literals rather than an import of tokens.json: a JSON module imports as
 * one object and does not tree-shake per key, so importing it would ship the
 * whole token file, oklch metadata and all, to every visitor.
 *
 * The trailing comment on each line is load-bearing.
 * web/scripts/check-scene-palette.mjs parses it and fails the build the moment
 * a number stops matching the token it names.
 */
export const PALETTE = {
  background: 0x1c201c, // stone.950
  floor: 0x2d322d, // stone.900
  accent: 0x5ea472, // viridian.500
  accentLight: 0x9ed3af, // viridian.300
  blueprint: 0x5cc2f0, // scene.blueprint
  metal: 0xa8ada9, // stone.400
  screen: 0xffffff, // stone.0
  // The three lights. They are not decoration: every surface in the section is
  // rendered through them, so a drift here repaints the whole scene. They live
  // as tokens for the same reason the surfaces do, and because
  // check-scene-palette.mjs reads this file and nothing else.
  lightAmbient: 0x44546c, // scene.lightAmbient
  lightKey: 0xffd9a4, // scene.lightKey
  lightFill: 0x7fa8d0, // scene.lightFill
} as const;
