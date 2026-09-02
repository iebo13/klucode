'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { asset } from '@/lib/base-path';

import type { WorldProps } from './index';
import { applyMarks, placeMarks, type Candidate } from './marks';
import { STILL, STILLS, STILL_ORDER, type StillKey } from './stills';
import { nearestStop } from './track';

/**
 * The place as five pictures, for a browser that cannot draw one.
 *
 * This is what the whole section was for a day, and every line of it is that
 * day's, moved rather than rewritten: five renders of the same room stacked
 * one on top of another, one showing, placed by a single transform. What it
 * costs a visitor who never sees it is nothing, because the <img> tags are
 * only in the document where this component mounts.
 *
 * It mounts in two situations and they are worth telling apart. A browser with
 * no WebGL gets it from the start, which is the fallback the spec asks for. A
 * browser that has WebGL but could not load the place gets it after the fact,
 * when live-world.tsx calls onFail and the shell swaps the two: from the
 * reader's side that is a section that took a moment to arrive, and nothing
 * else, because the panel, the rows, the chips and the track are the shell's
 * and never moved.
 */

/**
 * The contain transform of a still inside the free region.
 *
 * `contain` semantics and nothing cleverer: the smaller of the two ratios, so
 * the whole frame is inside the free region on both axes, centred in the free
 * region horizontally and in the stage vertically. Measured against the build,
 * at 1024x736 the section is its own height, the stage is 1024x972, the free
 * region is 536 wide and the width binds at 0.663; at 1440x900 and 1920x1080
 * the track pins the stage to one viewport and the height binds, at 0.902 and
 * 1.082. So the objects keep close to their rendered size on a big screen with
 * the section's own ink either side, and shrink to fit a narrow column, which
 * is what the live camera's field of view does.
 *
 * The render's own 808x998 is the free region beside the panel at 1440x900
 * with the section standing at its own height, which is what it was framed
 * for. The pin makes the stage shorter than that, so at both pinned widths the
 * picture is letterboxed rather than exact.
 */
function fit(reserve: number, stageW: number, stageH: number) {
  const freeW = Math.max(0, stageW - reserve);
  const s = Math.min(freeW / STILL.width, stageH / STILL.height);
  return {
    s,
    ox: reserve + (freeW - STILL.width * s) / 2,
    oy: (stageH - STILL.height * s) / 2,
  };
}

export function StillsWorld({ ordered, focus, track, metrics, markRefs, placeRef }: WorldProps) {
  /** The five stills, as one box that one transform places. */
  const stackRef = useRef<HTMLDivElement>(null);
  /**
   * The way the track has scrolled to, or -1 for the junction.
   *
   * Read off the track by subscription rather than taken from the shell,
   * because the shell publishes the CONTINUOUS position and only re-renders on
   * the nearest stop. A world that waited for a render would be a picture that
   * changed when the section around it happened to change. The stills need the
   * stop and nothing finer, so `nearestStop` collapses the notches and React
   * drops every set that repeats the number it already holds.
   */
  const [trackWay, setTrackWay] = useState(-1);

  useEffect(() => track.subscribe((t) => setTrackWay(nearestStop(t) - 1)), [track]);

  /**
   * Which of the five renders is showing.
   *
   * The same two inputs the shell writes into data-stop, in the same order, so
   * the picture and the attribute can never name different rooms. Read off
   * `ordered` rather than off a second copy of ORDER: the shell sorted the ways
   * before anything downstream saw them, so ordered[i] IS ORDER[i].
   */
  const at = focus >= 0 ? focus : trackWay;
  const stop: StillKey = (at >= 0 ? ordered[at]?.key : undefined) ?? 'junction';

  /**
   * The stack's transform and the four labels, and nothing else touches
   * either.
   *
   * One pass for both because both come out of the same fit(): the stack is a
   * fixed 808x998 box with the pictures stretched over it, so placing the box
   * places every frame of the crossfade at once and a fade can never be two
   * pictures at two different scales, and the anchors are in that box's own
   * pixels. The transform is the same string on a hover, which the browser
   * drops, so a picture change costs five attributes and four transforms and
   * no layout read at all.
   *
   * The anchors come from stills.ts, which is written by the render itself, so
   * a label's position and the picture it stands on can never disagree: both
   * were produced by the same camera in the same pass. What happens to a chip
   * that lands under the panel, off the stage or on top of its neighbour is
   * marks.ts's, which the live world hands the same question to.
   *
   * translate3d rather than left/top, so a label move is a compositor
   * transform and never a layout pass.
   */
  const paint = useCallback(() => {
    const m = metrics.current;
    const { s, ox, oy } = fit(m.reserve, m.stageW, m.stageH);
    const stack = stackRef.current;
    if (stack) {
      stack.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${s})`;
    }
    const anchors = STILLS[stop].marks;
    const candidates: Candidate[] = ordered.map((way) => {
      const anchor = anchors[way.key];
      return { x: ox + anchor.x * s, y: oy + anchor.y * s, on: anchor.on };
    });
    applyMarks(placeMarks(candidates, m), markRefs.current);
  }, [stop, ordered, metrics, markRefs]);

  // Left where the shell's measure can reach it, and run at once: on mount the
  // metrics are still zeros, because a child's effects run before its parent's,
  // and the measure that follows calls this again with the real numbers. On
  // every later render only the second half of that is true, which is why the
  // picture changing is a call rather than a re-measure.
  useEffect(() => {
    placeRef.current = paint;
    paint();
  }, [paint, placeRef]);

  /* The world: five renders of the same place, one showing. The stack is one
     box at the render's own size that the shell's measure scales and moves as
     a whole, so the pictures need no geometry of their own and a crossfade is
     two opacities and nothing else.

     The size is inline rather than in globals.css because STILL comes out of
     the render: the emitter writes stills.ts from the same pass that produced
     the pictures and the anchors, so the box, the images and the label
     positions are one measurement. In the stylesheet it would be a second,
     typed copy of it, and fit() above already reads the generated one.

     Plain <img> and the rule turned off for it, rather than next/image: the
     export has no optimiser (images.unoptimized is set in next.config.mjs), so
     <Image> would emit this same tag inside a wrapper with sizing of its own,
     and the sizing here is one transform on the box around all five. */
  return (
    <div
      ref={stackRef}
      aria-hidden="true"
      className="crossroads-stills"
      style={{ width: STILL.width, height: STILL.height }}
    >
      {STILL_ORDER.map((key) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          data-key={key}
          data-on={stop === key}
          className="crossroads-still"
          src={asset(STILLS[key].src)}
          srcSet={`${asset(STILLS[key].src)} 1x, ${asset(STILLS[key].src2x)} 2x`}
          width={STILL.width}
          height={STILL.height}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ))}
    </div>
  );
}
