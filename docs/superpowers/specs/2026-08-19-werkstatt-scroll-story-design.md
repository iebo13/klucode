# „Vom Gespräch zum laufenden System" — dark cinematic redesign

**Date:** 2026-08-19 · **Status:** approved by owner (chat, after mockup
review) · **Supersedes:** `2026-08-19-3d-scroll-story-design.md` (the
node-graph concept — rejected: no graph imagery anywhere)

## The brief (owner's answers)

- **Goal:** win SMB clients first (~60%), keep the door open for
  agencies/product teams. The site must make a non-technical owner trust
  enough to book a 30-minute call.
- **Story:** the owner's real process, with a product visibly taking shape —
  process as the chapter structure, the client's future app as the 3D object.
- **Look:** dark & cinematic, site-wide.
- **Brand rules:** everything may change. Palette/typefaces are kept because
  they carry the identity (wordmark, logo colour, legal font self-hosting),
  but layout, motion register and theme system are reinvented.

## The concept

The homepage opens as a five-phase scroll-story. One continuous 3D scene —
**the client's future web application assembling itself** — advances only
with scroll. The visitor watches their own problem get solved:

| Phase | Scene | Copy anchor |
|---|---|---|
| 01 Das Gespräch | Empty browser frame, sketched in faint viridian light | „Am Anfang steht kein Angebot. Ein Gespräch." |
| 02 Verstehen | Requirement cards float in and sort; one gets discarded | Erst zuhören, dann entscheiden — was gebaut wird und was nicht |
| 03 Der Plan | Cards snap into a wireframe; the fixed price stamps on | Preis steht vor der ersten Zeile Code |
| 04 Der Bau | Wireframe fills into a live interface; data layer slides beneath | Nach zwei Wochen: erste lauffähige Version |
| 05 Live | App docks onto its server; status light on | „Klug gebaut." + CTA |

No graphs, no nodes, no abstract particles. After the story the page
continues in the same dark register: projects with one big real number each,
services, approach, FAQ, final CTA.

## Design system

- **Dark-only.** `data-theme="dark"` is forced on `<html>`; the theme toggle
  and its init script are removed. The existing measured dark token set
  (stone/viridian ramps) remains the source of truth, so every existing
  contrast assertion still holds.
- **Cinematic layer:** site-wide film grain (SVG feTurbulence, ~4% alpha,
  fixed overlay), rationed radial viridian glows, mono HUD labels
  (`PHASE 01 — DAS GESPRÄCH`), a right-edge chapter rail on the story.
- **Type:** Space Grotesk display steps up (hero to ~clamp 96px); Inter body;
  JetBrains Mono for HUD/labels. Amber (`warm-300`) stays reserved for the
  live-status dot.

## Architecture

- `components/story/scroll-story.tsx` (client) — the five chapters plus a
  sticky full-viewport stage. The stage is **DOM + CSS 3D transforms**, not
  canvas: the assembling app is real text and panels (crisp at any DPR,
  token-styled, screen-reader-hidden via `aria-hidden`). ~30 stage elements
  each carry a keyframe track (opacity/translate/rotate over global scroll
  progress). A single rAF driver reads the wrapper's rect, lerps progress,
  and writes styles to element refs — no React re-render per frame, no
  dependencies, native scroll only.
- The previous canvas node-graph engine (`story-engine.ts`) is deleted.
- Content: `home.story` reshaped — `storyLabel`, three middle `phases`,
  `finale`, `scrollHint`, and a `stage` block for every string visible inside
  the 3D scene (address bar, KPI labels, requirement cards, server line), in
  both languages. Hero copy fields are rewritten to Phase 01.
- Chrome: header keeps the capsule but drops the theme toggle; body gains the
  grain overlay; subpages inherit the dark register through the existing
  tokens.

## Accessibility & fallbacks

- All copy is real DOM text in flow; the stage is `aria-hidden` decoration.
- `prefers-reduced-motion: reduce` → no rAF, no pinning: chapters stack as
  plain sections and the stage renders the finished state statically.
- No JS → text renders in order, stage stays at its initial state.
- Contrast: dark token roles only (`text`, `muted`, `ink*`), already asserted
  by `check_contrast.py`.

## Verification

`npm run lint`, `typecheck`, `build` (static export), `check-spacing`,
`check-meta`, `check-copy`; Chromium screenshots of every phase at
1400×900 and 390×844, DE and EN, plus a reduced-motion pass.
