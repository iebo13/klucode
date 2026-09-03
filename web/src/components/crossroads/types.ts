// The key union is owned by the content files, which is why it is imported
// rather than declared again here. Two copies of a closed set drift.
import type { Vector3 } from 'three';

import type { ServiceKey } from '@/content/types';

export type { ServiceKey };

/** A point or a direction as the pipeline writes it into JSON and the manifest. */
export type Vec3 = readonly [number, number, number];

/**
 * One camera pose as the pipeline exports it: where it stands, what it looks
 * at, the half-angles it must cover (see fovFor in camera.ts) and its
 * aperture as an f-stop, which post.ts turns into a depth of field.
 */
export type Pose = { pos: Vec3; look: Vec3; fitH: number; fitV: number; fstop: number };

/** The camera as the runtime moves it: the same five things with live vectors, rewritten in place every frame. */
export type CameraState = {
  pos: Vector3;
  look: Vector3;
  fitH: number;
  fitV: number;
  fstop: number;
};

/** Where one way's name belongs on screen, in CSS pixels inside the view. `front` is false behind the lens. */
export type Mark = { x: number; y: number; front: boolean };

/** One way, as the scene needs it. A projection of Service, not a copy of it. */
export type Way = {
  key: ServiceKey;
  name: string;
  price: string;
  priceNote: string;
  forWhom: string;
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

/**
 * What boot() resolves to.
 *
 * The whole of what the component may do to the scene, and the whole of what
 * it may ask it. Nothing else in the section imports three.js, so this is the
 * seam: everything above it is DOM and everything below it is a renderer.
 */
export type Handle = {
  /** Glide to way `way`'s pose, or back to the track's position for -1. The same way twice is a no-op. */
  aim(way: number): void;
  /** The track's position: 0 the map, k stop k, fractions between. The camera settles onto the flight there. */
  scroll(t: number): void;
  /** The section has come into view. Called once; later calls do nothing. */
  reveal(): void;
  /**
   * The pointer is at (x, y) in CSS pixels inside the view. Returns the way
   * under it, or -1. Also aims the parallax and the cursor light.
   */
  pointer(x: number, y: number): number;
  /** The pointer has left the stage. Parallax and light ease to rest. */
  pointerLeave(): void;
  /** Where each way's label belongs this frame, in the order the ways were handed over. Rewritten in place. */
  marks(): readonly Mark[];
  /** The ink the world stands in: anything THREE.Color accepts, in practice the section's computed background. */
  setBackground(css: string): void;
  /** True while the loop is parked: nothing moving, no frame scheduled. */
  parked(): boolean;
  /** Frames drawn since boot. The browser suite reads it through the component. */
  frames(): number;
  /** Cancels the loop, drops listeners, disposes every GPU resource. */
  stop(): void;
};

export type BootOptions = {
  /** The copy panel, so the camera composes into what is left of the view. */
  panel: HTMLElement | null;
  ways: readonly Way[];
  labels: SceneLabels;
  /** The section's computed background. */
  background: string;
  /** prefers-reduced-motion: the camera cuts between stops, no glide, no parallax, no light. */
  reduced: boolean;
  /** `asset` from lib/base-path. */
  url: (path: string) => string;
  /** After every drawn frame, and once more when the loop parks. */
  onFrame: () => void;
};
