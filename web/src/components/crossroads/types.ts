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
