'use client';

import { useEffect, useRef } from 'react';

import { ButtonLink, Eyebrow, RHYTHM } from '@/components/ui';
import type { Content } from '@/content/types';

/**
 * „Vom Gespräch zum laufenden System" — the homepage's scroll story.
 *
 * Five full-viewport chapters over one sticky stage. The stage is the
 * client's future web application, built from real DOM panels in CSS 3D
 * perspective, assembling itself as the reader scrolls through the five
 * project phases: sketched frame → requirement cards → wireframe + fixed
 * price → living interface + data layer → docked on its server, live.
 *
 * Mechanics that matter:
 *
 * - NATIVE SCROLL ONLY. A tall wrapper, a sticky viewport, no hijacking.
 *   Every stage element is a pure function of scroll progress — the scene
 *   advances when asked, reverses when asked, and otherwise stands still.
 * - The stage is DOM, not canvas: the assembling app is crisp text and
 *   token-styled panels at any DPR. It is aria-hidden decoration; every word
 *   that matters is ordinary flowing text next to it.
 * - One rAF driver lerps progress and writes opacity/transform straight to
 *   the tracked elements — zero React re-renders per frame, zero deps.
 * - `prefers-reduced-motion: reduce` gets the finished state as a still
 *   image and plainly stacked chapters. No loop runs at all.
 */

type Story = Content['home']['story'];

/** One keyframe on a track. Missing properties carry over from the key before. */
type Key = {
  at: number;
  o?: number;
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  s?: number;
};
type Full = Required<Key>;

const DEFAULTS: Omit<Full, 'at'> = { o: 1, x: 0, y: 0, z: 0, rx: 0, ry: 0, s: 1 };

/**
 * The choreography. Progress runs 0 → 1 across the whole story; the five
 * chapters sit at 0, .25, .5, .75 and 1. Tracks read like a shot list.
 */
const TRACKS: Record<string, Key[]> = {
  // The browser frame: sketched at the right, firming up, docking to the
  // centre for the finale.
  frame: [
    { at: 0, x: 60, y: -10, ry: -16, rx: 5, s: 1 },
    { at: 0.25, x: 20, y: 0, ry: -13, rx: 5, s: 1.02 },
    { at: 0.5, x: 0, y: 0, ry: -16, rx: 6, s: 1.03 },
    { at: 0.75, x: 0, y: -14, ry: -18, rx: 6, s: 1.05 },
    { at: 1, x: -250, y: -84, ry: -6, rx: 3, s: 1 },
  ],
  // Phase 01 skin: faint viridian outline and an empty room.
  sketch: [{ at: 0, o: 1 }, { at: 0.3, o: 1 }, { at: 0.45, o: 0 }],
  solid: [{ at: 0, o: 0 }, { at: 0.3, o: 0 }, { at: 0.45, o: 1 }],
  draft: [{ at: 0, o: 1 }, { at: 0.28, o: 1 }, { at: 0.4, o: 0 }],
  // Phase 03: the wireframe, later replaced by the real interface.
  wire: [{ at: 0.42, o: 0 }, { at: 0.54, o: 1 }, { at: 0.64, o: 1 }, { at: 0.74, o: 0 }],
  ui: [{ at: 0.62, o: 0 }, { at: 0.76, o: 1 }],
  // The fixed price stamps on once the plan stands.
  stamp: [
    { at: 0.54, o: 0, s: 1.3, y: -8 },
    { at: 0.62, o: 1, s: 1, y: 0 },
    { at: 0.76, o: 1 },
    { at: 0.84, o: 0 },
  ],
  // The data layer slides in under the app while it is being built.
  db: [
    { at: 0.62, o: 0, y: 90, x: 40 },
    { at: 0.76, o: 0.9, y: 34, x: 40 },
    { at: 0.9, o: 0.9, y: 34, x: 40 },
    { at: 0.98, o: 0, y: 60, x: 40 },
  ],
  week: [{ at: 0.7, o: 0 }, { at: 0.78, o: 1 }, { at: 0.88, o: 0 }],
  // Phase 05: the server rises, the app reports live.
  server: [{ at: 0.86, o: 0, y: 46 }, { at: 0.96, o: 1, y: 0 }],
  live: [{ at: 0.9, o: 0 }, { at: 1, o: 1 }],
  barDraft: [{ at: 0, o: 1 }, { at: 0.88, o: 1 }, { at: 0.95, o: 0 }],
  barLive: [{ at: 0.88, o: 0 }, { at: 0.96, o: 1 }],
};

/** Requirement cards: drift in during Phase 02, fold into the plan at 03. */
function cardTrack(i: number): Key[] {
  const drift = [
    { x: 420, y: 40 },
    { x: 950, y: 10 },
    { x: 1080, y: 250 },
    { x: 410, y: 330 },
    { x: 990, y: 560 },
  ][i] as { x: number; y: number };
  const slot = { x: 640 + (i % 2) * 200, y: 180 + Math.floor(i / 2) * 70 };
  return [
    { at: 0.06 + i * 0.02, o: 0, x: drift.x + 50, y: drift.y + 40, s: 0.9 },
    { at: 0.2 + i * 0.02, o: 1, x: drift.x, y: drift.y, s: 1 },
    { at: 0.4, o: 1, x: drift.x, y: drift.y },
    { at: 0.52 + i * 0.015, o: 0, x: slot.x, y: slot.y, s: 0.7 },
  ];
}

/** The requirement that gets cut — it visibly leaves the project. */
const DISCARD_TRACK: Key[] = [
  { at: 0.1, o: 0, x: 700, y: 680, s: 0.9 },
  { at: 0.24, o: 1, x: 700, y: 630, s: 1 },
  { at: 0.42, o: 1, x: 700, y: 630 },
  { at: 0.52, o: 0, x: 880, y: 800, s: 0.85 },
];

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t: number) => t * t * (3 - 2 * t);

function fillTracks(): Map<string, Full[]> {
  const out = new Map<string, Full[]>();
  const all: Record<string, Key[]> = { ...TRACKS, discard: DISCARD_TRACK };
  for (let i = 0; i < 5; i++) all[`card${i}`] = cardTrack(i);
  for (const [name, keys] of Object.entries(all)) {
    const full: Full[] = [];
    let prev: Omit<Full, 'at'> = DEFAULTS;
    for (const k of keys) {
      const f = { ...prev, ...k } as Full;
      full.push(f);
      prev = f;
    }
    out.set(name, full);
  }
  return out;
}

function sample(keys: Full[], p: number): Full {
  const first = keys[0] as Full;
  const last = keys[keys.length - 1] as Full;
  if (p <= first.at) return first;
  if (p >= last.at) return last;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i] as Full;
    const b = keys[i + 1] as Full;
    if (p <= b.at) {
      const t = smooth(clamp01((p - a.at) / (b.at - a.at)));
      const l = (x: number, y: number) => x + (y - x) * t;
      return {
        at: p,
        o: l(a.o, b.o),
        x: l(a.x, b.x),
        y: l(a.y, b.y),
        z: l(a.z, b.z),
        rx: l(a.rx, b.rx),
        ry: l(a.ry, b.ry),
        s: l(a.s, b.s),
      };
    }
  }
  return last;
}

export function ScrollStory({
  hero,
  story,
  ctaPrimary,
  ctaSecondary,
}: {
  hero: { eyebrow: string; title: string; accent: string; lead: string; proof: string[] };
  story: Story;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const sticky = stickyRef.current;
    if (!wrap || !sticky) return;

    const tracks = fillTracks();
    const els = new Map<string, HTMLElement>();
    sticky.querySelectorAll<HTMLElement>('[data-kf]').forEach((el) => {
      els.set(el.dataset.kf as string, el);
    });
    const stageBox = sticky.querySelector<HTMLElement>('[data-stage]');
    const railDots = Array.from(sticky.querySelectorAll<HTMLElement>('[data-rail]'));
    const counter = sticky.querySelector<HTMLElement>('[data-counter]');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = reduced.matches ? 1 : 0;
    let current = target;
    let drawn = -1;
    let raf = 0;
    let inView = true;

    const apply = (p: number) => {
      for (const [name, el] of els) {
        const keys = tracks.get(name);
        if (!keys) continue;
        const v = sample(keys, p);
        el.style.opacity = String(v.o);
        el.style.transform = `translate3d(${v.x}px, ${v.y}px, ${v.z}px) rotateX(${v.rx}deg) rotateY(${v.ry}deg) scale(${v.s})`;
      }
      const idx = Math.min(4, Math.round(p * 4));
      railDots.forEach((d, i) => {
        d.style.color = i === idx ? 'var(--kc-viridian-400)' : 'var(--kc-stone-700)';
      });
      if (counter) counter.textContent = `0${idx + 1} / 05`;
      drawn = p;
    };

    const resize = () => {
      if (!stageBox) return;
      // The scene is authored on a 1120×720 board; scale it to the viewport
      // rather than reflowing thirty absolutely-placed elements.
      const s = Math.min(1, window.innerWidth / 1360, window.innerHeight / 860);
      stageBox.style.transform = `translate(-50%, -50%) scale(${s})`;
      drawn = -1;
    };

    const frame = () => {
      raf = 0;
      const range = wrap.offsetHeight - window.innerHeight;
      if (range > 0) {
        target = clamp01(-wrap.getBoundingClientRect().top / range);
      }
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.0006) current = target;
      if (Math.abs(current - drawn) > 0.0004) apply(current);
      if (inView && !reduced.matches) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && inView && !reduced.matches) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting);
      kick();
    });
    io.observe(wrap);

    const onMotionPref = () => {
      if (reduced.matches) {
        current = 1;
        apply(1);
      } else {
        kick();
      }
    };
    reduced.addEventListener('change', onMotionPref);

    const onResize = () => {
      resize();
      if (reduced.matches) apply(1);
      else kick();
    };
    window.addEventListener('resize', onResize, { passive: true });

    resize();
    if (reduced.matches) apply(1);
    else kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      reduced.removeEventListener('change', onMotionPref);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const st = story.stage;

  return (
    <div ref={wrapRef} className="relative isolate">
      {/* ------------------------------------------------------- the stage */}
      <div
        ref={stickyRef}
        aria-hidden="true"
        className="sticky top-0 -z-10 h-svh w-full overflow-hidden"
        style={{ marginBottom: '-100svh' }}
      >
        {/* one rationed glow behind the scene */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(52% 46% at 62% 48%, rgba(94,164,114,.13), transparent 70%)',
          }}
        />

        <p className="mono-hud absolute left-1/2 top-6 hidden -translate-x-1/2 md:block">
          {story.label} — <span data-counter>01 / 05</span>
        </p>

        {/* chapter rail */}
        <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">
          {[1, 2, 3, 4, 5].map((n, i) => (
            <span key={n} className="contents">
              {i > 0 ? <span className="h-6 w-px bg-line" /> : null}
              <span data-rail className="font-mono text-[11px] text-stone-700">
                {`0${n}`}
              </span>
            </span>
          ))}
        </div>

        {/* the 1120×720 scene board, scaled by the driver */}
        <div
          data-stage
          className="absolute left-1/2 top-1/2"
          style={{ width: 1120, height: 720, transform: 'translate(-50%, -50%)', perspective: '1400px' }}
        >
          {/* requirement cards (Phase 02) */}
          {st.requirements.map((r, i) => (
            <div
              key={r}
              data-kf={`card${i}`}
              className="stage-card"
              style={{ left: 0, top: 0, opacity: 0 }}
            >
              {r}
            </div>
          ))}
          <div
            data-kf="discard"
            className="stage-card stage-card-discard"
            style={{ left: 0, top: 0, opacity: 0 }}
          >
            {st.discarded}
          </div>

          {/* data layer (Phase 04) */}
          <div
            data-kf="db"
            className="absolute rounded-xl border border-line bg-surface"
            style={{ left: 500, top: 420, width: 560, height: 260, opacity: 0 }}
          >
            <p className="mono-hud border-b border-line px-4 py-3 !text-viridian-600">{st.dbLabel}</p>
            <div className="grid gap-3 p-4">
              <div className="h-3 w-4/5 rounded-sm bg-surface-raised" />
              <div className="h-3 w-3/5 rounded-sm bg-surface-raised" />
              <div className="h-3 w-2/3 rounded-sm bg-surface-raised" />
            </div>
          </div>

          {/* the browser frame */}
          <div
            data-kf="frame"
            className="absolute"
            style={{ left: 470, top: 110, width: 580, height: 400, transformStyle: 'preserve-3d' }}
          >
            {/* Phase 01 skin: the sketch */}
            <div
              data-kf="sketch"
              className="absolute inset-0 rounded-xl"
              style={{
                border: '1px solid rgba(94,164,114,.4)',
                background: 'rgba(94,164,114,.04)',
                boxShadow: 'inset 0 0 70px rgba(94,164,114,.07)',
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(94,164,114,.25)' }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(94,164,114,.4)' }} />
                <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(94,164,114,.25)' }} />
                <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(94,164,114,.25)' }} />
              </div>
              <p className="mono-hud absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !text-viridian-600">
                {st.emptyLabel}
              </p>
            </div>

            {/* solid skin from Phase 03 on */}
            <div
              data-kf="solid"
              className="absolute inset-0 overflow-hidden rounded-xl border border-line bg-surface-raised"
              style={{ opacity: 0, boxShadow: '0 40px 110px rgba(0,0,0,.55), 0 0 90px rgba(94,164,114,.09)' }}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-viridian-400" />
                </span>
                <span className="relative">
                  <span data-kf="barDraft" className="mono-hud">{st.addressBar}</span>
                  <span data-kf="barLive" className="mono-hud absolute right-0 top-0 whitespace-nowrap !text-viridian-400" style={{ opacity: 0 }}>
                    {st.liveTab}
                  </span>
                </span>
              </div>

              <div className="relative" style={{ height: 'calc(100% - 41px)' }}>
                {/* wireframe (Phase 03) */}
                <div data-kf="wire" className="absolute inset-0 flex" style={{ opacity: 0 }}>
                  <div className="grid content-start gap-3 border-r border-line p-4" style={{ width: 144 }}>
                    <div className="sbar-sm w-11/12 rounded-sm border border-dashed border-stone-700" />
                    <div className="sbar-sm w-3/4 rounded-sm border border-dashed border-stone-700" />
                    <div className="sbar-sm w-5/6 rounded-sm border border-dashed border-stone-700" />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex gap-3">
                      <div className="h-16 flex-1 rounded-lg border border-dashed border-stone-700" />
                      <div className="h-16 flex-1 rounded-lg border border-dashed border-stone-700" />
                      <div className="h-16 flex-1 rounded-lg border border-dashed border-stone-700" />
                    </div>
                    <div className="mt-4 grid gap-row">
                      <div className="sbar rounded-sm border border-dashed border-stone-700" />
                      <div className="sbar w-11/12 rounded-sm border border-dashed border-stone-700" />
                      <div className="sbar w-4/5 rounded-sm border border-dashed border-stone-700" />
                    </div>
                  </div>
                </div>

                {/* the living interface (Phase 04) */}
                <div data-kf="ui" className="absolute inset-0 flex" style={{ opacity: 0 }}>
                  <div className="grid content-start gap-3 border-r border-line p-4" style={{ width: 144 }}>
                    <div className="sbar-sm w-11/12 rounded-sm bg-viridian-400" />
                    <div className="sbar-sm w-3/4 rounded-sm bg-surface" />
                    <div className="sbar-sm w-5/6 rounded-sm bg-surface" />
                    <div className="sbar-sm w-2/3 rounded-sm bg-surface" />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex gap-3">
                      <div className="flex-1 rounded-lg border border-line bg-surface kpi-pad">
                        <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{st.kpi1Label}</p>
                        <p className="font-display text-xl font-bold text-viridian-300">{st.kpi1Value}</p>
                      </div>
                      <div className="flex-1 rounded-lg border border-line bg-surface kpi-pad">
                        <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{st.kpi2Label}</p>
                        <p className="font-display text-xl font-bold text-viridian-300">{st.kpi2Value}</p>
                      </div>
                      <div className="relative flex-1 rounded-lg border border-line bg-surface kpi-pad">
                        <div data-kf="live" style={{ opacity: 0 }}>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{st.metricNote}</p>
                          <p className="font-display text-xl font-bold text-viridian-300">{st.metricValue}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-row">
                      <div className="sbar rounded-sm bg-surface" />
                      <div className="sbar w-11/12 rounded-sm bg-surface" />
                      <div className="sbar w-4/5 rounded-sm bg-surface" />
                      <div className="sbar w-5/6 rounded-sm bg-surface" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* under-frame captions */}
          <p data-kf="draft" className="mono-hud absolute" style={{ left: 760, top: 540 }}>
            {st.draftLabel}
          </p>
          <p data-kf="week" className="mono-hud absolute !text-viridian-400" style={{ left: 800, top: 84, opacity: 0 }}>
            {st.weekLabel}
          </p>

          {/* the fixed-price stamp (Phase 03) */}
          <div
            data-kf="stamp"
            className="absolute rounded-full border-2 border-viridian-400 px-6 py-3 font-display text-lg font-bold text-viridian-300"
            style={{ left: 560, top: 470, opacity: 0, rotate: '-4deg', background: 'rgba(94,164,114,.08)' }}
          >
            {st.priceStamp}
          </div>

          {/* the server (Phase 05) */}
          <div data-kf="server" className="absolute" style={{ left: 320, top: 452, opacity: 0 }}>
            <div
              className="rounded-lg border border-line bg-surface"
              style={{ width: 380, height: 90, transform: 'rotateX(56deg)', transformOrigin: 'center top' }}
            />
            <div className="absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-lg border border-line bg-surface-raised px-4 py-3">
              <span
                className="h-2 w-2 rounded-full bg-accent-warm"
                style={{ boxShadow: '0 0 12px rgba(242,163,89,.8)' }}
              />
              <span className="mono-hud">{st.serverLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- the chapters */}
      <div className="relative">
        {/* Phase 01 — the hero */}
        <section className="flex min-h-svh flex-col justify-center">
          <div className="mx-auto w-full max-w-container px-6 pt-16 md:px-8">
            <Eyebrow>{hero.eyebrow}</Eyebrow>
            <p className="mono-hud mt-2 !text-viridian-400">{story.heroPhase}</p>
            <h1 className={`${RHYTHM.heading} max-w-3xl text-display`}>
              {hero.title} <span className="text-brand-text">{hero.accent}</span>
            </h1>
            <p className={`${RHYTHM.lead} max-w-measure text-lead text-muted`}>{hero.lead}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href={ctaPrimary.href}>{ctaPrimary.label}</ButtonLink>
              <ButtonLink href={ctaSecondary.href} variant="secondary">
                {ctaSecondary.label}
              </ButtonLink>
            </div>
            <ul className="mt-12 flex flex-wrap gap-3">
              {hero.proof.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-2 rounded-full border border-line bg-surface-raised px-4 py-2 text-small text-muted"
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mono-hud mt-16 flex items-center gap-2">
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 1v10M2 7l4 4 4-4" />
              </svg>
              {story.scrollHint}
            </p>
          </div>
        </section>

        {/* Phases 02–04 */}
        {story.phases.map((ph) => (
          <section key={ph.phase} className="flex min-h-svh items-center">
            <div className="mx-auto w-full max-w-container px-6 md:px-8">
              <div className="max-w-md">
                <p className="mono-hud !text-viridian-400">{ph.phase}</p>
                <h2 className={`${RHYTHM.heading} text-h1`}>{ph.title}</h2>
                <p className={`${RHYTHM.lead} text-lead text-muted`}>{ph.body}</p>
              </div>
            </div>
          </section>
        ))}

        {/* Phase 05 — live */}
        <section className="flex min-h-svh items-end">
          <div className="mx-auto w-full max-w-container px-6 pb-24 text-center md:px-8">
            <p className="mono-hud !text-viridian-400">{story.finale.phase}</p>
            <h2 className={`${RHYTHM.heading} text-h1`}>{story.finale.title}</h2>
            <p className={`${RHYTHM.lead} mx-auto max-w-measure text-lead text-muted`}>
              {story.finale.body}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <ButtonLink href={ctaPrimary.href}>{ctaPrimary.label}</ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
