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
};

/**
 * One camera position: the junction, or the close-up of one way.
 *
 * It was a Stop, with an `at` saying where on the scroll track it sat. The
 * track is gone: the camera glides from wherever it is to whichever shot the
 * reader's pointer or keyboard has asked for, and nothing about a shot says
 * when. See journey.ts for the glide.
 *
 * Positions are number tuples rather than Vector3 on purpose: it keeps the
 * choreography out of three.js, which is what lets the whole of journey.ts be
 * unit-tested with no GPU, no canvas and no browser.
 */
export type Shot = {
  /** Index of the way this shot looks at, or -1 for the junction. */
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

/**
 * Where one way's name belongs on screen, in CSS pixels inside the view.
 *
 * The bond between a row and the thing it describes. Before this the number,
 * the name and the price sat 200px to the right of the object in a list that
 * brightened one line at a time, and in the establishing shot all four objects
 * were on screen with none of them named.
 *
 * Pixels rather than a Vector3, because the consumer is a CSS transform and
 * the projection is the scene's business.
 *
 * `front` is the one thing only the scene can answer: whether the anchor is in
 * front of the lens at all. Behind it the perspective divide mirrors the point
 * onto the screen, which is how an object standing behind you ends up with a
 * label in the middle of the frame.
 *
 * Whether the label FITS is deliberately not decided here. That question is
 * about a box of text whose width is a font metric, and the scene has no idea
 * how wide „01 Individuelle Web-Anwendung" is in Schibsted Grotesk at 14px in
 * this reader's browser. The scene said it did for one draft, using the anchor
 * and a padding constant, and the result was a chip sliding a third of itself
 * under the copy panel while the anchor was still comfortably clear of it.
 */
export type Mark = { x: number; y: number; front: boolean };

/** What boot() hands back. The component talks to the scene only through this. */
export type Handle = {
  /**
   * Glide to the close-up of way `way`, or back to the junction for -1.
   *
   * Asking for the shot the camera is already on, or already gliding to, is
   * a no-op. Asking for another one mid-glide starts a new glide from where
   * the camera is, so a pointer sweeping down the four rows never snaps.
   */
  aim(way: number): void;
  /**
   * Starts the build: the four drawings become the four objects, one after
   * another. Called once, when the section first comes into view. Calling it
   * again does nothing, and the objects never go back to being drawings.
   */
  reveal(): void;
  /** The way the camera is on or gliding to, or -1 for the junction. */
  focus(): number;
  /**
   * Where each way's label belongs, in the order the ways were handed over.
   *
   * The returned array is the scene's own and is rewritten in place on every
   * call. Read it, do not keep it.
   */
  marks(): readonly Mark[];
  /** How many of the four ways are finished, 0 to 4. A count, not a fraction. */
  built(): number;
  /**
   * Repaints the world's ground: the background the fan stands in and the fog
   * that swallows the far end of the floor, which are the same colour by
   * definition.
   *
   * It exists because the scene is FULL BLEED and the ink slab above it is
   * not. The canvas runs to the viewport edges and the hero sits directly on
   * top of it, so any difference between the scene's background and
   * --kc-inkSurface draws a hard horizontal line across the page at the
   * boundary. A hex literal cannot track that: ink is one value in the light
   * scheme and a darker one in dark, and three.js does not read CSS.
   */
  setGround(colour: string): void;
  /** Cancels the loop, drops listeners, disposes every GPU resource. */
  stop(): void;
};

export type BootOptions = {
  /**
   * The copy panel, so the camera knows which part of the canvas it may not
   * compose into. Null-tolerant: a scene with nothing standing on it composes
   * centrally, which is what every shot was solved for before the stage went
   * full bleed.
   */
  panel?: HTMLElement | null;
  /**
   * The colour the world stands in, as anything `THREE.Color` accepts —
   * in practice the `rgb(...)` string getComputedStyle hands back for the
   * section's own background. Defaults to PALETTE.background, which is what
   * every shot was lit and fogged against. See Handle.setGround.
   */
  ground?: string;
  /**
   * Called after every drawn frame. The labels follow the camera, and the
   * camera now moves on its own clock rather than on the scroll, so the
   * component has to be told when there is something new to place rather
   * than asking on every scroll event.
   */
  onFrame?: () => void;
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
