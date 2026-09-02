'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { ArrowLink, Eyebrow, RHYTHM } from '@/components/ui';
import { asset } from '@/lib/base-path';
import type { Lang } from '@/lib/routes';

import { LiveWorld } from './live-world';
import type { Metrics } from './marks';
import { StillsWorld } from './stills-world';
import { BAND_SVH, nearestStop, scrollT } from './track';
import type { ServiceKey, Way } from './types';

/**
 * The order the four ways stand in, left to right, in every language.
 *
 * The content files do not agree on this: de.ts lists the services in the
 * order they are priced, en.ts leads with developer capacity. That is each
 * language's own editorial call and the services page keeps it. Neither world
 * can: the scene's four bodies stand on the four strokes of the K in this
 * order and boot() refuses any other (see SCENE_ORDER in scene-manifest.ts),
 * and each still was rendered with the four objects on their own lanes in the
 * same one. Fed a different order the rows would point at the wrong lanes and
 * the labels would stand at somebody else's object.
 *
 * So the crossroads sorts, and the column beside it sorts with it, because
 * the rows, the lanes and the labels are the same four things in the same
 * order.
 */
const ORDER: ServiceKey[] = ['website', 'app', 'capacity', 'care'];

const inOrder = (ways: readonly Way[]): Way[] =>
  ORDER.map((key) => ways.find((w) => w.key === key)).filter((w): w is Way => w !== undefined);

/**
 * The room a world needs, as one query. Width only.
 *
 * 64rem is Tailwind's `lg`, which is where the copy becomes a panel standing
 * on the left of the world rather than the whole width of the section. Below
 * it the panel would cover the picture, so there is no picture and the price
 * board carries the section on its own.
 *
 * There used to be a height half: `(min-height: 46rem)`, because the section
 * was a stage fixed at 100svh with the panel inside it, and on a 1366x768
 * laptop the panel was taller than the stage and clipped a price. Height is
 * PIN's question now, and it answers it differently: a short laptop gets a
 * world like any other, it just does not get the track.
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
 * A reader who has asked their system for less movement.
 *
 * Not a refusal any more, and it has been both. The August scene answered it
 * by not mounting, on the grounds that the answer to "do not move things" is
 * not to move them; the stills answered it with a cut between two pictures.
 * The live scene answers it by standing still: scene.ts takes `reduced` and
 * cuts between stops instead of gliding, holds the parallax at rest and never
 * lights the floor under the hand. So this reader gets the same place as
 * everybody else, without the travel.
 */
const CALM = '(prefers-reduced-motion: reduce)';

/** Which picture this visitor gets, if any. */
type World = 'board' | 'stills' | 'live';

/** What data-stop carries: the junction, or the way the section is standing at. */
type StopKey = 'junction' | ServiceKey;

/**
 * Whether this browser can make a WebGL context, asked once.
 *
 * Once, and the cache is the point rather than a saving. A context is a
 * scarce resource: a browser caps how many one page may hold at a time and
 * drops the oldest when it is reached. worldFor() below runs on every ROOM,
 * PIN and STRIP change, which is every frame of a window drag, so probing
 * each time would spend the whole allowance in a second and take the scene's
 * own context with it.
 *
 * The probe hands its context straight back through WEBGL_lose_context where
 * the browser offers the extension, so what is left after this is an answer
 * and not a live context.
 */
let webgl: boolean | undefined;

function hasWebGL(): boolean {
  if (webgl !== undefined) return webgl;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    webgl = gl !== null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

/**
 * Whether this visitor gets a world, and which.
 *
 * Room first, as before: under 64rem the panel would cover the picture, so
 * there is no picture. With room, a browser that can make a WebGL context
 * gets the live scene and one that cannot gets the stills, which need no
 * context at all. Probed on the client, and re-decided when ROOM flips.
 */
function worldFor(): World {
  if (typeof window === 'undefined' || !window.matchMedia(ROOM).matches) return 'board';
  return hasWebGL() ? 'live' : 'stills';
}

/**
 * The track's position, published to the world without a re-render: the
 * scroll fires sixty times a second and a React state for it would render
 * the panel, the rows and the chips on every notch to move a camera.
 */
export type TrackRef = {
  /** The last published position. */
  t: number;
  publish(t: number): void;
  /** Returns the unsubscribe. The listener is called at once with the current position. */
  subscribe(listener: (t: number) => void): () => void;
};

function createTrack(): TrackRef {
  const listeners = new Set<(t: number) => void>();
  const track: TrackRef = {
    t: 0,
    publish(t) {
      if (t === track.t) return;
      track.t = t;
      for (const fn of listeners) fn(t);
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(track.t);
      return () => listeners.delete(fn);
    },
  };
  return track;
}

/**
 * Everything a world is handed, and the whole of it.
 *
 * The split is one sentence: the shell owns the section and a world owns its
 * picture. So a world is given the state it must draw against and the elements
 * it must draw into, and it hands back only the two things a picture can tell
 * the section that the section could not work out for itself, which is what is
 * under the pointer and whether the picture started at all. Nothing here is a
 * setter: a world never writes the section's own attributes.
 */
export type WorldProps = {
  lang: Lang;
  ordered: readonly Way[];
  focus: number;
  /** The track's position, published without a re-render. */
  track: TrackRef;
  reduced: boolean;
  revealed: boolean;
  pinned: boolean;
  metrics: RefObject<Metrics>;
  sectionRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  copyRef: RefObject<HTMLDivElement | null>;
  markRefs: RefObject<(HTMLDivElement | null)[]>;
  /**
   * Where a world leaves its own placement pass, so the shell's measure can
   * call it.
   *
   * Both worlds place the chips from `metrics`, and the metrics are measured
   * here: on mount, on resize and again when the web fonts land, because a
   * chip's width is a font metric. A world therefore has to be told when they
   * moved, and it cannot listen for it itself: React runs a child's effects
   * before its parent's, so a world binding its own resize handler would read
   * the numbers a frame before the shell rewrote them and place every chip
   * against the previous shape of the stage.
   */
  placeRef: RefObject<() => void>;
  /** A pointer on an object or a chip lights that row, and nothing else. -1 clears it. */
  onHint(way: number): void;
  /** A click on an object opens its row. */
  onOpen(way: number): void;
  onFail(error: unknown): void;
};

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
   * That the rows do anything. Rendered only where a world mounts, because
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
  const copyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  /**
   * The four labels standing at the four objects.
   *
   * Held as DOM nodes and never as state. A label's position is one transform
   * and nothing else, and routing four pixel positions through React would
   * re-render this whole section to move a chip. In the live world that
   * happens sixty times a second.
   */
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);
  /**
   * The four rows, so a chip or an object can open the one it names.
   *
   * A chip is not a second link: two anchors with the same href and the same
   * text would be two entries in a screen reader's link list for one
   * destination, and the marks layer is aria-hidden precisely so that does not
   * happen. Clicking the row is the whole of what a chip does.
   */
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const [world, setWorld] = useState<World>('board');
  /**
   * Whether the poster is showing the upright crop rather than the strip.
   *
   * Only the alt text depends on it: <picture> picks the file on its own, and
   * it cannot pick an alt. Starts false so the first render matches the static
   * HTML, and is corrected in an effect, the same shape as `world`.
   */
  const [phoneCrop, setPhoneCrop] = useState(false);
  /** The row under the pointer or holding keyboard focus, or -1 for none. */
  const [focus, setFocus] = useState(-1);
  /**
   * The chip or the object under the pointer, or -1 for none. Called `hinted`
   * and not `hint` because the prop of that name is the affordance line under
   * the board.
   *
   * A second, weaker input than `focus`, and the difference is the whole of
   * what a chip does on the way in: it lights its own row and itself, and it
   * leaves the camera alone. Pointing at a chip used to set the aim, which
   * moved the picture to that way's close-up, where the chip's own object is
   * somewhere else entirely: the control moved out from under the pointer that
   * touched it. Clicking still opens the row, which is what a chip is for.
   *
   * An object in the live world is the same weak input for the same reason
   * (spec section 2): the reader is exploring the place with the pointer, and
   * a camera that flew to whatever the hand happened to brush would never let
   * them look at anything.
   */
  const [hinted, setHinted] = useState(-1);
  /** Whether the track is running: ROOM and a viewport tall enough for PIN. */
  const [pinned, setPinned] = useState(false);
  /** The way the track has scrolled to, or -1 for the junction. */
  const [scrollWayNow, setScrollWayNow] = useState(-1);
  /**
   * Whether the section has been looked at. The world fades in on the way in,
   * so a reader arriving sees it appear rather than already there.
   */
  const [revealed, setRevealed] = useState(false);
  /** Whether this reader has asked for less movement. See CALM above. */
  const [reduced, setReduced] = useState(false);

  const enhanced = world !== 'board';

  // Sorted once, and everything downstream reads this: the scene's four
  // bodies, the rows, the labels and the numbering. The prop's own order is
  // never used.
  const ordered = useMemo(() => inOrder(ways), [ways]);

  /**
   * The track's position, one object for the life of the section.
   *
   * Lazily, so it is built on the first render and never again: `useRef(
   * createTrack())` would allocate a Set and an object on every render only to
   * throw both away, and a world holding a subscription to a track the shell
   * has replaced would hear nothing.
   */
  const trackRef = useRef<TrackRef | null>(null);
  const track = (trackRef.current ??= createTrack());

  /**
   * Set once the live world has failed to boot, and never cleared.
   *
   * Without it the drop to the stills would last until the next resize:
   * `decide()` below re-asks worldFor(), which still says `live` because the
   * browser still has WebGL, and the section would try the same failing boot
   * again on every notch of a window drag. What failed was the place, not the
   * browser, and nothing about dragging a window fixes a missing asset.
   */
  const sceneFailed = useRef(false);

  /**
   * Two inputs, one aim. The pointer's or the keyboard's way wins while it is
   * on one; otherwise the track's. Letting go of a row therefore returns the
   * picture to the route the scroll is on, not to the junction, and scrolling
   * walks the highlight down the board.
   */
  const aim = focus >= 0 ? focus : scrollWayNow;
  /** Where the section is standing. It carries it as data-stop for both worlds. */
  const stop: StopKey = (aim >= 0 ? ORDER[aim] : undefined) ?? 'junction';

  // Decided on the client and re-decided when ROOM, PIN or CALM flips, because
  // rotating a tablet, dragging a window or changing a system setting crosses
  // those lines in both directions. Watching the queries themselves rather
  // than a second copy of them is the point: the two cannot be given
  // different numbers.
  useEffect(() => {
    const room = window.matchMedia(ROOM);
    const pin = window.matchMedia(PIN);
    const strip = window.matchMedia(STRIP);
    const calm = window.matchMedia(CALM);
    const decide = () => {
      const next = worldFor();
      setWorld(next === 'live' && sceneFailed.current ? 'stills' : next);
      setPinned(next !== 'board' && pin.matches);
      setPhoneCrop(!strip.matches);
      setReduced(calm.matches);
    };
    decide();
    room.addEventListener('change', decide);
    pin.addEventListener('change', decide);
    strip.addEventListener('change', decide);
    calm.addEventListener('change', decide);
    return () => {
      room.removeEventListener('change', decide);
      pin.removeEventListener('change', decide);
      strip.removeEventListener('change', decide);
      calm.removeEventListener('change', decide);
    };
  }, []);

  /**
   * Everything about this section that is measured in CSS pixels rather than
   * computed: the panel's edges, the stage's box, and how big each of the four
   * labels actually is.
   *
   * One measurement rather than three, taken on mount, once more when the web
   * fonts have landed, and on resize. Nothing here runs on a hover or on a
   * frame: a world places its chips against these numbers and reads them, so
   * the live world's sixty placements a second cost no layout at all.
   *
   * The label widths are the part that has to be here. A label is a box of
   * text and its width is a font metric: measured at 1440 in German, the chip
   * for "02 Individuelle Web-Anwendung" is 245px and "04 Betrieb & Wartung"
   * 170, the name set in the body face (Inter) at 14px and the number beside
   * it in the mono face at 11px, and nothing in either world knows either. An
   * anchor says where an object is, not how wide its name will be in this
   * reader's browser.
   */
  const metrics = useRef<Metrics>({ reserve: 0, stageW: 0, stageH: 0, half: [], tall: 0 });

  /**
   * The world's own placement pass, so the measure below can call it.
   *
   * A ref rather than a dependency, because the pass is rebuilt whenever the
   * world's picture changes, which in the stills world is every hover and in
   * the live world every render, and this effect owns the resize listener.
   * Tearing that down and building it again to follow a pointer would be churn
   * for nothing.
   */
  const placeRef = useRef<() => void>(() => undefined);

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
      placeRef.current();
    };

    measure();
    // Again once the web fonts have landed. Measured before they do, every
    // label is a fallback-face width and every one of them is wrong.
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
    // `pinned` is in here because pinning changes the stage from the section's
    // own height to 100svh, `world` because the two worlds put different
    // things in the stage, and `lang` and `ordered` because the names in the
    // chips are what `half` and `tall` measure.
  }, [enhanced, world, ordered, lang, pinned]);

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
   * `y`; where that falls along the flight selects the way. Read on scroll and
   * on resize, passive, and only while pinned: unpinned, the track's position
   * stays 0 and its way -1, and the section behaves as it did before the
   * track, which is hover-driven and its own height.
   *
   * Two things come out of one reading, and that is the whole reason `scrollT`
   * exists: the row and the chips take the NEAREST STOP, which is a number
   * that changes four times in the whole ride and belongs in React, and the
   * camera takes the CONTINUOUS position, which changes on every notch and is
   * published straight to the world. Read separately they could disagree about
   * where the reader is standing.
   */
  useEffect(() => {
    if (!pinned) {
      setScrollWayNow(-1);
      track.publish(0);
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
      const t = scrollT(1 - section.getBoundingClientRect().top, band);
      setScrollWayNow(nearestStop(t) - 1);
      track.publish(t);
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [pinned, track]);

  /** A chip or an object under the pointer lights its row, and moves nothing. */
  const onHint = useCallback((way: number) => setHinted(way), []);
  /**
   * Opening a way goes through the row's own anchor, so Next handles the
   * navigation and nothing about routing is written twice.
   */
  const onOpen = useCallback((way: number) => rowRefs.current[way]?.click(), []);
  /**
   * A world that will not start is not worth telling a visitor about: the
   * stills say everything the scene would, and under them the price board
   * says it again. The warning is for whoever is looking at a console.
   */
  const onFail = useCallback((error: unknown) => {
    sceneFailed.current = true;
    setWorld((current) => (current === 'live' ? 'stills' : current));
    console.warn('crossroads: the scene did not start', error);
  }, []);

  const worldProps: WorldProps = {
    lang,
    ordered,
    focus,
    track,
    reduced,
    revealed,
    pinned,
    metrics,
    sectionRef,
    stageRef,
    copyRef,
    markRefs,
    placeRef,
    onHint,
    onOpen,
    onFail,
  };

  return (
    <section
      id="services"
      ref={sectionRef}
      data-enhanced={enhanced}
      data-world={world === 'board' ? undefined : world}
      data-pinned={pinned}
      data-revealed={revealed}
      data-stop={stop}
      data-reduced={reduced}
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
          ink carrying text. With a world up they are the thing that made the
          picture read as a video embedded in a slide: a flat fogged rectangle
          with a different dark either side of it. Both worlds ARE the ink, so
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
          {/* The world, and which one is the only thing this section decides
              about it. A live scene where the browser can make a context, the
              five renders where it cannot, and nothing at all where the panel
              would be standing on the picture.

              One at a time, and the shell owns everything either would
              otherwise have to agree with the other about: the section's
              attributes, the panel, the rows, the chips' markup, the stops and
              the metrics they are all placed against. What a world owns is its
              own picture and where the four chips go in it. */}
          {world === 'live' ? <LiveWorld {...worldProps} /> : null}
          {world === 'stills' ? <StillsWorld {...worldProps} /> : null}

          {/* py-16 rather than the section rhythm, because this section's height
              is what the panel has to fit inside a laptop viewport with, and the
              two columns of rhythm padding were 20% of it. Pinned, globals.css
              takes it down again: the panel then has to fit inside 100svh. */}
          <div className="crossroads-layout relative mx-auto max-w-container px-6 py-16 md:px-8">
            {/* The price board, which is also this section's fallback, which is
                also the only copy of these four rows anywhere on the homepage.
                On ink it is a panel standing on the left of the world rather
                than a column beside a box, and the world is composed into what
                is left of the stage: see the note above .crossroads-copy for
                what its glass is now doing and what it is not. */}
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
                  wherever no world mounts. */}
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

              The markup is the shell's and the positions are the world's:
              stills-world.tsx maps the render's own anchors through the
              contain transform, live-world.tsx takes them from the camera on
              every frame, and both hand the same four candidates to the same
              rules in marks.ts. So a chip behaves identically whichever
              picture is behind it, which is what lets a reader who was handed
              the stills after a failed boot notice nothing.

              Pointing at a name lights that row and the chip itself, and
              clicking it opens the row, through the row's own link rather than
              a second one. Pointing leaves the picture alone, on the ruling of
              2 September: see the note on `hinted` above. globals.css hands
              out the pointer events, on the junction in the stills world and
              everywhere in the live one. */}
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
