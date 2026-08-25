'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ArrowLink, Eyebrow, RHYTHM } from '@/components/ui';
import { asset } from '@/lib/base-path';
import type { Lang } from '@/lib/routes';

import type { Handle, Mark, ServiceKey, Way } from './types';

/**
 * The scene's readiness signal, written onto the canvas immediately before
 * boot() and read by the browser suite.
 *
 * Not a bundle marker, whatever it once was. scripts/check-bundle.mjs
 * deliberately does NOT match on this, and says why at length above its
 * THREE_MARKER: it is a DOM attribute written by this file, this file is a
 * client component, so it lives in the EAGER page chunk. Matching on it
 * measured 2 kB of component and reported that as the deferred budget, which
 * is a gate that cannot fail.
 *
 * Its job is timing. Because it is set on the line before boot(), its presence
 * means there is a handle listening for the hover that follows.
 */
const SCENE_MARKER = 'kc-crossroads';

/**
 * The order the four ways stand in, left to right, in every language.
 *
 * The content files do not agree on this: de.ts lists the services in the
 * order they are priced, en.ts leads with developer capacity. That is each
 * language's own editorial call and the services page keeps it. The scene
 * cannot: the fan is tuned as a set, with the outer lanes longer than the
 * inner two and each camera standoff matched to the lane it stands on. Fed a
 * different order it would frame the wrong objects from the wrong distances.
 *
 * So the crossroads sorts, and the column beside it sorts with it, because
 * the rows, the lanes and the labels are the same four things in the same
 * order.
 */
const ORDER: ServiceKey[] = ['website', 'app', 'capacity', 'care'];

const inOrder = (ways: readonly Way[]): Way[] =>
  ORDER.map((key) => ways.find((w) => w.key === key)).filter((w): w is Way => w !== undefined);

/**
 * The room the scene needs, as one query. Width only.
 *
 * 64rem is Tailwind's `lg`, which is where the copy becomes a panel standing
 * on the left of the world rather than the whole width of the section. Below
 * it the panel would cover the canvas, so there is no canvas.
 *
 * There used to be a height half: `(min-height: 46rem)`, because the section
 * was a stage fixed at 100svh with the panel inside it, and on a 1366x768
 * laptop the panel was taller than the stage and clipped a price. The section
 * is its own height now and grows with the panel, so a short laptop gets the
 * scene like any other. That laptop is the most common Windows viewport there
 * is, and it was getting the fallback.
 */
const ROOM = '(min-width: 64rem)';

/**
 * How much clear space a label needs on every side before it is shown at all.
 *
 * A chip touching the panel's edge or the top of the canvas reads as a
 * rendering fault rather than as a label, and one that is half under the panel
 * reads as a bug. 12px is a hair more than the chip's own corner radius, which
 * is what makes it look placed rather than trapped.
 */
const MARK_GAP = 12;

/**
 * Whether this visitor gets the scene at all.
 *
 * Three ways to say no, and each is an answer rather than a degradation. A
 * reduced-motion request is honoured by not moving anything. A phone gets the
 * price board instead of 148 kB and a warm GPU, on a site whose pitch is that
 * it loads fast. A browser without WebGL was never going to see it.
 */
function canMount(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia(ROOM).matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Crossroads({
  lang,
  eyebrow,
  title,
  lead,
  link,
  servicesPath,
  fromLabel,
  sceneAlt,
  ways,
}: {
  lang: Lang;
  eyebrow: string;
  title: string;
  lead: string;
  link: { href: string; label: string };
  /** The services page, so every row can link to its own card there. */
  servicesPath: string;
  fromLabel: string;
  sceneAlt: string;
  ways: readonly Way[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // The canvas fills the stage, so the two are the same box and the renderer
  // could be sized against either. It is sized against the view, because the
  // view is the element that owns the canvas and a stage that grows a second
  // child one day should not silently re-aspect the scene.
  const viewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  /**
   * The four labels standing at the four objects.
   *
   * Held as DOM nodes and never as state. marks() answers on every drawn frame,
   * and routing four pixel positions through React would re-render this whole
   * section sixty times a second to move a transform.
   */
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** The scene, once it has booted. Read by the hover effect and the observer. */
  const handleRef = useRef<Handle | null>(null);
  /** Whether the section has been on screen, for a reveal that beats the boot. */
  const seenRef = useRef(false);

  const [enhanced, setEnhanced] = useState(false);
  /** The row under the pointer or holding keyboard focus, or -1 for none. */
  const [focus, setFocus] = useState(-1);
  // How many of the four have finished building, as an integer. Reflected onto
  // the section so the browser suite can assert on the reveal without a debug
  // hook shipping to production: it is honest state, it is not announced to a
  // screen reader, and it costs one integer.
  const [built, setBuilt] = useState(0);

  // Sorted once, and everything downstream reads this: the scene, the rows,
  // the labels and the numbering. The prop's own order is never used.
  const ordered = useMemo(() => inOrder(ways), [ways]);

  // Decided on the client and re-decided when ROOM flips, because rotating a
  // tablet or dragging a window crosses that line in both directions. Watching
  // ROOM itself rather than a second copy of the query is the point: the two
  // cannot be given different numbers.
  useEffect(() => {
    const room = window.matchMedia(ROOM);
    const decide = () => setEnhanced(canMount());
    decide();
    room.addEventListener('change', decide);
    return () => room.removeEventListener('change', decide);
  }, []);

  /**
   * Everything about this section that is measured in CSS pixels rather than
   * computed: the panel's edges, the stage's box, and how big each of the four
   * labels actually is.
   *
   * One measurement rather than three, taken on mount and on resize and never
   * on a drawn frame. Reading a bounding box mid-frame forces a layout, and
   * this one would do it four times a frame for the whole time the camera is
   * moving.
   *
   * The label widths are the part that has to be here. A label is a box of
   * text and its width is a font metric: „01 Individuelle Web-Anwendung" is
   * 245px in Schibsted Grotesk at 14px and „04 Betrieb & Wartung" is 170, and
   * the scene has no way to know either. It tried, with the anchor and a
   * padding constant, and a chip slid a third of itself under the copy panel
   * while its anchor was still clear of it.
   */
  const metrics = useRef({ reserve: 0, stageW: 0, stageH: 0, half: [] as number[], tall: 0 });

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
      // Published to CSS as well, so the gutter veil can fade out exactly where
      // the panel begins. The container is 72rem capped and centred, so that
      // edge is 24px in at 1024 and 416px in at 1920: a percentage gradient
      // would be right at one viewport and wrong at the other two.
      stage.style.setProperty('--crossroads-gutter', `${Math.round(panel.left - box.left)}px`);
      stage.style.setProperty('--crossroads-reserve', `${Math.round(panel.right - box.left)}px`);
    };

    measure();
    // Again once the web fonts have landed. Measured before they do, every
    // label is a fallback-face width and every one of them is wrong.
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      stage.style.removeProperty('--crossroads-gutter');
      stage.style.removeProperty('--crossroads-reserve');
    };
  }, [enhanced, ordered, lang]);

  useEffect(() => {
    if (!enhanced) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const view = viewRef.current;
    if (!canvas || !stage || !view) return;

    let cancelled = false;

    /**
     * Moves the four labels, and nothing else touches their transforms.
     *
     * translate3d rather than left/top, so a label move is a compositor
     * transform and never a layout pass: four of these run on every frame the
     * camera is moving.
     */
    const place = (marks: readonly Mark[]) => {
      const { reserve, stageW, stageH, half, tall } = metrics.current;
      for (let i = 0; i < marks.length; i += 1) {
        const el = markRefs.current[i];
        const mark = marks[i];
        if (!el || !mark) continue;
        /**
         * The chip is centred on its anchor and rises from it, so it reaches
         * half its width to either side and its full height up. What has to
         * clear the panel and the canvas is that box, not the anchor.
         *
         * And it is nudged rather than dropped. At the 1024 floor the free
         * region is narrow, the fan fills it, and „01 Website & Landingpage"
         * is 205px wide: at the establishing shot the outer two labels
         * overhang the panel and the right edge by a few pixels. Hiding them
         * there would cost exactly the shot the labels exist for, which is
         * the one where all four objects are on screen and the reader is
         * finding out what they are. A 28px shift on a 205px chip is 14% and
         * reads as placement.
         *
         * Bounded at half the box, because past that the nudge stops meaning
         * „this label, slightly moved" and starts meaning „this label, over
         * somebody else's object". Past it the label is dropped.
         */
        const w = half[i] ?? 0;
        const low = reserve + MARK_GAP + w;
        const high = stageW - MARK_GAP - w;
        const x = low > high ? mark.x : Math.min(Math.max(mark.x, low), high);
        const y = Math.max(mark.y, MARK_GAP + tall);
        // Rounded, because a label is type and a half pixel of it is a blurred
        // glyph. The object underneath is free to sit wherever it likes.
        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        el.dataset.on = String(
          mark.front &&
            low <= high &&
            Math.abs(x - mark.x) <= w * 0.5 &&
            y - mark.y <= tall * 0.5 &&
            y <= stageH - MARK_GAP,
        );
      }
    };

    // The labels are fetched WITH the scene rather than imported statically.
    // index.tsx is a client component, so a static import puts the mock landing
    // page and the mock dashboard, in both languages, into First Load JS for
    // every visitor: including every phone, which never mounts the scene at
    // all. Verified by grepping the built chunks for the mock client's name.
    Promise.all([import('./scene'), import('./labels')])
      .then(([{ boot }, { LABELS }]) => {
        if (cancelled) return;
        canvas.dataset.scene = SCENE_MARKER;
        const handle = boot(canvas, view, ordered, LABELS[lang], {
          // The copy panel is standing on the left of the canvas, and the
          // camera composes into what is left.
          panel: copyRef.current,
          // Read from the frame that was just drawn, not from a second
          // measurement, so the labels and the camera can never disagree
          // about where the objects are.
          onFrame: () => {
            place(handle.marks());
            setBuilt(handle.built());
          },
        });
        handleRef.current = handle;
        // Whatever happened while the scene was loading: a reader who was
        // already looking at the section gets the reveal now rather than
        // never, and one whose pointer is already on a row gets that way.
        if (seenRef.current) handle.reveal();
      })
      .catch((error) => {
        if (cancelled) return;
        // A scene that will not start is not worth telling a visitor about.
        // The price board is standing and says everything the scene would.
        console.warn('crossroads: the scene did not start', error);
        setEnhanced(false);
      });

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [enhanced, ordered, lang]);

  /**
   * The reveal: the four drawings become the four objects, once, when the
   * section first comes into view. Not on boot, which can happen four
   * viewports before the reader arrives, and not on scroll position, which is
   * the coupling this section no longer has. A fifth of the section on screen
   * is enough to be looking at it.
   */
  useEffect(() => {
    if (!enhanced) return;
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seenRef.current = true;
        handleRef.current?.reveal();
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [enhanced]);

  /**
   * The camera follows the row. Hover and keyboard focus are the same input,
   * which is what makes the enhanced state reachable without a pointer: the
   * old one disclosed by scroll position, and a keyboard user could not open
   * a row because rows were not focusable. They are links now.
   */
  useEffect(() => {
    handleRef.current?.aim(focus);
  }, [focus, built]);

  return (
    <section
      id="services"
      ref={sectionRef}
      data-enhanced={enhanced}
      data-built={built}
      className="grain relative isolate overflow-hidden bg-ink text-ink-fg"
    >
      {/* The wash and the grain belong to the fallback, where this section is
          ink carrying text. With the scene up they are the thing that made the
          canvas read as a video embedded in a slide: a flat fogged rectangle
          with a different dark either side of it. The scene IS the ink, so it
          runs to the viewport edges and nothing is layered over it. */}
      {enhanced ? null : <div aria-hidden="true" className="ink-aurora -z-10" />}

      {/* The stage is the section's own height: the canvas is absolutely
          positioned behind the layout and the layout is the panel plus the
          section rhythm. No track, no sticky, no svh. A reader scrolls past
          this like any other section. */}
      <div ref={stageRef} className="crossroads-stage">
        <div ref={viewRef} className="crossroads-view">
          {enhanced ? <canvas ref={canvasRef} aria-hidden="true" /> : null}
        </div>

        {/* The gutter, faded to the scene's own background. See the note
            above .crossroads-veil: the strip between the viewport edge and
            the panel is the one part of a full-bleed frame that no camera
            position can compose, and the neighbouring lane's object stands
            in it. */}
        {enhanced ? <div aria-hidden="true" className="crossroads-veil" /> : null}

        {/* py-16 rather than the section rhythm, because this section's height
            is what the panel has to fit inside a laptop viewport with, and the
            two columns of rhythm padding were 20% of it. */}
        <div className="crossroads-layout relative mx-auto max-w-container px-6 py-16 md:px-8">
          {/* The price board, which is also this section's fallback, which is
              also the only copy of these four rows anywhere on the homepage.
              On ink it is a glass panel over the scene rather than a column
              beside it, and .glass-chip is the material the hero's proof
              chips are already made of: ink with real frequency under it,
              which is the one condition a backdrop blur needs to produce
              anything at all. */}
          <div ref={copyRef} className="crossroads-copy lg:max-w-[30rem]">
            <Eyebrow onInk>{eyebrow}</Eyebrow>
            <h2 className={`${RHYTHM.heading} text-h2`}>{title}</h2>
            <p className={`${RHYTHM.lead} max-w-measure text-ink-muted`}>{lead}</p>

            {/* The place, once, for everyone who never sees it move.

                Rendered from this scene by tools/shoot-poster.mjs rather
                than drawn, so it cannot end up describing a world the site
                stopped having, and 13 kB of WebP against the 148 kB of
                three.js the fallback exists to not download. Rendered only
                in the fallback, so a laptop that gets the real thing never
                fetches it, and not on a phone at all: a 1600x481 strip at
                327px wide is 98px tall, and nothing in it is identifiable at
                that size. It reads as a dark banner, which is worse than no
                picture. */}
            {enhanced ? null : (
              <img
                src={asset('/crossroads.webp')}
                alt={sceneAlt}
                width={1600}
                height={481}
                loading="lazy"
                decoding="async"
                className="mt-6 hidden w-full rounded-md border border-ink-line sm:block"
              />
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
                // Only a departure from the list as a whole sends the camera
                // back to the junction.
                if (!listRef.current?.contains(e.relatedTarget as Node | null)) setFocus(-1);
              }}
            >
              {ordered.map((way, i) => (
                <li key={way.key} data-key={way.key} data-focus={focus === i}>
                  <Link
                    href={`${servicesPath}#${way.key}`}
                    className="crossroads-way"
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

            <div className="mt-6">
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
            layer adds is the bond a list beside a canvas could not make. */}
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
                <span className="crossroads-mark-box" data-focus={focus === i}>
                  <span className="crossroads-mark-no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="crossroads-mark-name">{way.name}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
