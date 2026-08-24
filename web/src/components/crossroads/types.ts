// The key union is owned by the content files, which is why it is imported
// rather than declared again here. Two copies of a closed set drift.
import type { ServiceKey } from '@/content/types';

export type { ServiceKey };

/** One way, as the scene needs it. A projection of Service, not a copy of it. */
export type Way = {
  key: ServiceKey;
  name: string;
  price: string;
  priceNote: string;
  forWhom: string;
  reads: string;
};

/**
 * One camera position on the journey.
 *
 * Positions are number tuples rather than Vector3 on purpose: it keeps the
 * choreography out of three.js, which is what lets the whole of progress.ts be
 * unit-tested with no GPU, no canvas and no browser.
 */
export type Stop = {
  /** Scroll progress at which the camera is exactly here, 0 to 1. */
  at: number;
  /** Index of the way this stop looks at, or -1 for the junction and the closing shot. */
  focus: number;
  pos: [number, number, number];
  look: [number, number, number];
  /**
   * The half-angles this shot has to cover, in degrees, horizontally and
   * vertically. Not a field of view: the field of view is worked out from
   * these and the aspect the canvas actually has, in scene.ts.
   *
   * A PerspectiveCamera's fov is VERTICAL, so one number gives a narrow column
   * far less horizontal room than a wide one, and this canvas ranges from
   * 470px wide to 980px. A single fov either cropped the office in half on a
   * laptop or, set wide enough not to, pushed every object so far away that the
   * dashboard could not be read on any screen. Two half-angles say what the
   * shot must contain and let each viewport spend its own aspect on satisfying
   * both.
   */
  fitH: number;
  fitV: number;
};

/** What boot() hands back. The component talks to the scene only through this. */
export type Handle = {
  /** Scroll progress, 0 to 1. Applies state synchronously, defers the draw. */
  set(p: number): void;
  /** Index of the way in focus, or -1 at the junction. Never stale. */
  focus(): number;
  /** How many of the four ways are finished, 0 to 4. A count, not a fraction. */
  built(): number;
  /** Cancels the loop, drops listeners, disposes every GPU resource. */
  stop(): void;
};

/**
 * Every word drawn inside the scene.
 *
 * The mock interfaces are furniture, not site copy, so they live beside the
 * code that draws them rather than in the content files. They still localise,
 * and `Record<Lang, SceneLabels>` is what makes a half-translated scene a
 * compile error.
 */
export type SceneLabels = {
  landing: {
    brand: string;
    nav: readonly [string, string, string];
    cta: string;
    eyebrow: string;
    headline: readonly [string, string];
    lead: readonly [string, string];
    action: string;
    cards: readonly (readonly [string, string])[];
  };
  dashboard: {
    app: string;
    nav: readonly string[];
    /** Index of the highlighted nav item. The screen is on this page. */
    navActive: number;
    title: string;
    action: string;
    kpis: readonly (readonly [string, string])[];
    chartNote: string;
    rows: readonly (readonly [string, string])[];
  };
};
