# 3D interactive scroll story — homepage redesign

**Date:** 2026-08-19 · **Status:** approved for implementation (user requested
the redesign; decisions below are presented for review in the PR)

## The request

Change the site's design into a 3D interactive page that builds a story while
scrolling.

## The tension, and how it resolves

`brand/03-visual-identity.md` §9 forbids parallax and "anything that moves
without being asked", and §7 forbids "3-D renders … or stock isometric
technology art". A generic three.js hero would violate the brand on three
counts.

But the same document names the one decorative element the brand owns: **the
node graph — small circles joined by thin viridian lines, drawn from the
logo's own geometry**. And scroll-driven animation is motion that *is* asked
for — it advances only when the reader scrolls, reverses when they scroll
back, and stands still when they do.

So the design: **the homepage becomes a scroll-driven story told by the
brand's node graph in 3D space.** Scattered points (the client's scattered
tools) → the hub appears (understanding) → edges connect (the build) → the
graph resolves into the `</K>` mark (shipped — "a closing tag is what you
write when a thing is finished"). The 3D object is the logo's own geometry,
nothing imported. This amends §9 for the homepage story deliberately; every
frame is scroll-positioned, nothing autoplays, and the whole thing collapses
to a static page under `prefers-reduced-motion`.

## Approaches considered

1. **Custom Canvas 2D engine with manual 3D perspective projection —
   chosen.** A node graph is points and lines; it needs no meshes, lighting
   or materials, so WebGL buys nothing here. ~9 KB of own TypeScript, zero
   dependencies, deterministic (seeded), theme-aware via the existing CSS
   custom properties. Keeps the site's load-bearing claim — "no runtime
   dependencies, genuinely fast" (`web/README.md`) — true.
2. **three.js + React Three Fiber.** Richer effects (DOF, bloom), but
   ~170 KB gz added to every homepage visit, R3F v9 has open compatibility
   issues with Next 15/React 19 static export, and bloom/DOF are exactly the
   glow-and-blur register the brand spent §7 removing.
3. **CSS 3D transforms / scroll-driven animations.** No canvas, but
   connected *lines between moving 3D points* cannot be expressed in CSS,
   and CSS scroll-timeline support is still uneven. Rejected.

## The story (five chapters)

The story replaces the current hero and problem sections. One tall scroll
region (~500 svh) with a sticky full-viewport canvas behind the text; the
chapter copy is real DOM text in normal flow — native scroll, no hijacking.

| # | Scene state | Copy (DE / EN, Sie-form, no exclamation marks) |
|---|---|---|
| 1 | ~90 nodes drift loosely, unconnected | Existing hero: „Klug gebaut." headline, lead, CTAs, proof chips |
| 2 | Camera pushes in; nodes jitter, still unconnected | „Ihr Betrieb läuft. Ihre Software nicht." — Excel here, WhatsApp there, nothing talks to each other. The pieces are all there; the connection is missing |
| 3 | The hub ignites; first edges reach out | „Erst verstehen, dann bauen." — the valuable part of the work happens before the typing |
| 4 | Edges cascade; the field orders itself into a lattice | „Ein System statt vieler Einzelteile." — front end to server, one person, fixed price, first running version after two weeks |
| 5 | The graph condenses into the exact `</K>` mark geometry, facing the camera | Tagline + „Ein abgeschlossenes Projekt erkennt man am schließenden Tag." + arrow onward |

After the story, the page continues with the existing sections (services,
work, approach, FAQ, final CTA) unchanged — the story carries the narrative,
those sections carry the conversion.

## Architecture

- `web/src/components/story/story-engine.ts` — pure TS, no React: seeded
  PRNG (mulberry32), scene graph (nodes with per-chapter keyframe positions,
  edges with appear-ranges), smoothstep interpolation, perspective
  projection (focal length ≈ 1.1 × viewport min-side, z-attenuated size and
  alpha), z-sorted painter's draw to a 2D context. Mark geometry taken
  verbatim from `brand/logo/_build/build_logos.py` (`LT`, `SLASH`, `GT`,
  `HUB`, stem, arms).
- `web/src/components/story/scroll-story.tsx` — `'use client'`: sticky
  canvas + chapter markup (copy passed as props from the server component),
  rAF loop gated by an IntersectionObserver, scroll progress read from
  `getBoundingClientRect` and lerped (0.09) toward the target, DPR capped at
  2 (1.5 under 768 px, with a reduced node count), colours read from
  computed `--kc-*` custom properties and re-read when the `dark` class on
  `<html>` flips (MutationObserver).
- Content: `home.story` added to `Content` type, `de.ts`, `en.ts`
  (`satisfies Content` keeps both languages in lockstep). The old
  `problemCards`/`answer*` fields stay in the content files — the problem
  *section* leaves the homepage, but subpages and future use keep the copy.
- `page.tsx`: hero + problem sections replaced by `<ScrollStory>`.

## Accessibility and fallbacks

- Canvas is `aria-hidden`; every word is real DOM text, statically exported.
- `prefers-reduced-motion: reduce`: no rAF loop, no sticky pinning — the
  chapters render as plain stacked sections and the canvas draws one static
  frame of the finished mark (state, not motion, carries the story).
- No JS: text renders in order; canvas stays empty. Nothing breaks.
- Contrast: chapter text uses the existing token roles (`text`, `muted`,
  `brandText`) over `surface`; canvas alpha is held low enough behind the
  text column (the field thins toward the text, mirroring the brand
  texture's "density falls away so there is always somewhere clean to put a
  headline"). The mark's finale is drawn in viridian-500 — permitted, since
  it *is* the mark, and it is geometry, never text.
- The mark is formed flat-facing, as line geometry — not extruded, not
  bevelled, not glowing (§4 logo misuse holds).

## Performance

Zero new dependencies. Engine + component ≈ 9 KB min. One canvas, one rAF
while in view, passive listeners, no layout thrash (one rect read per
frame). DPR-capped. Draw cost: ≤ ~120 nodes + ~140 edges per frame — well
under a millisecond on integrated graphics.

## Testing

`npm run lint`, `npm run typecheck`, `npm run build` (static export must
succeed), plus `check:copy`/`check:meta` scripts. Visual check of both
themes and both languages in the exported output.
