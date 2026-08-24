'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { ArrowLink, Eyebrow, RHYTHM } from '@/components/ui';
import type { Lang } from '@/lib/routes';

import { progressOf } from './progress';
import type { Handle, ServiceKey, Way } from './types';

/** Set on the canvas so scripts/check-bundle.mjs can find the chunk after minification. */
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

export function Crossroads({
  lang,
  eyebrow,
  title,
  link,
  fromLabel,
  ways,
}: {
  lang: Lang;
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
  const [enhanced, setEnhanced] = useState(false);
  const [focus, setFocus] = useState(-1);
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
      handle.set(progressOf(rect.top, rect.height, stage.clientHeight));
      setFocus(handle.focus());
      setBuilt(handle.built());
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

            <div>
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
    </section>
  );
}
