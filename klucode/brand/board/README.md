# Brand system board

Four sheets, 3000×~2400 px at 2× — the visual summary of the system for anyone
who is not going to read `03-visual-identity.md`.

| Sheet | Covers |
| --- | --- |
| `klucode-brand-system-1-logo.png` | Every lockup, the mark, favicon at 16–64px, avatar, LinkedIn banner |
| `klucode-brand-system-2-colour.png` | Full scales with measured contrast, the display-colour rule, proportion |
| `klucode-brand-system-3-type.png` | Three families with specimens, node textures, spacing, radius |
| `klucode-brand-system-4-glass.png` | The glass layer in both schemes, its four rules, and the contrast audit |

Use these when sending the brand to a printer, a client, or a collaborator. For
anything that needs to *change*, go to the source: `../tokens/tokens.json` and
`../logo/`.

## Regenerating

The board deliberately reuses the **website's own compiled CSS and self-hosted
fonts**, so every specimen renders in real Space Grotesk / Inter / JetBrains
Mono at the real token values. Nothing on the board is a mock-up of the system;
it *is* the system.

That does mean the site has to be built first:

```bash
cd ../../web && npm install && npm run build
python3 ../brand/board/build_board.py          # writes web/out/board.html
```

Then screenshot the `#sheet1` … `#sheet4` elements at
`deviceScaleFactor: 2`. Any headless browser will do; the repo used Chromium via
Playwright.

The script reads the current CSS filename and font class names out of
`web/out/de/index.html`, so it keeps working across rebuilds even though those
hashes change.
