# KluCode — Site & Brand Audit

**Date:** 2026-08-12 · **Scope:** brand-kit ↔ website alignment, market research, design/UX research, owner feedback, and the redesign direction derived from all four.

---

## 1. Brand ↔ site alignment

**Verdict: mostly aligned, minor drift.** The site is an unusually faithful implementation of `brand/` — tokens are imported from `brand/tokens/tokens.json` with no copy-paste step, `check_contrast.py` passes (~120 pairs, both themes), the spacing and meta checks pass, viridian-500 appears nowhere as text/UI, `.glass-nav` exists on exactly one element, the copy is „ich"/„Sie" throughout with zero hype words, all four price anchors match the strategy, and the AI-objection answer sits on `/ansatz` nearly verbatim. **The dissatisfaction with the design is therefore a problem of the design system itself plus missing content — not implementation drift.**

### Mismatches (by severity)

1. **Root-redirect page uses the old, rejected palette.** `web/scripts/emit-root-redirect.mjs:44–49` hand-pastes `#f2f4f1` / `#0c1a15` (pre-rebuild paper/ink, in no current scale) and `#2b564a` (`semantic.success`, which is states-only) for links. This is what a visitor to `/` briefly sees.
2. **Inline logo breaks two "never" rules, deliberately.** `web/src/components/logo.tsx` draws the mark in the `brand` role instead of viridian-500 and re-typesets the wordmark as live text (visual-identity §4 forbids both). Documented reasoning exists, but the site never shows the mark in its canonical colour.
3. **No non-breaking spaces in prices.** Voice §2 fixes `2.500 €` with U+00A0; all eleven price strings in `de.ts`/`en.ts` use plain spaces and can wrap.
4. **Off-palette green in button shadows.** `ui.tsx:193`, `header.tsx:97` use `rgba(53,108,91,…)` = `#356C5B` — not a token value.
5. **„wir" appears twice in DE copy** (`de.ts:126`, `de.ts:327`) against the absolute „KluCode says ich" rule — both the inclusive we, but the rule admits no exception.
6. **InkPanel has no border** (`ui.tsx:141`) vs. "every panel gets a border"; in dark mode its edge on a tinted section is ~1.25:1.
7. **Tracking is hand-set, not token-derived** (`tailwind.config.ts:95–102`); eyebrow tracking is 0.08em, double the documented 0.04em.
8. **`emit-404.mjs` duplicates token hexes by hand** and assigns two roles differently from the site.
9. **Minor microcopy deltas** from the fixed voice table (availability line, form-failure copy).
10. **Kit-internal inconsistencies the site inherits:** measure 68ch (doc) vs 64ch (tokens); a stale `$comment` in `tokens.json` citing the old palette.

### Demanded by the brand docs, missing from the site

- **The founder photo** — the About-page placeholder's instruction text *renders publicly* („Hier gehört ein Foto von Ihnen hin…").
- **Testimonials** — `quote` slots exist per project, all empty.
- **One real number per project** — `metric` slots exist, all empty.
- **Screenshots of the three systems** — both `FigureSlot`s still show the node-field placeholder.
- **Identity/legal data** — `profile.ts` has `todo()` for name, email, phone, street, postal code, VAT, hosting; Impressum shows its warning banner.
- **Stale availability month** — „Januar" against an August build.

### Check results

| Check | Result |
|---|---|
| `brand/tokens/check_contrast.py` | PASS |
| `build_css.py` regeneration | PASS (byte-identical) |
| tokens.css / favicon / logo.svg / og.png vs kit | identical / matching |
| `check-spacing.mjs`, `check-meta.mjs` | PASS |
| `check-copy.mjs`, `check-profile.mjs` | not runnable pre-build at audit time |
| Manual: glass-nav count, glow count, viridian-500 absence, warm-accent count, two structural exceptions, fonts self-hosted at build | all conform |

---

## 2. Market research — how this market promotes itself

### Key competitors / peers

| Site | Why it matters |
|---|---|
| [neuzeitwerber.de](https://www.neuzeitwerber.de/webdesign-fuer-handwerker/) | Sells Handwerk websites at exactly the 2.500 € anchor. Best funnel seen: 3 fixed packages (2.500/3.900/ab 5.500 €), installments (3×833 €), included/not-included checklists, „Festpreis heißt Festpreis", 9 named+located testimonials, maintenance ab 49 €/Monat, WhatsApp. |
| [tobeworks.de](https://tobeworks.de/webentwicklung-mainz-wiesbaden-frankfurt) | Closest structural analogue: same three-lane model (SMB / agency subcontracting / retainers), „kein Agentur-Overhead". Weakness: numbers without testimonials. |
| [florian-strasser.de](https://www.florian-strasser.de/) | Direct Düsseldorf competitor, solo since 2012, 10 case studies, €70/h + hour estimates. Beatable on presentation (fixed packages > hour math). |
| [handwerkweb.com](https://handwerkweb.com/) | Certified „Digitale Berater" for three Handwerkskammern — chamber channel as trust badge; package names in customer vocabulary. |
| [kopfundstift.de/webdesign-kosten](https://kopfundstift.de/webdesign-kosten/) | One honest, *ranking* cost-guide page as an entire acquisition channel. |
| [klimentowicz.com](https://klimentowicz.com/) | Radically honest AI positioning; sells „Vibe-Code-Rettung" (rescuing failed AI projects) — emerging demand. |
| [headon.pro](https://headon.pro/) | Live Lighthouse scores as verifiable engineer proof. |
| [kiwebsite.de](https://kiwebsite.de/) | Cleanest German AI framing: „Menschen denken. KI beschleunigt." |
| [designjoy.co](https://designjoy.co/) | Solo-as-feature framing; model for the retainer offer. |
| [manuel-deutsch.de](https://www.manuel-deutsch.de/) | Strongest proof wall (18 testimonials with faces); hides prices — a mistake for this segment. |

### Cross-cutting patterns

**What works:** Festpreis as a *trust message* („Festpreis heißt Festpreis, kein Kleingedrucktes") always paired with an included/not-included checklist; named + located + same-trade testimonials with one concrete outcome; founder face + first person + anti-agency framing; low-friction multi-channel contact (Erstgespräch + calendar + phone + WhatsApp); outcome language for owners, stack language only for agencies.
**What fails:** hiding prices while targeting SMBs; „ab X €" without itemized scope (read as a renegotiation opener); numbers without names; overclaimed metrics (+1.100% Anfragen); sub-1.000 € price signaling.

### Channels, ranked (evidence: Freelancer-Kompass 2025, practitioner guides)

1. **Systematized referrals** (64% of German freelance engagements are passive; biggest evidenced source).
2. **Local SEO + Google Business Profile** with city landing pages (Düsseldorf, Köln, Neuss).
3. **freelancermap/Malt for segment B only** — 680 €/Tag is mid-market (React avg ~84 €/h), no repricing needed.
4. **HWK/IHK Digitalisierungsberater networks** — the non-obvious one; a competitor demonstrably converts chamber certification into work. Check NRW digitalization funding for client projects.
5. **BNI-type local networks** (anecdotal, mixed; test before committing).
6. **One ranking cost-guide page** („Was kostet eine Website / ein individuelles CRM 2026?").
7. **LinkedIn** — segment B/C only (~7% of sourcing overall). **Cold outreach** — no supporting evidence found.

### AI angle & pricing

Market norm converged on exactly the brand doc's position: **result in the headline, mechanism in the FAQ**, framed as acceleration with an engineer quality gate („die finale Verantwortung liegt bei mir"). Established solo devs (Strasser, Tobeworks) don't mention AI at all; „KI-Agentur" brands read commodity and hide prices.
**Price transparency is validated for segment A** — every credible SMB-focused peer publishes prices; PAngV does not oblige B2B display, so it's a free strategic choice. Each „ab" price needs its checklist.

### Non-obvious business takeaways (owner decisions, not yet acted on)

1. A **middle offer ~4.900 €** (website + Anfrage-/Termin-Workflow) — the ladder currently jumps 2.500 € → 9.000 € over exactly the 3.900–5.500 € range where this market buys most.
2. **Installments** (e.g. 3×) on the website package.
3. **Karriere-/Fachkräfte-Seite as a package feature** (hiring is Handwerk's #1 pain).
4. **WhatsApp contact** with stated response time.
5. **„KI-/Baukasten-Projekt-Rettung"** service line.
6. **Live Lighthouse scores / free site check** as engineer-grade lead magnet.

---

## 3. Design/UX research — why "clean" reads as boring here

### Diagnosis (mapped to this site)

1. **Uniform section rhythm** — alternating tints + an InkPanel per section = every section has the same energy. Remedy: storyboard with 1–2 real peaks per page, fewer emphasis slabs, some quiet borderless sections.
2. **AI-default typography** — Space Grotesk + Inter + JetBrains-Mono-uppercase is the documented "generated" stack (Space Grotesk: "the model's idea of edgy default"). Display face is the cheapest identity lever. Avoid Clash Display/Satoshi (next wave of defaults).
3. **Timid type scale** — 2025/26 standouts run editorial-scale display type; a safe H1 is the most common template tell.
4. **Nothing real to look at** — empty figure slots, no face, no numbers. "The product is the hero" is the durable shift (Linear/Oxide pattern: real UI + hard numbers as both proof and decoration).
5. **Decoration that encodes nothing** — the node-graph motif underperforms as ornament; it becomes a signature if it visualizes something true once (delivery process, real architecture — Vercel blueprint-grid pattern).
6. **Missing micro-texture** — 4–8% grain on hero/ink surfaces is the current clean-vs-generic differentiator.
7. **Everything the same weight** — flat bordered cards everywhere; reserve panels for genuinely card-like content.

### Durable vs fad

**Durable & fits:** monochrome base + one accent (Stripe/Linear/Vercel formula — the green stays); real work as hero imagery; oversized editorial type; micro-texture; token-driven dark mode; schema.org/llms.txt.
**Fad / avoid:** kinetic typography, glass beyond nav, heavy 3D/WebGL, organic blobs, bento-everything, motion-heavy homepages.

### Conversion for German SMB buyers (NN/g, Baymard, German trust studies)

Value proposition lands within ~10s above the fold (84% attention gap); phone/click-to-call in header; a trust signal within view of *every* CTA; price **ranges** over „auf Anfrage"; one-step contact (embedded booking + ≤4-field form, never form-then-book, "optional" labels); founder photo + 3-sentence story mid-page; complete German trust layer (Impressum one click away, address = Google Maps, review stars with schema, current dates).

### Typography & color verdict

- **Display face: replace** (identity lever #1). Characterful serif (Fraunces-class) or signed grotesk (General Sans / Söhne-class).
- **Body: second priority** (IBM Plex Sans / Geist class, or keep short-term).
- **Mono: keep only if it shows real code/specs** — decorative uppercase labels are the tic.
- **Color: keep the green** (owner-confirmed). Fix monotony via range *within* the ladders, texture as interest-carrier, and the amber marking exactly one action class.

---

## 4. Owner feedback (2026-08-12)

1. **Complaints about the current design:** too repeated; not modern; doesn't feel consistent; the animation on the header; more than 20px padding on top; „Zum Inhalt springen" (skip link) flashes when switching pages; the text feels AI-written; font-size changes within a section feel weird.
2. **Constraints:** everything may change — brand kit included — **except the current green stays as primary color**.
3. **Available assets:** photo of the owner, company logo, testimonials. Screenshots/GIFs of the three systems: undecided.
4. **Business decisions (§2 takeaways):** not yet decided; explained separately.

---

## 5. Redesign direction (decided from 1–4)

1. **Fix the reported defects first:** skip-link flash on route change, header top spacing, header animation, intra-section type-size inconsistencies.
2. **Swap the display typography** and rescale the hero to editorial size; retire decorative mono-uppercase where it doesn't show real technology.
3. **Break the section rhythm:** fewer InkPanels, one full-bleed peak, quiet borderless sections between.
4. **Keep viridian as primary**; widen the used range of the ladders; add subtle grain texture to hero/ink surfaces.
5. **Humanize the copy** on hero and section leads (short, concrete, spoken German; no template cadence).
6. **Wire in the real assets as they arrive:** portrait, testimonials (name + trade + town + one outcome), one real number per project; screenshots when/if cleared.

---

## 6. Changes applied (2026-08-12, same day)

Implemented directly after §4/§5, verified with a full build, the repo's check scripts, and Playwright screenshots in both themes:

1. **Skip link** no longer flashes on page switches — visible on `:focus-visible` (keyboard) only ([shell.tsx](web/src/components/shell.tsx)).
2. **Header** tightened: 8px above a slimmer capsule, decorative sheen gradient removed, lighter shadow, slimmer CTA ([header.tsx](web/src/components/header.tsx), [globals.css](web/src/app/globals.css)).
3. **Display face swapped**: Space Grotesk → **Schibsted Grotesk** (tokens.json, layout.tsx, FONTS.md, visual-identity §6); hero display scale raised to clamp(…, 6rem). Logo SVGs/OG card still carry Space Grotesk outlines — regeneration is an open task (noted in FONTS.md).
4. **Mono-uppercase eyebrows retired** — sentence-case label with a single node dot; mono now only for tags and step numbers ([ui.tsx](web/src/components/ui.tsx)).
5. **Hero** rebuilt as a full-width typographic thesis; empty figure slot removed; proof pills became quiet dotted facts ([page.tsx](web/src/app/[lang]/page.tsx)).
6. **Services** became a hairline **price board** (four equal rows, price + delivery time right) replacing the two-big-two-small card grid.
7. **Type-size normalization**: InkPanel title = sibling card size, flagship project title = sibling size, FAQ questions body-face at lead size, buttons body-face.
8. **Grain texture** (4.5%, one element, inlined SVG noise) on hero and ink slabs; InkPanel got its missing border.
9. **Copy**: „wir" removed (2×), NBSP before € in rendered copy (11×), hero/approach leads de-mannerized, hero title wrap fixed with NBSP.
10. **Housekeeping**: root-redirect page moved off the rejected old palette (+ dark variant); availability month Januar → September (**owner must confirm**).

Open (needs owner input/assets): portrait photo, testimonials, per-project metric, screenshots, profile.ts identity fields, logo/OG regeneration in Schibsted Grotesk, §2 business decisions.

---

## 7. Second design pass (2026-08-12, evening) — „Ink & Paper"

The owner rejected the first pass as still too close to the old site. The second pass is a concept change, not a refinement:

**The page is framed in ink.** It opens on an ink slab (the deep green-black surface the brand already owned in its footer — dark in *both* themes) and closes on one; everything between is paper. New `Section ink` register, `ink`/`inkSecondary` button variants (fixed dark-surface values, like the ink text roles), fixed `ink-aurora`/`node-field-ink` washes (the theme-flipping page washes haze a dark ground).

**The node graph finally carries information.** New `SystemDiagram` component ([diagram.tsx](web/src/components/diagram.tsx)): the flagship project drawn as its real topology — CRM, Provisionsabrechnung and Vergleichsportal converging on one PostgreSQL hub, then one server — with localized mono labels. It replaced the empty figure slot in the work section; the drawing *is* the sales argument („drei Systeme, eine Datenbank").

**One list device site-wide.** The problem section's card grid became hairline definition rows (same device as the price board), with the „dritte Möglichkeit" as a single full-width ink slab — the frame's material reappearing mid-page exactly once.

**Rhythm:** ink hero → paper problem → tint price board → paper work (full-bleed, glow, diagram) → tint approach → paper FAQ → ink finale merging into the ink footer.

Verified: build passes, spacing/meta/copy checks pass, contrast pairs pass, screenshotted in both themes at 1440px (hero, problem rows, diagram, finale/footer merge all confirmed).

### 7.1 Follow-up polish (same evening)

Owner feedback: nav hover felt dated, top padding still broke the flow, and they like the clear liquid-glass language. Applied: **liquid pill nav hover** (translucent `color-mix` capsule under the pointer; active page holds the pill — replaces the colour fade), **tightened hero padding** and pulled every page's opening onto the ink slab (PageHero is now ink-framed like the homepage), and **clear glass on ink**: proof chips and the secondary ink button are now `glass-chip` (blur + translucent fill) — legitimate there because the ink surfaces carry node-field + aurora frequency for the blur to sample; paper keeps flat panels per the measured old-glass failure. Ground-up all-glass redesign discussed with the owner as an open direction decision.

### 7.2 Direction 1 committed: glass as the chrome-and-ink language

Owner chose direction 1 (glass on chrome + ink, deepened per iteration; no dark-only pivot). Applied: the **price board moved onto a full-bleed textured ink band** (`Section ink glow` = fixed ink washes + node field; ink-aware SectionHead/ArrowLink variants) — the page's commercial core now sits on the frame's material; the **mobile drawer shares the capsule's glass** (sibling, not nested — each samples the page once); **FAQ rows** get the liquid `color-mix` hover highlight (no blur on flat paper, by rule); the **availability line** is a glass chip in the ink finale; mobile capsule spacing tightened (horizontal overflow at 390px fixed). The `.glass-nav` rule comment now reads "navigation layer = capsule + drawer". Verified: build + spacing/meta/copy checks pass; screenshots at 1440px and 390px, drawer open, both row/band sections.

**Material rules as they now stand:** paper → flat `.panel`; ink → `glass-chip` for chips/secondary actions (node field + aurora provide the frequency blur needs); navigation layer → `.glass-nav`; interactive rows on paper → `.liquid-row` color-mix highlight, never blur.
