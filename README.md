# KluCode

Brand kit and website for **KluCode**, a one-person software studio in
Düsseldorf: the strategy the brand rests on, the voice it speaks in, the visual
system, and a production-ready bilingual website.

**Live preview:** https://iebo13.github.io/klucode/ ·
**Production:** klucode.de (static export uploaded to Plesk — see `web/README.md`)

```
├── brand/
│   ├── 01-strategy.md          positioning, the name, audiences, offers, proof
│   ├── 02-voice.md             voice & tone, Sie/du, phrase bank, templates
│   ├── 03-visual-identity.md   logo, colour, liquid glass, type, imagery
│   ├── 04-launch-playbook.md   pricing, German admin checklist, first 90 days
│   ├── FONTS.md                licensing
│   ├── board/                  the system as four PNG sheets
│   ├── logo/                   17 SVGs — all generated, never hand-edited
│   └── tokens/                 the OKLCH generator, tokens.json, generated CSS
└── web/                        Next.js 15, static export, DE + EN
```

---

## Start here

1. **`brand/01-strategy.md`** — every other file is downstream of it. If
   anything ever contradicts it, that file wins.
2. **`brand/04-launch-playbook.md` §3** — the 90-day plan, and the four name
   checks to run _before_ spending anything on this identity.
3. **`web/README.md`** — how to run and deploy the site.

---

## The short version

**Name.** _Klu_ is from **Klusmann**, and from German **_klug_** — smart,
considered — and it reads as English **_clue_**. The surname says _who_, _klug_
says _how_, _clue_ says _what you get_. All three point at the same claim: the
value is the thinking that happens before the typing.

**Positioning.** KluCode builds the one system a business actually runs on — and
builds it in weeks, not quarters. One engineer, end to end, at a fixed price
agreed before anything starts.

**Tagline.** „Klug gebaut." (DE) · "Clever, not complicated." (EN)

**The AI question.** All three delivered projects were built with AI-assisted
development. The site leads with the _outcome_ — fixed price, weeks not months —
and explains the method openly on `/ansatz`, including a head-on answer to
_„Schreibt das nicht einfach eine KI?"_. Leading with the tooling invites the
objection before any value is established; hiding it would be worse, because it
is true, verifiable, and the honest answer to "how are you this fast?".

**Colour.** Deep-forest viridian `#5EA472`, ink `#1C201C`, paper `#F5F8F6`.
Both scales are **generated in OKLCH** by `brand/tokens/build_palette.py` — never
hand-pick a hex. The first palette was hand-picked and had uneven lightness
steps (ΔL 0.038–0.129), a chroma-starved brand step, and "neutrals" carrying
enough green to fight the brand colour. That is what made it look muddy.
⚠️ Viridian `500` is a **display colour**: 2.79:1 on paper. Text and buttons use
`viridian-700`. Measured, not assumed — see `brand/03-visual-identity.md` §5.

---

## Running the site

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # → web/out/, static, deployable anywhere
```

## Regenerating the assets

Nothing under `brand/logo/` or `brand/tokens/tokens.css` is written by hand.

```bash
pip install fonttools uharfbuzz brotli
python3 brand/tokens/build_palette.py      # the OKLCH scales -> tokens.json
python3 brand/tokens/build_css.py          # tokens.css, in both places it is needed
python3 brand/logo/_build/build_logos.py   # 17 SVGs, colours read from tokens.json
```

`brand/tokens/tokens.json` is the single source of truth for colour, type and
spacing. `web/tailwind.config.ts` imports it directly and the logo generator
reads its colours from it, so nothing can drift.

```bash
python3 brand/tokens/check_contrast.py    # every colour pair against its tier
```

The site's own images are generated too, and both scripts run from `web/`:

```bash
node tools/grade-portrait.mjs   # public/founder.webp, cropped and duotoned
node tools/shoot-revento.mjs    # public/revento-*.webp, needs the app on :5173
```

The crossroads section is one Blender scene that leaves the file twice. On a
laptop with WebGL it is drawn live, in three.js, on the KluCode K; where a
browser cannot make a context it is five pre-rendered stills of the same place.
Both come out of the same three scripts, run from `web/` in order. These are
the stills and the poster:

```bash
node tools/blender/capture-textures.mjs tools/blender/textures
#   the three screen textures crossroads.py loads (needs a built, served site)
blender -b -P tools/blender/crossroads.py -- --out tools/blender/renders --samples 128 --scale 2 --shots junction,website,app,capacity,care
blender -b -P tools/blender/crossroads.py -- --out tools/blender/poster --frame poster --samples 128
#   the five free-frame stills and the wide poster frame, each with anchors.json, the K layout by default now
node tools/blender/emit-stills.mjs --renders tools/blender/renders --poster tools/blender/poster
#   public/crossroads/*.webp, public/crossroads*.webp, src/components/crossroads/stills.ts
```

The same scene is also baked for the live version of the section, which is
three more lines from `web/` and about half an hour of CPU:

```bash
blender -b -P tools/blender/crossroads.py -- --bake tools/blender/scene --bake-samples 128
#   four lightmaps, the floor, four glTF bodies and scene.json, none of it committed
node tools/blender/emit-scene.mjs --bake tools/blender/scene
#   public/crossroads/scene/*, src/components/crossroads/scene-manifest.ts
node tools/blender/viewer/serve.mjs & node tools/blender/viewer/shoot.mjs
#   the six poses in a browser beside the Cycles renders, for judging the bake
```

Every render directory is gitignored working output: what ships out of them
is the WebP and the glTF in `public/` and the numbers baked into `stills.ts`
and `scene-manifest.ts`, and the emitters are the only things that write either.

Looking at the section, and timing it, needs a built site on a server first
(`npm run build`, then
`python3 -m http.server 4173 --bind 127.0.0.1 --directory out &`):

```bash
node tools/shoot.mjs
#   shots/*.png at 1024x736, 1440x900 and 1920x1080, and the boxes it measured
#   --dark for the dark theme, --flight for the two frames between the stops,
#   SHOOT_WORLD=stills for the fallback world on a browser that can draw
node tools/fps.mjs
#   the flight timed on this machine's graphics card, at pixel ratio 1 and 2
CROSSROADS_GPU=1 npm run test:e2e -- --project=gpu
#   the same measurement as a gate: mean under 17.5ms, 95th percentile under 25
```

The last two open a window on your desktop, and have to. Headless Chromium has
no graphics card and draws WebGL through SwiftShader on the processor, where
the flight measures a mean frame gap of 517.5ms against 8.3ms headed on this
laptop, so a headless timing run would measure the processor and report it as
the frame rate. That is why the `gpu` project does not exist unless
`CROSSROADS_GPU` is set: `npm run test:e2e` on its own stays headless and
silent. The same processor is why CI runs that suite with
`CROSSROADS_WORLD=stills`, which refuses WebGL to every page and skips the
tests about the live scene itself: GitHub's runner drew it at about three
seconds a frame, and the live-world tests are a gate this machine runs
before a merge.

---

## What still needs you

The kit is complete; these are the parts only you can supply.

| What                                                        | Where                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| The hosting provider's name and address                     | `web/src/content/profile.ts` — the Impressum shows a loud warning until done |
| Screenshots of the other **two** projects                   | run `node tools/shoot-revento.mjs` for the pattern, then fill `shot` in `web/src/content/{de,en}.ts`. Needs written client release first. |
| Client testimonials and one real number per project         | `web/src/content/{de,en}.ts` → `work.projects`                         |
| A legal review of Impressum + Datenschutz                   | before launch                                                          |
| The four name checks (domain, DPMA/EUIPO, handles, register) | before anything is printed                                             |

The portrait and the first project's screenshots are done: `founder.webp` is
generated by `web/tools/grade-portrait.mjs` and the REVENTO shots by
`web/tools/shoot-revento.mjs`. Neither is hand-edited, for the same reason
nothing under `brand/logo/` is.

The written material is researched and current as of August 2026, but it is not
legal or tax advice. `brand/04-launch-playbook.md` is written to be taken into a
_Steuerberater_'s office so that meeting costs one hour instead of three.
