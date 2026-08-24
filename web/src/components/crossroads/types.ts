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
};

/** What boot() hands back. The component talks to the scene only through this. */
export type Handle = {
  /** Scroll progress, 0 to 1. Applies state synchronously, defers the draw. */
  set(p: number): void;
  /** Index of the way in focus, or -1 at the junction. Never stale. */
  focus(): number;
  /** Share of the four objects that are built, 0 to 1. */
  built(): number;
  /** Cancels the loop, drops listeners, disposes every GPU resource. */
  stop(): void;
};
