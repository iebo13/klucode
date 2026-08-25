# Photography sources

The originals, kept because the derivatives in `web/public/` are cropped and
compressed and cannot be re-derived from each other.

| Source | Ships as | Why it is not the same file |
|---|---|---|
| `founder-source.png` (1360x2048, 4.0 MB) | `web/public/founder.webp` (1000x1250, 64 kB) | Cropped to the 4:5 slot on the Über mich page and encoded as WebP. 4 MB of PNG is not shippable on a page whose own checklist sells „Ladezeit unter einer Sekunde". |

To re-derive after an edit to the source, from `web/`:

```
node -e '
require("sharp")("../brand/photos/founder-source.png")
  .extract({ left: 0, top: 140, width: 1360, height: 1700 })
  .resize(1000, 1250, { fit: "cover" })
  .webp({ quality: 82 })
  .toFile("public/founder.webp");
'
```

The extract window is framed rather than centred: the hair starts around y 310
and the chin around y 890, so a 1700-tall window from y 140 puts the head a
tenth of the way down the frame and ends at mid-jacket. A centred crop takes
the same number of pixels off the top and cuts into the headroom.

`sharp` is already present as a Next.js dependency, so this needs no install.
