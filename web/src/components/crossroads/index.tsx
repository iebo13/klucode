'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { ArrowLink, Eyebrow, RHYTHM } from '@/components/ui';
import type { Lang } from '@/lib/routes';

import { approachBeat, progressOf } from './progress';
import type { Handle, ServiceKey, Way } from './types';

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
 * Its real job is timing. data-enhanced only flips after hydration, and until
 * it does the track collapses to auto height, the section is exactly one stage
 * tall, and every scroll position computes to the junction. A test that
 * measures before this attribute lands scrolls to p=0 whatever it asked for.
 * Because it is set on the line before boot(), its presence also means there
 * is a handle listening for the scroll that follows.
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
 * the rows and the lanes are the same four things in the same order.
 */
const ORDER: ServiceKey[] = ['website', 'app', 'capacity', 'care'];

const inOrder = (ways: readonly Way[]): Way[] =>
  ORDER.map((key) => ways.find((w) => w.key === key)).filter((w): w is Way => w !== undefined);

/**
 * The room the scene needs, as one query.
 *
 * 64rem is not a taste call, it is Tailwind's `lg`, which is where the layout
 * below actually becomes two columns. The first draft mounted at 46rem, and
 * between the two the scene booted into a single-column stack inside a stage
 * fixed at 100svh with overflow hidden: the canvas took half of it and the
 * copy was cut off with nothing to scroll. Two thresholds that must agree are
 * the same drift shape the LANES array exists to avoid, so there is one.
 *
 * The height half is why the query is not just a width. A 1366x768 laptop is
 * wide enough and has roughly 640px of viewport, and the price board is taller
 * than that: the grid centres it, so the stage clipped it at both ends. 46rem
 * of height is the room the copy column needs before that starts.
 *
 * One constant, so the mount decision and the listener that re-decides it
 * cannot be handed different strings.
 */
const ROOM = '(min-width: 64rem) and (min-height: 46rem)';

/**
 * Whether this visitor gets the scene at all.
 *
 * Three ways to say no, and each is an answer rather than a degradation. A
 * reduced-motion request is honoured by not moving anything. A phone gets the
 * price board instead of 135 kB and a warm GPU, on a site whose pitch is that
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

/**
 * The opening argument, which used to be a section of its own above this one.
 *
 * Three options that do not fit, then the one that does. It was always the same
 * argument as the four ways below it, split in half by a section boundary: the
 * page said "here is why the obvious answers are wrong" and then, separately,
 * "here are four ways to work with me". Joined, the answer stops being a static
 * panel and becomes the moment the camera arrives at the junction.
 */
export type Problem = {
  eyebrow: string;
  title: string;
  lead: string;
  cards: readonly { title: string; body: string }[];
  answerTitle: string;
  answerBody: string;
};

/** How many blocks the approach is divided into: the lead, three cards, the answer. */
const APPROACH_BLOCKS = 5;

export function Crossroads({
  lang,
  problem,
  eyebrow,
  title,
  link,
  fromLabel,
  ways,
}: {
  lang: Lang;
  problem: Problem;
  eyebrow: string;
  title: string;
  link: { href: string; label: string };
  fromLabel: string;
  ways: readonly Way[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // The canvas fills the view, which is one column of the grid inside the
  // stage, so the view is what the renderer must be sized against. Measured
  // against the stage instead, the drawing buffer came out 1440x900 for a box
  // 640 wide and the whole scene was squashed by a factor of two and a half.
  const viewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [focus, setFocus] = useState(-1);
  /**
   * Which block of the opening argument is showing, or -1 once the camera has
   * arrived and the column is about the four ways instead.
   *
   * An integer rather than the raw progress, and that is the whole reason it
   * can be state at all: drive() runs on every scroll frame, and React bails
   * out of a re-render when the value it is handed is the one it already has.
   * A float would re-render the whole section sixty times a second to move an
   * opacity that changes five times in the entire journey.
   */
  const [beat, setBeat] = useState(0);
  // How many of the four have finished building, as an integer. Reflected onto
  // the section so the browser suite can assert on the reveal without a debug
  // hook shipping to production: it is honest state, it is not announced to a
  // screen reader, and it costs one integer.
  const [built, setBuilt] = useState(0);

  // Sorted once, and everything downstream reads this: the scene, the rows,
  // and the numbering. The prop's own order is never used.
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

  useEffect(() => {
    if (!enhanced) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const view = viewRef.current;
    const section = sectionRef.current;
    if (!canvas || !stage || !view || !section) return;

    let handle: Handle | null = null;
    let raf = 0;
    let cancelled = false;

    const drive = () => {
      raf = 0;
      if (!handle) return;
      const rect = section.getBoundingClientRect();
      const p = progressOf(rect.top, rect.height, stage.clientHeight);
      handle.set(p);
      setFocus(handle.focus());
      setBuilt(handle.built());
      // Read from the same progress the camera was just given, not from a
      // second measurement, so the column and the camera can never disagree
      // about where in the section the reader is.
      setBeat(approachBeat(p, APPROACH_BLOCKS));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(drive);
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
        handle = boot(canvas, view, ordered, LABELS[lang]);
        drive();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
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
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      handle?.stop();
    };
  }, [enhanced, ordered, lang]);

  /**
   * The opening argument's own moment, for everyone who never sees the scene.
   *
   * Most visitors are here: a phone, a tablet held upright, a reduced-motion
   * request, a browser with no WebGL. They get the whole section as stacked
   * text, and the three options that do not fit are the best writing on the
   * site sitting in a list styled exactly like the price board under it.
   *
   * So each one fails as you leave it. It is read at full strength, and once
   * the next one arrives it settles back and a rule draws part way across its
   * heading. Three failures accumulate above the answer, which is the shape of
   * the argument. An IntersectionObserver and a CSS transition, about a
   * kilobyte, and it reaches the readers the camera never will.
   *
   * `active` is the furthest block that has reached the reading band, and it
   * only ever grows: these are read in order, and a block that failed does not
   * un-fail because you scrolled back up to check.
   */
  const [active, setActive] = useState(0);

  useEffect(() => {
    // The scene is the desktop version of this and does it with a camera.
    if (enhanced) return;
    // A reduced-motion request is honoured by not moving anything, which here
    // means every block stays at full strength and nothing is ever struck
    // through. That is the same answer canMount() gives, for the same reason.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const col = copyRef.current;
    if (!col) return;

    const blocks = Array.from(col.querySelectorAll<HTMLElement>('.crossroads-beat'));
    if (blocks.length === 0) return;

    /**
     * The furthest block whose top has crossed the reading line.
     *
     * Measured across every block rather than read off the observer's entries,
     * and that is the whole point of the shape. An entry only arrives for a
     * block that crossed the boundary, so a scroll that JUMPS, which is an
     * anchor link, a restored offset, the End key, or a browser returning you
     * to where you were, hands over a callback naming one block and says
     * nothing about the three it flew past. Measured, they are simply behind
     * the line, and behind the line is the only thing being asked.
     *
     * The line sits 65% down the viewport rather than at its foot, because a
     * tall phone shows two of these at once and a block is not read the instant
     * its first pixel appears.
     */
    const measure = () => {
      const line = window.innerHeight * 0.65;
      let highest = 0;
      blocks.forEach((el, i) => {
        if (el.getBoundingClientRect().top < line) highest = i;
      });
      // Only ever forwards. These are read in order, and an option that failed
      // does not un-fail because the reader scrolled back up to check it.
      setActive((was) => (highest > was ? highest : was));
    };

    // The observer is the cheap trigger, not the measurement: it fires when any
    // block crosses the band, which is exactly when the answer can change, and
    // costs nothing on the frames in between.
    const io = new IntersectionObserver(measure, {
      rootMargin: '-35% 0px -30% 0px',
      threshold: 0,
    });

    for (const el of blocks) io.observe(el);
    // Once at mount, for the reader who arrives already scrolled down.
    measure();
    return () => io.disconnect();
  }, [enhanced]);

  /**
   * Keeps the row the camera is looking at inside the column that scrolls.
   *
   * Measured, the copy column is 1097px tall and taller than the stage at
   * every viewport the scene mounts on, so it scrolls: 301px of it at
   * 1440x900 and 462px at the 1024x736 floor. Without this the camera arrives
   * at way 03 with row 03 below the fold of a scroller the visitor has no
   * reason to have found, and the highlight names something nobody can see.
   *
   * scrollTop rather than scrollIntoView, and that is the whole point:
   * scrollIntoView walks every scrollable ancestor including the document, and
   * the document scroll is what drives this section. Moving one box's own
   * offset cannot fight it.
   */
  useEffect(() => {
    if (!enhanced || focus < 0) return;
    const col = copyRef.current;
    const row = col?.querySelector('li[data-focus="true"]');
    if (!col || !row) return;
    const box = col.getBoundingClientRect();
    const seat = row.getBoundingClientRect();
    const below = seat.bottom - box.bottom;
    const above = seat.top - box.top;
    // Nearest edge only. A row already in view is left exactly where it is.
    if (below > 0) col.scrollTop += below;
    else if (above < 0) col.scrollTop += above;
  }, [enhanced, focus]);

  return (
    <section
      id="services"
      // No overflow-hidden, which every other ink section carries. An element
      // with a clipped overflow is a scroll container, and a sticky child
      // sticks to the nearest one, so the stage would have stuck to a box that
      // never scrolls: it sat at the top of the section and slid away with it,
      // leaving four viewports of empty ink. The stage clips itself, and the
      // aurora is already bounded by its own contain: paint.
      ref={sectionRef}
      data-enhanced={enhanced}
      data-built={built}
      className="grain relative isolate bg-ink text-ink-fg"
    >
      <div aria-hidden="true" className="ink-aurora -z-10" />
      {/* The track is the runway and the stage sticks INSIDE it, not beside it
          with a negative margin. A sticky box travels its containing block's
          height minus its own MARGIN box, so a -100svh margin buys one extra
          viewport of travel and the stage releases a viewport late, painting
          over the section below. Nested, the travel is 420svh minus 100svh and
          stays right with no arithmetic to keep in step.

          Never aria-hidden: the track holds every word of the section, so
          hiding it would hide the content from the readers the fallback is
          for. */}
      <div className="crossroads-track">
        <div ref={stageRef} className="crossroads-stage">
          <div className="crossroads-layout mx-auto grid h-full max-w-container items-center gap-8 px-6 py-section md:px-8 lg:grid-cols-[1fr_26rem]">
            <div ref={viewRef} className="crossroads-view">
              {enhanced ? <canvas ref={canvasRef} aria-hidden="true" /> : null}
            </div>

            {/* crossroads-copy, because in the enhanced state this column is
                bounded by the stage and scrolls what will not fit. It is
                taller than any viewport the scene mounts on. */}
            <div ref={copyRef} className="crossroads-copy">
              {/* Two acts, and in the enhanced state they share one grid cell.
                  That is not a layout trick, it is what keeps this column the
                  height it already was: stacked in flow the section's copy is
                  the problem argument PLUS the price board, and the board alone
                  already overruns a 1024x736 stage by 500px. Overlaid, the
                  column is the taller of the two rather than their sum, and the
                  approach adds nothing to the scroll the column has to do.

                  Both acts stay in the DOM and neither is ever display:none or
                  visibility:hidden. A reader on a screen reader at 1440px gets
                  data-enhanced="true" like everyone else, and hiding act one
                  after the camera passed it would delete half the section's
                  argument for exactly the people who cannot see the camera
                  move. Opacity leaves it in the accessibility tree, in order. */}
              <div className="crossroads-acts">
                <div className="crossroads-act" data-live={beat >= 0}>
                  <Eyebrow onInk>{problem.eyebrow}</Eyebrow>
                  <h2 className={`${RHYTHM.heading} text-h2`}>{problem.title}</h2>

                  <div className="crossroads-beats mt-8">
                    <div className="crossroads-beat" data-live={beat === 0}>
                      <p className="max-w-measure text-lead text-ink-muted">{problem.lead}</p>
                    </div>

                    {problem.cards.map((card, i) => (
                      <div
                        key={card.title}
                        className="crossroads-beat crossroads-card"
                        data-live={beat === i + 1}
                        // Struck through once the next block has been reached,
                        // and only in the fallback, where these are stacked and
                        // read in order. In the enhanced state they are one at
                        // a time and the camera is doing this job.
                        data-passed={active > i + 1}
                      >
                        <h3 className="text-h3">{card.title}</h3>
                        <p className="mt-3 max-w-measure text-ink-muted">{card.body}</p>
                      </div>
                    ))}

                    {/* The answer, and it lands on arrival. In the old layout
                        this was an ink panel sitting still at the bottom of a
                        section. Here it is the last thing said before the
                        camera reaches the junction, which is the only reason
                        the two sections were worth joining. */}
                    <div
                      className="crossroads-beat crossroads-answer"
                      data-live={beat === APPROACH_BLOCKS - 1}
                    >
                      <h3 className="text-h3 text-ink-accent">{problem.answerTitle}</h3>
                      <p className="mt-3 max-w-measure text-ink-muted">{problem.answerBody}</p>
                    </div>
                  </div>
                </div>

                <div className="crossroads-act" data-live={beat < 0}>
                  <Eyebrow onInk>{eyebrow}</Eyebrow>
                  <h2 className={`${RHYTHM.heading} text-h2`}>{title}</h2>

                  <ol className="crossroads-ways mt-8 divide-y divide-ink-line border-y border-ink-line">
                    {ordered.map((way, i) => (
                      <li
                        key={way.key}
                        data-key={way.key}
                        data-focus={focus === i}
                        className="grid gap-1 py-4 transition-opacity"
                      >
                        <p className="font-mono text-eyebrow text-ink-accent">
                          {String(i + 1).padStart(2, '0')}
                        </p>
                        <h3 className="text-h3">{way.name}</h3>
                        <p className="text-small text-ink-muted">{way.forWhom}</p>
                        <p className="crossroads-reads text-small text-ink-muted">{way.reads}</p>
                        <p className="font-display text-h3 font-medium text-ink-accent">
                          <span className="font-sans text-small font-normal text-ink-muted">
                            {fromLabel}{' '}
                          </span>
                          {way.price}
                          <span className="mt-1 block font-sans text-small font-normal text-ink-muted">
                            {way.priceNote}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-8">
                    <ArrowLink onInk href={link.href}>
                      {link.label}
                    </ArrowLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
