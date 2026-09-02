'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ArrowLink, Eyebrow, RHYTHM } from '@/components/ui';
import { asset } from '@/lib/base-path';
import type { Lang } from '@/lib/routes';

import { STILL, STILLS, STILL_ORDER, type StillKey } from './stills';
import { BAND_SVH, scrollWay } from './track';
import type { ServiceKey, Way } from './types';

/**
 * The order the four ways stand in, left to right, in every language.
 *
 * The content files do not agree on this: de.ts lists the services in the
 * order they are priced, en.ts leads with developer capacity. That is each
 * language's own editorial call and the services page keeps it. The stills
 * cannot: each one was rendered with the four objects on their own lanes, in
 * this order, and the anchors in stills.ts are the positions those objects
 * came out at. Fed a different order the rows would point at the wrong
 * pictures and the labels would stand at somebody else's object.
 *
 * So the crossroads sorts, and the column beside it sorts with it, because
 * the rows, the lanes and the labels are the same four things in the same
 * order.
 */
const ORDER: ServiceKey[] = ['website', 'app', 'capacity', 'care'];

const inOrder = (ways: readonly Way[]): Way[] =>
  ORDER.map((key) => ways.find((w) => w.key === key)).filter((w): w is Way => w !== undefined);

/**
 * The room the stills need, as one query. Width only.
 *
 * 64rem is Tailwind's `lg`, which is where the copy becomes a panel standing
 * on the left of the world rather than the whole width of the section. Below
 * it the panel would cover the picture, so there is no picture and the price
 * board carries the section on its own.
 *
 * There used to be a height half: `(min-height: 46rem)`, because the section
 * was a stage fixed at 100svh with the panel inside it, and on a 1366x768
 * laptop the panel was taller than the stage and clipped a price. Height is
 * PIN's question now, and it answers it differently: a short laptop gets the
 * stills like any other, it just does not get the track.
 */
const ROOM = '(min-width: 64rem)';

/**
 * The room the TRACK needs, on top of ROOM: a viewport tall enough for the
 * copy panel to stand inside a pinned stage, under the fixed header.
 *
 * Measured rather than chosen, and the arithmetic is the whole of it. At 1440
 * wide with the pinned paddings the German panel is 768px tall (English 740),
 * globals.css clears the header capsule with 5.5rem above it and leaves 1rem
 * below, so a pinned stage needs 768 + 88 + 16 = 872px. The smallest whole rem
 * that holds that is 55 (880px), which leaves 8px of slack for a copy change
 * to eat before anything is clipped.
 *
 * That pins 1440x900 and 1920x1080 and leaves 1536x864 and 1366x768 unpinned,
 * where the section is its own height and behaves exactly as it did before the
 * track: hover-driven, no stops, no scroll cost. Two earlier numbers were
 * wrong in the same way and are worth naming, because the mistake is easy to
 * repeat: 51rem was the panel with no room for anything around it, and 53rem
 * was the panel plus its paddings with no room for the header standing over
 * it. A floor that does not hold its own contents pins the one viewport that
 * cannot show them.
 */
const PIN = '(min-width: 64rem) and (min-height: 55rem)';

/**
 * Where the poster stops being a strip and becomes the upright crop.
 *
 * 40rem is Tailwind's `sm`, and it is written once here and once in the
 * <source media> below it, which is the one duplication this file cannot
 * remove: a media attribute takes a string and cannot read a constant. The two
 * describe the same boundary, so they have to move together, because the crops
 * show DIFFERENT objects and a mismatch would leave the alt text describing
 * four things next to a picture of two.
 */
const STRIP = '(min-width: 40rem)';

/**
 * How much clear space a label needs on every side before it is shown at all.
 *
 * A chip touching the panel's edge or the top of the stage reads as a
 * rendering fault rather than as a label, and one that is half under the panel
 * reads as a bug. 12px is a hair more than the chip's own corner radius, which
 * is what makes it look placed rather than trapped.
 */
const MARK_GAP = 12;

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
 * is what the live camera's field of view used to do.
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

/**
 * Whether this visitor gets the stills at all.
 *
 * One question now, and it is about room. The WebGL probe went with the
 * renderer: a picture needs no graphics context, so a browser with WebGL
 * switched off sees the same section as everybody else. The reduced-motion
 * refusal went with the camera: five stills and a crossfade have nothing that
 * travels, and the crossfade itself is inside a
 * `prefers-reduced-motion: no-preference` block in globals.css, so a reader
 * who asks for no motion gets a cut between two pictures rather than a price
 * board where every other laptop shows the world.
 */
function canMount(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(ROOM).matches;
}

export function Crossroads({
  lang,
  eyebrow,
  title,
  lead,
  link,
  hint,
  servicesPath,
  fromLabel,
  sceneAlt,
  scenePhoneAlt,
  ways,
}: {
  lang: Lang;
  eyebrow: string;
  title: string;
  lead: string;
  link: { href: string; label: string };
  /**
   * That the rows do anything. Rendered only where the stills mount, because
   * in the fallback there is nothing to hover towards and the line would be a
   * promise the page cannot keep.
   */
  hint: string;
  /** The services page, so every row can link to its own card there. */
  servicesPath: string;
  fromLabel: string;
  sceneAlt: string;
  /** The upright crop, for widths where the strip is a dark banner. */
  scenePhoneAlt: string;
  ways: readonly Way[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** The five stills, as one box that one transform places. */
  const stackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  /**
   * The four labels standing at the four objects.
   *
   * Held as DOM nodes and never as state. A label's position is one transform
   * and nothing else, and routing four pixel positions through React would
   * re-render this whole section to move a chip.
   */
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);
  /**
   * The four rows, so a chip can open the one it names.
   *
   * A chip is not a second link: two anchors with the same href and the same
   * text would be two entries in a screen reader's link list for one
   * destination, and the marks layer is aria-hidden precisely so that does not
   * happen. Clicking the row is the whole of what a chip does.
   */
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const [enhanced, setEnhanced] = useState(false);
  /**
   * Whether the poster is showing the upright crop rather than the strip.
   *
   * Only the alt text depends on it: <picture> picks the file on its own, and
   * it cannot pick an alt. Starts false so the first render matches the static
   * HTML, and is corrected in an effect, the same shape as `enhanced`.
   */
  const [phoneCrop, setPhoneCrop] = useState(false);
  /** The row under the pointer or holding keyboard focus, or -1 for none. */
  const [focus, setFocus] = useState(-1);
  /**
   * The chip under the pointer, or -1 for none. Called `hinted` and not `hint`
   * because the prop of that name is the affordance line under the board.
   *
   * A second, weaker input than `focus`, and the difference is the whole of
   * what a chip does on the way in: it lights its own row and itself, and it
   * leaves the picture alone. Pointing at a chip used to set the aim, which
   * crossfaded to that way's close-up, where the chip's own object is
   * somewhere else entirely: the control moved out from under the pointer that
   * touched it. Clicking still opens the row, which is what a chip is for.
   */
  const [hinted, setHinted] = useState(-1);
  /** Whether the track is running: ROOM and a viewport tall enough for PIN. */
  const [pinned, setPinned] = useState(false);
  /** The way the track has scrolled to, or -1 for the junction. */
  const [scrollWayNow, setScrollWayNow] = useState(-1);
  /**
   * Whether the section has been looked at. The stack fades in on the way in,
   * so a reader arriving sees the world appear rather than already there.
   */
  const [revealed, setRevealed] = useState(false);

  // Sorted once, and everything downstream reads this: the stills, the rows,
  // the labels and the numbering. The prop's own order is never used.
  const ordered = useMemo(() => inOrder(ways), [ways]);

  /**
   * Two inputs, one aim. The pointer's or the keyboard's way wins while it is
   * on one; otherwise the track's. Letting go of a row therefore returns the
   * picture to the route the scroll is on, not to the junction, and scrolling
   * walks the highlight down the board.
   */
  const aim = focus >= 0 ? focus : scrollWayNow;
  /** Which of the five renders is showing. The section carries it as data-still. */
  const still: StillKey = (aim >= 0 ? ORDER[aim] : undefined) ?? 'junction';

  // Decided on the client and re-decided when ROOM or PIN flips, because
  // rotating a tablet or dragging a window crosses those lines in both
  // directions. Watching the queries themselves rather than a second copy of
  // them is the point: the two cannot be given different numbers.
  useEffect(() => {
    const room = window.matchMedia(ROOM);
    const pin = window.matchMedia(PIN);
    const strip = window.matchMedia(STRIP);
    const decide = () => {
      const mounts = canMount();
      setEnhanced(mounts);
      setPinned(mounts && pin.matches);
      setPhoneCrop(!strip.matches);
    };
    decide();
    room.addEventListener('change', decide);
    pin.addEventListener('change', decide);
    strip.addEventListener('change', decide);
    return () => {
      room.removeEventListener('change', decide);
      pin.removeEventListener('change', decide);
      strip.removeEventListener('change', decide);
    };
  }, []);

  /**
   * Everything about this section that is measured in CSS pixels rather than
   * computed: the panel's edges, the stage's box, and how big each of the four
   * labels actually is.
   *
   * One measurement rather than three, taken on mount, once more when the web
   * fonts have landed, and on resize. Nothing here runs on a hover: the stack's
   * transform is the same for all five stills, so the picture changing costs
   * five attributes and four transforms and no layout read at all.
   *
   * The label widths are the part that has to be here. A label is a box of
   * text and its width is a font metric: measured at 1440 in German, the chip
   * for "02 Individuelle Web-Anwendung" is 245px and "04 Betrieb & Wartung"
   * 170, the name set in the body face (Inter) at 14px and the number beside
   * it in the mono face at 11px, and nothing in the render knows either. The
   * anchors say where an object is, not how wide its name will be in this
   * reader's browser.
   */
  const metrics = useRef({ reserve: 0, stageW: 0, stageH: 0, half: [] as number[], tall: 0 });

  /**
   * Moves the four labels, and nothing else touches their transforms.
   *
   * The anchors come from stills.ts, which is written by the render itself, so
   * a label's position and the picture it stands on can never disagree: both
   * were produced by the same camera in the same pass. Mapped through the same
   * contain transform the stack carries, then held to the rules below.
   *
   * translate3d rather than left/top, so a label move is a compositor
   * transform and never a layout pass.
   */
  const place = useCallback(() => {
    const { reserve, stageW, stageH, half, tall } = metrics.current;
    const { s, ox, oy } = fit(reserve, stageW, stageH);
    const anchors = STILLS[still].marks;
    /**
     * Every chip's box before anything is written to the DOM, because two of
     * them have to be compared with each other and a box read back out of the
     * DOM would be a layout read per chip per hover.
     *
     * x is the chip's centre and y its bottom, which is where the transform
     * puts it: the chip is centred on its anchor and rises from it, so it
     * reaches `w` to either side and `tall` up.
     */
    const chips = ORDER.map((key, i) => {
      const anchor = anchors[key];
      const at = { x: ox + anchor.x * s, y: oy + anchor.y * s };
      /**
       * The chip is nudged into the free region rather than dropped out of
       * it. At the 1024 floor the free region is 536px wide, the fan fills
       * it, and "01 Website & Landingpage" is 208px: measured there, the
       * first chip's own left half reaches 39px past the panel's edge.
       * Hiding it would cost exactly the shot the labels exist for, which is
       * the one where all four objects are on screen and the reader is
       * finding out what they are. A 39px shift on a 208px chip is 19% and
       * reads as placement.
       *
       * Bounded at half the box, because past that the nudge stops meaning
       * "this label, slightly moved" and starts meaning "this label, over
       * somebody else's object". Past it the label is dropped.
       */
      const w = half[i] ?? 0;
      const low = reserve + MARK_GAP + w;
      const high = stageW - MARK_GAP - w;
      return {
        at,
        w,
        low,
        high,
        x: low > high ? at.x : Math.min(Math.max(at.x, low), high),
        y: Math.max(at.y, MARK_GAP + tall),
        on: anchor.on,
      };
    });

    /**
     * Two chips at neighbouring objects can want the same pixels, and at the
     * junction two of them do.
     *
     * Measured at 1440x900: the anchors for 01 and 02 are 191 still pixels
     * apart, which is 172 on screen, and the two chips are 208 and 245 wide.
     * They overlap by about 50px with their type on the same line, which reads
     * as one broken label rather than two. The old scene solved it by moving
     * the objects on their lanes; the objects are baked into the render now,
     * so the layout has to solve it here.
     *
     * A chip is therefore lifted clear of the ones already placed to its left,
     * by its own height at a time, up to twice. Lifting rather than shifting
     * sideways, because sideways is the axis that says WHICH object this
     * names: a chip 50px to the left of its anchor is standing at its
     * neighbour, while a chip a line higher is standing at the same object
     * from a little further up. The lift also passes the drop test below by
     * construction, which only refuses a chip that has been pushed DOWN and
     * away from its object.
     *
     * Two lifts and no more, because the third would be so far above the
     * object that it names nothing. A chip that is still overlapping after
     * them is dropped instead: a missing label is a label a reader can live
     * without, and two labels on top of each other is the failure this whole
     * pass exists to prevent. It should never happen, one lift clears every
     * viewport measured, and the browser suite's clash test is the alarm if a
     * longer name in some future language makes it happen anyway.
     */
    const clashes = (chip: (typeof chips)[number], before: number) =>
      chips.some(
        (other, j) =>
          j < before &&
          other.on &&
          Math.abs(chip.x - other.x) < chip.w + other.w &&
          Math.abs(chip.y - other.y) < tall,
      );

    for (let i = 0; i < chips.length; i += 1) {
      const chip = chips[i];
      if (!chip || !chip.on) continue;
      for (let attempt = 0; attempt < 2 && clashes(chip, i); attempt += 1) {
        chip.y = Math.max(chip.y - (tall + 4), MARK_GAP + tall);
      }
      if (clashes(chip, i)) chip.on = false;
    }

    for (let i = 0; i < chips.length; i += 1) {
      const el = markRefs.current[i];
      const chip = chips[i];
      if (!el || !chip) continue;
      const { at, w, low, high, x, y, on } = chip;
      // Rounded, because a label is type and a half pixel of it is a blurred
      // glyph. The object underneath is free to sit wherever it likes.
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      el.dataset.on = String(
        on &&
          low <= high &&
          Math.abs(x - at.x) <= w * 0.5 &&
          y - at.y <= tall * 0.5 &&
          y <= stageH - MARK_GAP,
      );
    }
  }, [still]);

  /**
   * The measure, and the one transform it writes.
   *
   * It reaches the labels through a ref rather than depending on `place`
   * directly: `place` is rebuilt whenever the shown still changes, which is
   * every hover, and this effect owns the resize listener. Tearing that down
   * and building it again to follow a pointer would be churn for nothing.
   */
  const placeRef = useRef(place);

  useEffect(() => {
    if (!enhanced) return;
    const stage = stageRef.current;
    const copy = copyRef.current;
    if (!stage || !copy) return;

    const measure = () => {
      const box = stage.getBoundingClientRect();
      const panel = copy.getBoundingClientRect();
      const boxes = markRefs.current.map((el) => el?.firstElementChild?.getBoundingClientRect());
      metrics.current = {
        reserve: panel.right - box.left,
        stageW: box.width,
        stageH: box.height,
        half: boxes.map((b) => (b?.width ?? 0) / 2),
        tall: boxes[0]?.height ?? 0,
      };
      // One transform for all five stills, because all five are the same
      // camera at the same size: the stack is a fixed 808x998 box with the
      // pictures stretched over it, so placing the box places every frame of
      // the crossfade at once and a fade can never be two pictures at two
      // different scales.
      const stack = stackRef.current;
      if (stack) {
        const { s, ox, oy } = fit(metrics.current.reserve, box.width, box.height);
        stack.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${s})`;
      }
      placeRef.current();
    };

    measure();
    // Again once the web fonts have landed. Measured before they do, every
    // label is a fallback-face width and every one of them is wrong.
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
    // `pinned` is in here because pinning changes the stage from the section's
    // own height to 100svh, and `lang` and `ordered` because the names in the
    // chips are what `half` and `tall` measure.
  }, [enhanced, ordered, lang, pinned]);

  // The labels follow the shown still. Declared after the measure so that on
  // mount the metrics are filled before the first placement.
  useEffect(() => {
    placeRef.current = place;
    if (enhanced) place();
  }, [place, enhanced]);

  /**
   * The reveal: the world fades up, once, when the section first comes into
   * view. Not on mount, which can happen four viewports before the reader
   * arrives. A fifth of the stage on screen is enough to be looking at it.
   */
  useEffect(() => {
    if (!enhanced || revealed) return;
    const stage = stageRef.current;
    if (!stage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setRevealed(true);
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(stage);
    return () => io.disconnect();
  }, [enhanced, revealed]);

  /**
   * The track's input. The section's top scrolls above the viewport's top by
   * `y`; the band it is in selects the way. Read on scroll and on resize,
   * passive, and only while pinned: unpinned, the track's way stays -1 and the
   * section behaves as it did before the track, which is hover-driven and its
   * own height.
   */
  useEffect(() => {
    if (!pinned) {
      setScrollWayNow(-1);
      return;
    }
    const section = sectionRef.current;
    if (!section) return;
    const read = () => {
      const band = (window.innerHeight * BAND_SVH) / 100;
      // One pixel of tolerance, and it is load bearing. The section's top is a
      // fractional page offset (1557.09px at 1440x900 in the German build) and
      // the browser can only scroll to a whole pixel, so a stop the snap has
      // just landed on sits a tenth of a pixel short of its own band boundary
      // and every stop would select the way before it. A pixel either way is
      // nothing to a reader and is the difference between a stop meaning what
      // it looks like it means and being one route behind all the way down.
      setScrollWayNow(scrollWay(1 - section.getBoundingClientRect().top, band));
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [pinned]);

  return (
    <section
      id="services"
      ref={sectionRef}
      data-enhanced={enhanced}
      data-pinned={pinned}
      data-revealed={revealed}
      data-still={still}
      // overflow-CLIP, not the overflow-hidden every other ink section carries.
      // An element with a hidden overflow is a scroll container, and a sticky
      // child sticks to the nearest one: the stage would stick to a box that
      // never scrolls, which is to say it would not stick at all. Measured on
      // this page by swapping the two classes at the third stop: clipped, the
      // stage holds at 0; hidden, it is 543px up the viewport and gone, with a
      // viewport and a half of empty ink where it was. `clip` clips without
      // making a scroll container, so the pinned stage sticks to the viewport
      // and the section still keeps its own paint inside itself.
      className="grain relative isolate overflow-clip bg-ink text-ink-fg"
    >
      {/* The wash and the grain belong to the fallback, where this section is
          ink carrying text. With the world up they are the thing that made the
          picture read as a video embedded in a slide: a flat fogged rectangle
          with a different dark either side of it. The stills ARE the ink, so
          they run to the viewport edges and nothing is layered over them. */}
      {enhanced ? null : <div aria-hidden="true" className="ink-aurora -z-10" />}

      {/* The track is the runway and the stage sticks INSIDE it. Unpinned it
          is an ordinary box of the section's own height and the stops are not
          rendered at all, so nothing about it costs a reader who never gets
          the track anything. */}
      <div className="crossroads-track">
        <div
          ref={stageRef}
          className="crossroads-stage"
          // Leaving the stage lets go of the row, wherever the pointer left
          // from: a chip, a row, or the ink between them. The panel and the
          // chips are both inside the stage, so sweeping from one to the other
          // does not fire this, and every row and chip sets the focus again on
          // the way in.
          onMouseLeave={() => setFocus(-1)}
        >
          {/* The world: five renders of the same place, one showing. The stack
              is one box at the render's own size that the measure above scales
              and moves as a whole, so the pictures need no geometry of their
              own and a crossfade is two opacities and nothing else.

              The size is inline rather than in globals.css because STILL comes
              out of the render: the emitter writes stills.ts from the same pass
              that produced the pictures and the anchors, so the box, the images
              and the label positions are one measurement. In the stylesheet it
              would be a second, typed copy of it, and fit() below already reads
              the generated one.

              Plain <img> and the rule turned off for it, rather than
              next/image: the export has no optimiser (images.unoptimized is
              set in next.config.mjs), so <Image> would emit this same tag
              inside a wrapper with sizing of its own, and the sizing here is
              one transform on the box around all five. */}
          {enhanced ? (
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
                  data-on={still === key}
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
          ) : null}

          {/* py-16 rather than the section rhythm, because this section's height
              is what the panel has to fit inside a laptop viewport with, and the
              two columns of rhythm padding were 20% of it. Pinned, globals.css
              takes it down again: the panel then has to fit inside 100svh. */}
          <div className="crossroads-layout relative mx-auto max-w-container px-6 py-16 md:px-8">
            {/* The price board, which is also this section's fallback, which is
                also the only copy of these four rows anywhere on the homepage.
                On ink it is a panel standing on the left of the world rather
                than a column beside a box, and the world is placed into what is
                left of the stage: see the note above .crossroads-copy for what
                its glass is now doing and what it is not. */}
            <div ref={copyRef} className="crossroads-copy lg:max-w-[30rem]">
              <Eyebrow onInk>{eyebrow}</Eyebrow>
              <h2 className={`${RHYTHM.heading} text-h2`}>{title}</h2>
              <p className={`${RHYTHM.lead} max-w-measure text-ink-muted`}>{lead}</p>

              {/* The place, once, for everyone who never sees it change.

                  Rendered from the same Blender scene as the five stills by
                  tools/blender/emit-stills.mjs rather than drawn, so it cannot
                  end up describing a world the site stopped having, and 29 kB
                  of WebP for the upright crop or 53 for the wide one against
                  the 217 kB the five stills weigh at 1x.
                  Rendered only in the fallback, so a laptop that gets the real
                  thing never fetches it. The wide picture used to be a 1600x516
                  band across the fan, which at 327px wide was 105px tall and
                  read as a dark banner rather than a place. On the K the four
                  objects stand at the ends of the letter and span the whole
                  1000px frame, so the wide picture is the whole render, 1.6 to
                  1, and at 327px it is 204px tall. */}
              {enhanced ? null : (
                <picture>
                  {/* One render in two shapes, chosen by width. The wide one
                      is the whole 1600x1000 frame, the letter with a way at
                      each of its four ends. The upright crop is 880x657 of the
                      same frame, the two monitors at the top of the K, which
                      is what a phone can still make anything of: the same
                      objects arrive about three times as wide there as they do
                      in the picture beside the copy.

                      <source> rather than two <img>s, so the browser fetches one
                      file and not both, and the alt text belongs to the <img>
                      because the two crops show different things: four ways in
                      one, two in the other. */}
                  <source media="(min-width: 40rem)" srcSet={asset('/crossroads.webp')} />
                  <img
                    src={asset('/crossroads-phone.webp')}
                    alt={phoneCrop ? scenePhoneAlt : sceneAlt}
                    width={880}
                    height={657}
                    loading="lazy"
                    decoding="async"
                    className="mt-6 w-full rounded-md border border-ink-line"
                  />
                </picture>
              )}

              {/* Four rows, every detail open, every row a link.

                  The old board opened one row's detail at a time, on the row
                  the camera was standing at, so at the two positions a normal
                  scroll lands on nothing was open at all and a laptop got less
                  than a phone. Nothing collapses now. And each row goes to its
                  own card on the services page, because four objects and four
                  services with nothing to click was the strangest thing about
                  the section. */}
              <ol
                ref={listRef}
                className="crossroads-ways mt-8 divide-y divide-ink-line border-y border-ink-line"
                onMouseLeave={() => setFocus(-1)}
                onBlur={(e) => {
                  // Tabbing from one row to the next fires blur before focus.
                  // Only a departure from the list as a whole hands the picture
                  // back to the track.
                  if (!listRef.current?.contains(e.relatedTarget as Node | null)) setFocus(-1);
                }}
              >
                {ordered.map((way, i) => (
                  <li key={way.key} data-key={way.key} data-focus={aim === i || hinted === i}>
                    <Link
                      href={`${servicesPath}#${way.key}`}
                      className="crossroads-way"
                      ref={(el) => {
                        rowRefs.current[i] = el;
                      }}
                      onMouseEnter={() => setFocus(i)}
                      onFocus={() => setFocus(i)}
                    >
                      {/* text-lead rather than the h3 size: four of these in a
                          panel that has to fit a laptop viewport, and the
                          name's job is to be found, not to headline. The number
                          is inside the heading rather than in a column of its
                          own, because a column costs the name the width it
                          needs to stay on one line, and it is hidden from the
                          accessibility tree because the list is already
                          numbered. */}
                      <h3 className="crossroads-way-name text-lead">
                        <span
                          aria-hidden="true"
                          className="crossroads-way-no font-mono text-eyebrow text-ink-accent"
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {way.name}
                      </h3>
                      <span className="crossroads-way-price font-display text-lead font-medium text-ink-accent">
                        <span className="font-sans text-small font-normal text-ink-muted">
                          {fromLabel}{' '}
                        </span>
                        {way.price}
                      </span>
                      <span className="crossroads-way-detail text-small text-ink-muted">
                        {way.forWhom}
                      </span>
                      <span className="crossroads-way-note text-small text-ink-muted">
                        {way.priceNote}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              {/* The affordance, and it is one line because one line is what was
                  missing. The world follows the row under the pointer, every
                  row is a link, and nothing on the page said so: no caption, no
                  cursor note, and a hover fill that only arrives once the
                  pointer is already on a row. So the shot the whole section
                  exists for was one almost nobody saw. .crossroads-hint hides it
                  wherever the stills do not mount. */}
              <p className="crossroads-hint mt-6 items-center gap-2 text-small text-ink-faint">
                <span aria-hidden="true">↖</span>
                {hint}
              </p>

              {/* crossroads-more so the pinned rule can reach this margin:
                  globals.css takes both this and the hint's down to 1rem
                  inside a pinned stage, where the panel is fitting under the
                  header capsule. */}
              <div className="crossroads-more mt-6">
                <ArrowLink onInk href={link.href}>
                  {link.label}
                </ArrowLink>
              </div>
            </div>
          </div>

          {/* The names, standing at the things they name.
              aria-hidden, and that is the whole i18n and accessibility story
              in one attribute: every one of these four strings is the same
              `way.name` the row above already carries, so a screen reader
              hears it once and a search engine indexes it once. What this
              layer adds is the bond a list beside a picture could not make.

              On the junction the chips are live, which is what all four
              objects being on screen at once finally allows: pointing at a
              name lights that row and the chip itself, and clicking it opens
              the row, through the row's own link rather than a second one.
              Pointing leaves the picture alone, on the ruling of 2 September:
              see the note on `hinted` above. On a close-up the one chip
              showing is chrome, and globals.css hands out the pointer events
              on the junction only. */}
          {enhanced ? (
            <div aria-hidden="true" className="crossroads-marks">
              {ordered.map((way, i) => (
                <div
                  key={way.key}
                  data-on="false"
                  ref={(el) => {
                    markRefs.current[i] = el;
                  }}
                  className="crossroads-mark"
                >
                  <span
                    className="crossroads-mark-box"
                    data-focus={aim === i || hinted === i}
                    onMouseEnter={() => setHinted(i)}
                    onMouseLeave={() => setHinted(-1)}
                    onClick={() => rowRefs.current[i]?.click()}
                  >
                    <span className="crossroads-mark-no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="crossroads-mark-name">{way.name}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* The five stops the root snaps to while the section is pinned: the
            junction and the four ways, one band apart. 1px, invisible, and
            only rendered pinned, so an unpinned page carries no snap targets
            at all. The band is BAND_SVH and the track's own height is the same
            number times five in globals.css. */}
        {pinned
          ? [0, 1, 2, 3, 4].map((k) => (
              <div
                key={k}
                aria-hidden="true"
                className="crossroads-stop"
                style={{ top: `${k * BAND_SVH}svh` }}
              />
            ))
          : null}
      </div>
    </section>
  );
}
