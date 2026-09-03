import type { SceneLabels } from './types';

/**
 * The two mock interfaces, drawn on a 2D canvas.
 *
 * Drawn twice, from one file, which is the whole reason it is a file. The
 * Blender pipeline compiles this module and calls `drawLanding`,
 * `drawDashboard` and `drawWorkScreen` on the built page (where the site's own
 * fonts are loaded) through `tools/blender/capture-textures.mjs`, to produce
 * the three PNGs `tools/blender/crossroads.py` loads as screen textures when it
 * renders the stills. And assets.ts calls the same three at runtime onto a
 * canvas, so the live scene's screens are drawn in the reader's own language
 * rather than in whichever one the bake was run with.
 *
 * It therefore ships, but only with the scene: assets.ts is imported by
 * scene.ts and nothing above that seam imports either, so this arrives on the
 * deferred chunk a browser fetches when it is about to draw a room, and never
 * on the phone that is not.
 *
 * `tests/unit/crossroads-textures.spec.ts` hands these functions a recording
 * stub, which is what proves every word on a screen came from labels.ts.
 */

/**
 * The slice of a 2D canvas context the builders use.
 *
 * Declared here rather than taken from the DOM type so the unit suite can hand
 * these functions a recording stub, which is how the rule "every word drawn
 * came from the labels" is asserted rather than trusted. A real
 * CanvasRenderingContext2D satisfies this structurally, with no cast.
 */
export interface Ctx {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
}

export const LANDING_SIZE = [1280, 800] as const;
export const DASHBOARD_SIZE = [1280, 720] as const;
export const WORK_SIZE = [512, 320] as const;

const DISPLAY = '"Archivo", system-ui, sans-serif';
const BODY = '"IBM Plex Sans", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

function roundRect(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * Way 01: a real landing page on the monitor.
 *
 * Light, because a page meant to be found and read looks nothing like an
 * internal tool, and that difference is doing sales work between way 01 and
 * way 02. The colours here are a mock client's, not KluCode's, which is why
 * they are literals rather than palette entries.
 */
export function drawLanding(g: Ctx, l: SceneLabels['landing']) {
  const [W] = LANDING_SIZE;
  g.textBaseline = 'middle';
  g.fillStyle = '#f6f3ec';
  g.fillRect(0, 0, W, 800);

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, 84);
  g.fillStyle = '#e2ded3';
  g.fillRect(0, 83, W, 1);
  g.fillStyle = '#1b1f1c';
  g.font = `700 32px ${DISPLAY}`;
  g.fillText(l.brand, 56, 43);
  g.fillStyle = '#6a706a';
  g.font = `400 24px ${BODY}`;
  // Right-aligned, 160px apart, ending 36px short of the pill. Laid out from
  // the left at fixed steps, the third word ran under the pill: "Über uns"
  // starts at 1040 and is 110px wide, and the pill starts at 1120.
  g.textAlign = 'right';
  l.nav.forEach((t, i) => g.fillText(t, 1084 - (l.nav.length - 1 - i) * 160, 43));
  g.textAlign = 'left';
  g.fillStyle = '#356c5b';
  roundRect(g, 1120, 24, 116, 40, 20);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = `500 22px ${BODY}`;
  g.fillText(l.cta, 1146, 45);

  g.fillStyle = '#356c5b';
  g.font = `500 24px ${MONO}`;
  g.fillText(l.eyebrow, 56, 168);
  g.fillStyle = '#14171a';
  g.font = `800 76px ${DISPLAY}`;
  g.fillText(l.headline[0], 56, 250);
  g.fillText(l.headline[1], 56, 336);
  g.fillStyle = '#5c625c';
  g.font = `400 28px ${BODY}`;
  g.fillText(l.lead[0], 56, 410);
  g.fillText(l.lead[1], 56, 450);

  g.fillStyle = '#356c5b';
  roundRect(g, 56, 496, 268, 66, 33);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = `600 27px ${BODY}`;
  g.textAlign = 'center';
  g.fillText(l.action, 190, 530);
  g.textAlign = 'left';

  g.fillStyle = '#dfe4de';
  roundRect(g, 700, 150, 520, 412, 10);
  g.fill();
  g.fillStyle = '#c6cec6';
  roundRect(g, 736, 190, 448, 250, 6);
  g.fill();
  g.fillStyle = '#aab4aa';
  g.fillRect(736, 470, 300, 16);
  g.fillRect(736, 500, 220, 16);

  l.cards.forEach(([title, note], i) => {
    const x = 56 + i * 392;
    g.fillStyle = '#ffffff';
    roundRect(g, x, 610, 360, 150, 10);
    g.fill();
    g.fillStyle = '#356c5b';
    g.fillRect(x + 28, 640, 34, 4);
    g.fillStyle = '#22262a';
    g.font = `600 26px ${BODY}`;
    g.fillText(title, x + 28, 682);
    g.fillStyle = '#8b918b';
    g.font = `400 21px ${BODY}`;
    g.fillText(note, x + 28, 720);
  });
}

/**
 * Way 02: the dashboard of an internal tool. Dark, dense, full of the client's
 * own numbers, and deliberately the opposite register to the landing page.
 */
export function drawDashboard(g: Ctx, l: SceneLabels['dashboard']) {
  const [W, H] = DASHBOARD_SIZE;
  g.textBaseline = 'middle';
  g.fillStyle = '#12151a';
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#0d1014';
  g.fillRect(0, 0, 240, H);
  g.fillStyle = '#5ea472';
  g.font = `700 26px ${DISPLAY}`;
  g.fillText(l.app, 32, 46);
  l.nav.forEach((t, i) => {
    if (i === l.navActive) {
      g.fillStyle = '#1a2620';
      roundRect(g, 16, 96 + i * 52, 208, 44, 6);
      g.fill();
      g.fillStyle = '#5ea472';
      g.fillRect(16, 96 + i * 52, 3, 44);
    }
    g.fillStyle = i === l.navActive ? '#dfe7e1' : '#767e77';
    g.font = `400 22px ${BODY}`;
    g.fillText(t, 40, 118 + i * 52);
  });

  g.fillStyle = '#e6ebe7';
  g.font = `700 34px ${DISPLAY}`;
  g.fillText(l.title, 280, 52);
  g.fillStyle = '#5ea472';
  roundRect(g, 1076, 30, 168, 44, 22);
  g.fill();
  g.fillStyle = '#0d130f';
  g.font = `600 21px ${BODY}`;
  g.textAlign = 'center';
  g.fillText(l.action, 1160, 53);
  g.textAlign = 'left';

  l.kpis.forEach(([label, value], i) => {
    const x = 280 + i * 328;
    g.fillStyle = '#181d23';
    roundRect(g, x, 96, 300, 118, 8);
    g.fill();
    g.strokeStyle = '#252c34';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#79817b';
    g.font = `400 20px ${MONO}`;
    // Not label.toUpperCase(). The label arrives uppercase, because a string
    // this function invents is a string the i18n test cannot vouch for.
    g.fillText(label, x + 24, 130);
    g.fillStyle = '#7fd4a0';
    g.font = `800 42px ${DISPLAY}`;
    g.fillText(value, x + 24, 180);
  });

  g.fillStyle = '#181d23';
  roundRect(g, 280, 238, 628, 218, 8);
  g.fill();
  g.strokeStyle = '#252c34';
  g.stroke();
  const bars = [0.42, 0.58, 0.36, 0.72, 0.5, 0.83, 0.64, 0.9, 0.55, 0.7, 0.46, 0.78];
  bars.forEach((b, i) => {
    const h = b * 130;
    g.fillStyle = i === 7 ? '#5ea472' : '#2c3a34';
    roundRect(g, 312 + i * 48, 420 - h, 30, h, 4);
    g.fill();
  });
  g.fillStyle = '#79817b';
  g.font = `400 18px ${MONO}`;
  g.fillText(l.chartNote, 312, 268);

  g.fillStyle = '#181d23';
  roundRect(g, 936, 238, 308, 218, 8);
  g.fill();
  g.strokeStyle = '#252c34';
  g.stroke();
  l.rows.forEach(([name, value], i) => {
    g.fillStyle = '#b8c0ba';
    g.font = `400 20px ${BODY}`;
    g.fillText(name, 960, 292 + i * 42);
    g.fillStyle = '#7fd4a0';
    g.font = `400 20px ${MONO}`;
    g.textAlign = 'right';
    g.fillText(value, 1220, 292 + i * 42);
    g.textAlign = 'left';
  });

  for (let i = 0; i < 3; i += 1) {
    g.fillStyle = '#181d23';
    roundRect(g, 280, 482 + i * 74, 964, 60, 6);
    g.fill();
    g.fillStyle = '#2f3a33';
    g.fillRect(304, 502 + i * 74, 220, 8);
    g.fillRect(560, 502 + i * 74, 150, 8);
    g.fillStyle = '#3c4b42';
    g.fillRect(304, 520 + i * 74, 140, 8);
    g.fillStyle = '#5ea472';
    roundRect(g, 1140, 498 + i * 74, 80, 28, 14);
    g.fill();
  }
}

/**
 * The screens on the office monitors in way 03. Seen from four metres away, so
 * it carries no words at all: shapes that read as work, and nothing to
 * translate.
 */
export function drawWorkScreen(g: Ctx) {
  const [W, H] = WORK_SIZE;
  g.fillStyle = '#12161b';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#1c242b';
  g.fillRect(0, 0, W, 34);
  g.fillStyle = '#5ea472';
  g.fillRect(16, 12, 60, 10);
  for (let i = 0; i < 9; i += 1) {
    g.fillStyle = i % 3 === 0 ? '#4a6f5c' : '#28323a';
    g.fillRect(24, 62 + i * 26, 120 + ((i * 47) % 260), 10);
  }
  g.fillStyle = '#2a3540';
  g.fillRect(330, 60, 160, 120);
  g.fillStyle = '#5ea472';
  g.fillRect(340, 150, 20, 24);
  g.fillRect(370, 128, 20, 46);
  g.fillRect(400, 110, 20, 64);
  g.fillRect(430, 92, 20, 82);
}
