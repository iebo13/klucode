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

---

## What still needs you

The kit is complete; these are the parts only you can supply.

| What                                                        | Where                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Name, address, phone, email, VAT ID                         | `web/src/content/profile.ts` — the site shows a loud warning until done |
| A portrait photograph                                       | `web/public/portrait.jpg`                                              |
| Screenshots of the three projects                           | `web/public/`, then the project pages                                  |
| Client testimonials and one real number per project         | `web/src/content/{de,en}.ts` → `work.projects`                         |
| A legal review of Impressum + Datenschutz                   | before launch                                                          |
| The four name checks (domain, DPMA/EUIPO, handles, register) | before anything is printed                                             |

The written material is researched and current as of August 2026, but it is not
legal or tax advice. `brand/04-launch-playbook.md` is written to be taken into a
_Steuerberater_'s office so that meeting costs one hour instead of three.
