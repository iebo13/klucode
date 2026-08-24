import { CanvasTexture } from 'three';

import type { Ctx } from './textures';

/**
 * Draws to an offscreen canvas and returns it as a texture.
 *
 * Drawn twice on purpose. Once now, with whatever face is loaded, so the scene
 * never waits on a font. Once again when the real face arrives, so the mock
 * interfaces are not set in Arial. Waiting instead would block the whole scene
 * on a webfont, and a browser with fonts blocked never resolves at all, which
 * is what the timeout is for.
 */
export function paint(w: number, h: number, draw: (g: Ctx) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('crossroads: no 2d context for a surface');

  draw(g);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 8;

  const fonts = document.fonts;
  if (fonts?.ready) {
    Promise.race([fonts.ready, new Promise((resolve) => setTimeout(resolve, 2000))])
      .then(() => {
        draw(g);
        texture.needsUpdate = true;
      })
      .catch(() => {});
  }

  return texture;
}
