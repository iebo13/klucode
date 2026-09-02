'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { asset } from '@/lib/base-path';

import type { WorldProps } from './index';
import { applyMarks, placeMarks, type Candidate } from './marks';
import type { Handle } from './scene';
import { shownWays } from './track';

/**
 * The place in real time, for a browser that can make a WebGL context.
 *
 * Everything about three.js is on the other side of one dynamic import. This
 * file holds a canvas, a promise and seven effects, and its whole job is to
 * keep a `Handle` in step with what the section around it knows: where the
 * track stands, which row is lit, whether the section has been looked at, what
 * colour the page is painted and where the hand is. Nothing here imports the
 * renderer, so nothing here ships to the phone that never mounts it.
 *
 * The two things it hands back are the two the shell could not work out: what
 * is under the pointer, which only the scene can answer, and whether the place
 * arrived at all, which is what drops the section to the stills.
 */

/**
 * What the browser suite looks for to know a real scene is on the page.
 *
 * On the canvas rather than on the section, because the section exists in
 * every world and this must not be true in any of the others.
 */
const SCENE_MARKER = 'kc-crossroads';

/**
 * The section's resolved background colour, for the scene to stand in.
 *
 * Read off the ELEMENT rather than off the custom property. getComputedStyle
 * returns a custom property as the token it was written as, so asking for
 * --kc-inkSurface hands back the literal string `var(--kc-stone-975)`, which
 * THREE.Color parses as black. Asking for `background-color` on something that
 * uses it returns the resolved `rgb(...)`.
 */
function groundOf(section: HTMLElement): string {
  return getComputedStyle(section).backgroundColor;
}

export function LiveWorld({
  lang,
  ordered,
  focus,
  track,
  reduced,
  revealed,
  metrics,
  sectionRef,
  stageRef,
  copyRef,
  markRefs,
  placeRef,
  onHint,
  onOpen,
  onFail,
}: WorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<Handle | null>(null);
  /**
   * Whether the place is up.
   *
   * The one piece of state this component has, and it exists to re-run the
   * four effects below rather than to draw anything: they are written against
   * a handle that arrives some hundreds of milliseconds after they first run,
   * and carrying `ready` in their dependencies is what replays the aim, the
   * track's position, the reveal and the ink against the values the component
   * holds NOW rather than against the ones the boot's closure captured when
   * the load began. A reader who hovered a row while the models were on the
   * wire arrives at that row.
   */
  const [ready, setReady] = useState(false);

  /**
   * The four candidates, allocated once and rewritten in place.
   *
   * This runs on every drawn frame. Everything else on that path already
   * allocates nothing: scene.ts hands back the same Mark array every time and
   * marks.ts is handed these.
   */
  const candidates = useRef<Candidate[]>([]);

  /**
   * Where the four labels belong, read from the frame that has just been
   * drawn.
   *
   * Off the camera rather than off a second measurement, so the chips and the
   * picture can never disagree about where an object is: scene.ts projects
   * each way's anchor with the same matrices it just rendered with. What is
   * left to decide is whether a chip may be SHOWN, which is two questions and
   * neither of them is the camera's. track.ts says which ways this position on
   * the flight names at all (the map names four, a stop names one), and
   * marks.ts says whether the box then fits beside the panel without standing
   * on its neighbour.
   *
   * Every write here is straight to the DOM. data-parked and data-frames are
   * the browser suite's only window into the loop, and putting either through
   * React would render the whole section once per frame to report that it had
   * rendered a frame.
   */
  const paint = useCallback(() => {
    const handle = handleRef.current;
    if (!handle) return;
    const marks = handle.marks();
    const shown = shownWays(track.t, focus);
    const list = candidates.current;
    while (list.length < marks.length) list.push({ x: 0, y: 0, on: false });
    list.length = marks.length;
    for (let i = 0; i < marks.length; i += 1) {
      const mark = marks[i];
      const candidate = list[i];
      if (!mark || !candidate) continue;
      candidate.x = mark.x;
      candidate.y = mark.y;
      candidate.on = mark.front && (shown[i] ?? false);
    }
    applyMarks(placeMarks(list, metrics.current), markRefs.current);
    const section = sectionRef.current;
    if (section) {
      section.dataset.parked = String(handle.parked());
      section.dataset.frames = String(handle.frames());
    }
  }, [focus, track, metrics, markRefs, sectionRef]);

  // Left where the scene's onFrame and the shell's measure can both reach it.
  // No dependency array: the pass closes over `focus`, so the ref has to carry
  // the newest one after every render, and an assignment is cheaper than the
  // comparison that would decide whether to make it.
  useEffect(() => {
    placeRef.current = paint;
  });

  /**
   * The one boot, and the only place in the section that names three.js.
   *
   * The scene and the labels are fetched together and deferred. A static
   * import of either would put them into First Load JS for every visitor,
   * including every phone, which never mounts this component at all: the
   * labels are two mock interfaces in two languages, and the scene is the
   * renderer. Verified by the bundle gate, which fails the build if any script
   * the page references carries three.js.
   *
   * Nothing is told to the scene here. Everything it has to know on the way in
   * arrives through the effects below, each of which carries `ready`: see the
   * note on that state above.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!canvas || !stage || !section) return;

    let cancelled = false;
    let handle: Handle | null = null;

    Promise.all([import('./scene'), import('./labels')])
      .then(([{ boot }, { LABELS }]) =>
        boot(canvas, stage, {
          // The copy panel is standing on the left of the canvas, and the
          // camera composes into what is left of it.
          panel: copyRef.current,
          ways: ordered,
          labels: LABELS[lang],
          // The section's OWN background, resolved. The scene is full bleed
          // and the ink hero lands directly on its first pixel, so the world's
          // ground and --kc-inkSurface have to be the same colour or the page
          // gets a hard line across it at the boundary.
          background: groundOf(section),
          reduced,
          url: asset,
          onFrame: () => placeRef.current(),
        }),
      )
      .then((started) => {
        // A boot that finishes after the component has gone still owns a
        // context, a composer and four loaded models. The cleanup below could
        // not stop it, because at the moment it ran there was nothing to stop.
        if (cancelled) {
          started.stop();
          return;
        }
        handle = started;
        handleRef.current = started;
        canvas.dataset.scene = SCENE_MARKER;
        canvas.dataset.ready = 'true';
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        onFail(error);
      });

    return () => {
      cancelled = true;
      handle?.stop();
      handleRef.current = null;
      // The three attributes this world writes straight onto the section, off
      // again with it: left behind they would tell the suite, and anyone
      // reading the DOM, that a loop that no longer exists is parked.
      delete section.dataset.parked;
      delete section.dataset.frames;
      delete section.dataset.ground;
    };
  }, [lang, ordered, reduced, onFail, placeRef, sectionRef, stageRef, copyRef]);

  /**
   * The camera follows the row. Hover and keyboard focus are the same input,
   * which is what makes the enhanced state reachable without a pointer.
   */
  useEffect(() => {
    handleRef.current?.aim(focus);
  }, [focus, ready]);

  /**
   * The track places the camera, straight from the publisher and never through
   * a render. Subscribing hands the listener the current position at once, so
   * this is also how the scene learns where a reader who arrived mid-track is
   * standing.
   */
  useEffect(() => track.subscribe((t) => handleRef.current?.scroll(t)), [track, ready]);

  /** The section has been looked at. The scene owes it a frame. */
  useEffect(() => {
    if (revealed) handleRef.current?.reveal();
  }, [revealed, ready]);

  /**
   * A theme switch repaints the world.
   *
   * The toggle writes data-theme onto <html>, which is a CSS-only change
   * everywhere else on the site and cannot be one here: three.js holds its own
   * copy of the background, and the fog holds the same object. Without this
   * the scene keeps the ground it booted with and the seam under the hero
   * comes back the moment a reader presses the control in the header.
   *
   * data-ground is the same colour written where a test can read it, which is
   * the only way to ask from outside what ink the renderer is standing in.
   */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const repaint = () => {
      const colour = groundOf(section);
      handleRef.current?.setBackground(colour);
      section.dataset.ground = colour;
    };
    repaint();
    const observer = new MutationObserver(repaint);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    // And the OS, for a reader who has never touched the toggle: the roles
    // follow prefers-color-scheme, and nothing writes data-theme in that case.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', repaint);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', repaint);
    };
  }, [ready, sectionRef]);

  /**
   * The stage hears the hand. Three listeners, and the canvas itself keeps
   * pointer-events: none and aria-hidden: the stage is the element with a box,
   * and the scene is asked what is under the pointer.
   *
   * The rules for a miss are the whole design, and they are chosen for a
   * pointer that is exploring rather than pointing. A hit lights the row it
   * names and moves nothing else, on the ruling of 2 September: an object and
   * a chip are the same weak input, and a camera that flew to whatever the
   * hand brushed would never let a reader look at anything. A miss puts the
   * light out again, which is right because the row is the only thing that was
   * lit. Leaving the stage resets. And a pointer over the copy panel is handed
   * to nothing, with the scene told to rest, so the stage holds still while
   * the reader is reading.
   *
   * data-hit is written straight onto the element rather than held as state,
   * for the reason the labels are: this runs on every pointer move.
   */
  useEffect(() => {
    const stage = stageRef.current;
    const copy = copyRef.current;
    if (!stage || !copy) return;
    stage.dataset.hit = 'false';

    const overPanel = (target: EventTarget | null) =>
      target instanceof Node && copy.contains(target);
    /**
     * A chip is a control standing in front of the world, and it has already
     * said what it names through its own onMouseEnter. The scene would answer
     * "nothing" for the floor behind it and put that row straight out again on
     * the next pointer move, so the hit and the hint are left to the chip. The
     * parallax and the light are not: the hand is still over the place.
     */
    const overChip = (target: EventTarget | null) =>
      target instanceof Element && target.closest('.crossroads-mark-box') !== null;
    const at = (e: MouseEvent): [number, number] => {
      const box = stage.getBoundingClientRect();
      return [e.clientX - box.left, e.clientY - box.top];
    };

    const move = (e: PointerEvent) => {
      const handle = handleRef.current;
      if (!handle) return;
      if (overPanel(e.target)) {
        handle.pointerLeave();
        stage.dataset.hit = 'false';
        return;
      }
      const [x, y] = at(e);
      const way = handle.pointer(x, y);
      if (overChip(e.target)) return;
      stage.dataset.hit = String(way >= 0);
      onHint(way);
    };
    const leave = () => {
      handleRef.current?.pointerLeave();
      stage.dataset.hit = 'false';
      onHint(-1);
    };
    const click = (e: MouseEvent) => {
      const handle = handleRef.current;
      if (!handle || overPanel(e.target) || overChip(e.target)) return;
      const [x, y] = at(e);
      const way = handle.pointer(x, y);
      if (way >= 0) onOpen(way);
    };

    stage.addEventListener('pointermove', move, { passive: true });
    stage.addEventListener('pointerleave', leave);
    stage.addEventListener('click', click);
    return () => {
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', leave);
      stage.removeEventListener('click', click);
      stage.dataset.hit = 'false';
    };
  }, [onHint, onOpen, stageRef, copyRef]);

  /* One canvas the size of the stage, under the panel and the chips.

     aria-hidden and pointer-events: none, because everything a reader can read
     or click about this section is DOM: the four names are the chips, the four
     destinations are the rows, and the stage above is what hears the hand. The
     canvas is a picture. */
  return <canvas ref={canvasRef} className="crossroads-canvas" aria-hidden="true" />;
}
