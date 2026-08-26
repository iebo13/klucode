# Photography sources

The originals, kept because the derivatives in `web/public/` are cropped and
compressed and cannot be re-derived from each other.

| Source | Ships as | Why it is not the same file |
|---|---|---|
| `founder-source.png` (1360x2048, 4.0 MB) | `web/public/founder.webp` (1000x1250) | Cropped to the 4:5 slot on the Über mich page, graded into the palette, and encoded as WebP. 4 MB of PNG is not shippable on a page whose own checklist sells „Ladezeit unter einer Sekunde". |

To re-derive after an edit to the source, from `web/`:

```
node tools/grade-portrait.mjs
```

That script replaced a `node -e '...'` one-liner that used to live in this
file, on 2026-08-26. Two reasons. A command in a README is a command somebody
retypes slightly differently, and the crop window is framed rather than
centred, so losing it costs the headroom the photograph was composed with. And
the derivative is no longer just a crop: the 26 August visual audit found the
untreated studio headshot to be the brightest rectangle on the site and 82 CIE
L\* away from everything around it, so it is now a duotone between
`viridian.950` and `stone.200` — every value in the picture is a value the rest
of the page is already made of. The reasoning for both ends of that map is in
the script.

`sharp` is already present as a Next.js dependency, so this needs no install.
