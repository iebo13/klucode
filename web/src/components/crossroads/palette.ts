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
} as const;
