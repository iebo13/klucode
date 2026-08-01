# Typefaces and licensing

All three faces are under the **SIL Open Font License 1.1 (OFL)**. That was a
deliberate constraint, for three reasons:

1. **Zero licence cost**, now and as the business grows. No per-seat, no
   pageview tier, no renewal that lapses quietly.
2. **Self-hosting is permitted**, which is what makes the DSGVO position clean
   (see `03-visual-identity.md` §6.2).
3. **Outlines may be embedded in artwork**, which is what the logo files do.

| Role    | Typeface       | Designer                | Source                                                    |
| ------- | -------------- | ----------------------- | --------------------------------------------------------- |
| Display | Space Grotesk  | Florian Karsten         | https://github.com/floriankarsten/space-grotesk           |
| Body    | Inter          | Rasmus Andersson        | https://github.com/rsms/inter                             |
| Mono    | JetBrains Mono | JetBrains               | https://github.com/JetBrains/JetBrainsMono                |

---

## What the OFL requires of you

- **Keep the licence with the fonts** wherever you redistribute the font files
  themselves. Serving them from your own website counts as distribution — keep
  an `OFL.txt` alongside the `.woff2` files if you ever self-host by hand.
- **Do not sell the fonts on their own.** Selling a website that uses them is
  entirely fine.
- **If you modify a font, rename it.** Reserved Font Names may not be reused.
- Artwork made *with* the fonts — the logo files in `logo/` — is yours. Embedded
  outlines are not a redistribution of the font software.

## In the website

`web/` uses `next/font/google`, which downloads each face **at build time** and
serves it from your own domain. Nothing is requested from Google at runtime, so
no visitor IP reaches a third party. The font files end up in your build output,
which is why the licence note above matters.

## In the logo files

The wordmark in every file under `logo/` is **outlined paths**, generated from
Space Grotesk Bold by `logo/_build/build_logos.py`.

This is not a stylistic choice. An SVG logo containing a `<text>` element
silently falls back to Arial on any machine without the font installed — a
client's laptop, a printer's RIP, a partner's slide deck. Outlines render
identically everywhere, forever. It is also why the SVGs must never be
hand-edited to "fix" the wordmark: regenerate them instead.

## If you ever want to buy a face

The one place paying would be defensible is the display face, to make the
wordmark less recognisable as a free font. Reasonable commercial alternatives in
the same geometric-grotesque register: **Söhne** (Klim), **Aeonik** (CoType),
**GT Walsheim** (Grilli). Expect €200–600 for a desktop plus web licence.

Do not do this in year one. Nobody has ever chosen a developer because of the
typeface, and the money is better spent on the Berufshaftpflicht.
