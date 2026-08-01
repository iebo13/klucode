#!/usr/bin/env python3
"""
Generate the complete KluCode logo set as static SVG.

Every logo file in ../ is produced by this script. Do not hand-edit the SVGs —
change the constants here and re-run, so all variants stay in lockstep.

    pip install fonttools uharfbuzz brotli
    python3 build_logos.py

The wordmark is converted to outlines (real <path> data, no <text>), so the
files render identically everywhere without Space Grotesk installed. That is a
hard requirement for a logo: a <text> element silently falls back to Arial on
any machine that lacks the font, which would ship a broken brand.

Font: Space Grotesk (SIL Open Font License 1.1), Florian Karsten.
       https://github.com/floriankarsten/space-grotesk
The OFL permits embedding outlines in artwork like this. Attribution and the
licence live in ../FONTS.md.
"""

from __future__ import annotations

import os
import random
import urllib.request
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen

# --------------------------------------------------------------------------
# Brand constants — the single source of truth for colour and geometry.
# --------------------------------------------------------------------------

INK = "#0C1A15"  # near-black, green-shifted
VIRIDIAN = "#40826D"  # primary
PAPER = "#F2F4F1"  # off-white

FONT_URL = (
    "https://raw.githubusercontent.com/google/fonts/main/"
    "ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf"
)
WEIGHT = 700
TRACKING = -0.018  # em, tightened for a bold lockup

OUT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / ".cache"

# --- Mark geometry, in a 92 x 64 viewBox -----------------------------------
# `</K>` — the K is a five-node graph: four terminal nodes and one emphasised
# central junction.
#
# Two things this geometry gets right, learned by rendering the alternative:
#  * The stem is ONE continuous line from top node to bottom node, not two
#    segments meeting at the hub. Drawn as two segments with a fat hub, the
#    four edges read as an asterisk and the letter disappears.
#  * The hub is only ~1.4x the terminal nodes. Bigger, and it becomes a blob
#    that swallows the junction.
BRACKET_W = 4.0  # "thin angle brackets"
EDGE_W = 4.6  # the graph's edges read heavier than the punctuation
NODE_R = 4.2
HUB_R = 6.0

LT = [(17, 17), (8, 32), (17, 47)]  # <
SLASH = [(24, 47), (33, 17)]  # /
GT = [(75, 17), (84, 32), (75, 47)]  # >

HUB = (46, 32)
STEM = [(46, 14), (46, 50)]  # drawn as a single unbroken stroke
ARMS = [(65, 14), (65, 50)]  # branch off the hub
NODES = [*STEM, *ARMS]

MARK_W, MARK_H = 92.0, 64.0
# Cap height of the mark = the node-K's vertical extent.
MARK_CAP_TOP, MARK_CAP_BOTTOM = 14 - NODE_R, 50 + NODE_R
# Horizontal ink extent, used to trim transparent margin out of lockups.
MARK_INK_L, MARK_INK_R = 8 - BRACKET_W / 2, 84 + BRACKET_W / 2


# --------------------------------------------------------------------------
# Font handling
# --------------------------------------------------------------------------


def load_font() -> tuple[TTFont, bytes]:
    """Fetch Space Grotesk (cached) and pin the variable axis to Bold."""
    CACHE.mkdir(exist_ok=True)
    var_path = CACHE / "SpaceGrotesk-var.ttf"
    if not var_path.exists():
        urllib.request.urlretrieve(FONT_URL, var_path)

    static_path = CACHE / f"SpaceGrotesk-{WEIGHT}.ttf"
    if not static_path.exists():
        font = TTFont(var_path)
        instancer.instantiateVariableFont(font, {"wght": WEIGHT}, inplace=True)
        font.save(static_path)

    return TTFont(static_path), static_path.read_bytes()


def shape(text: str, font: TTFont, blob: bytes) -> list[dict]:
    """Shape `text` with HarfBuzz so real kerning is applied, then outline it.

    Returns one dict per glyph: its SVG path data (already flipped to y-down)
    and its pen position, both in font units.
    """
    face = hb.Face(blob)
    hb_font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf)

    upem = font["head"].unitsPerEm
    glyph_set = font.getGlyphSet()
    order = font.getGlyphOrder()

    out, x = [], 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:.1f}")
        glyph_set[order[info.codepoint]].draw(pen)
        out.append(
            {
                "d": pen.getCommands(),
                "x": x + pos.x_offset,
                "y": pos.y_offset,
            }
        )
        # HarfBuzz gives the advance; tracking is applied on top of it.
        x += pos.x_advance + TRACKING * upem

    # Trailing tracking is not part of the drawn width.
    return out, x - TRACKING * upem


# --------------------------------------------------------------------------
# SVG emission
# --------------------------------------------------------------------------


def svg_doc(width: float, height: float, body: str, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(width)} '
        f'{fmt(height)}" width="{fmt(width)}" height="{fmt(height)}" '
        f'role="img" aria-label="{title}">\n'
        f"  <title>{title}</title>\n"
        f"{body}"
        f"</svg>\n"
    )


def fmt(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return s if s else "0"


def graph_edges(indent: str) -> list[str]:
    """The K's edges: one unbroken stem, plus two arms branching off the hub."""
    return [
        f'{indent}<line x1="{fmt(STEM[0][0])}" y1="{fmt(STEM[0][1])}" '
        f'x2="{fmt(STEM[1][0])}" y2="{fmt(STEM[1][1])}"/>',
        *[
            f'{indent}<line x1="{fmt(HUB[0])}" y1="{fmt(HUB[1])}" '
            f'x2="{fmt(ax)}" y2="{fmt(ay)}"/>'
            for ax, ay in ARMS
        ],
    ]


def mark_body(
    bracket_color: str, graph_color: str, indent: str = "  ", dx: float = 0, dy: float = 0
) -> str:
    """The `</K>` mark. Brackets and graph are separately coloured."""
    t = f' transform="translate({fmt(dx)} {fmt(dy)})"' if (dx or dy) else ""

    def pts(p):
        return " ".join(f"{fmt(x)},{fmt(y)}" for x, y in p)

    lines = [
        f'{indent}<g{t}>',
        f'{indent}  <g fill="none" stroke="{bracket_color}" '
        f'stroke-width="{fmt(BRACKET_W)}" stroke-linecap="round" '
        f'stroke-linejoin="round">',
        f'{indent}    <polyline points="{pts(LT)}"/>',
        f'{indent}    <line x1="{fmt(SLASH[0][0])}" y1="{fmt(SLASH[0][1])}" '
        f'x2="{fmt(SLASH[1][0])}" y2="{fmt(SLASH[1][1])}"/>',
        f'{indent}    <polyline points="{pts(GT)}"/>',
        f"{indent}  </g>",
        f'{indent}  <g stroke="{graph_color}" stroke-width="{fmt(EDGE_W)}" '
        f'stroke-linecap="round">',
    ]
    lines.extend(graph_edges(indent + "    "))
    lines.append(f"{indent}  </g>")
    lines.append(f'{indent}  <g fill="{graph_color}">')
    for nx, ny in NODES:
        lines.append(
            f'{indent}    <circle cx="{fmt(nx)}" cy="{fmt(ny)}" r="{fmt(NODE_R)}"/>'
        )
    lines.append(
        f'{indent}    <circle cx="{fmt(HUB[0])}" cy="{fmt(HUB[1])}" r="{fmt(HUB_R)}"/>'
    )
    lines.append(f"{indent}  </g>")
    lines.append(f"{indent}</g>")
    return "\n".join(lines) + "\n"


def graph_only_body(color: str, indent: str, scale: float, dx: float, dy: float) -> str:
    """Just the node-K, for small sizes where the brackets would turn to mush."""
    lines = [
        f'{indent}<g transform="translate({fmt(dx)} {fmt(dy)}) scale({fmt(scale)})">',
        f'{indent}  <g stroke="{color}" stroke-width="{fmt(EDGE_W)}" '
        f'stroke-linecap="round">',
    ]
    lines.extend(graph_edges(indent + "    "))
    lines.append(f"{indent}  </g>")
    lines.append(f'{indent}  <g fill="{color}">')
    for nx, ny in NODES:
        lines.append(
            f'{indent}    <circle cx="{fmt(nx)}" cy="{fmt(ny)}" r="{fmt(NODE_R)}"/>'
        )
    lines.append(
        f'{indent}    <circle cx="{fmt(HUB[0])}" cy="{fmt(HUB[1])}" r="{fmt(HUB_R)}"/>'
    )
    lines.append(f"{indent}  </g>")
    lines.append(f"{indent}</g>")
    return "\n".join(lines) + "\n"


def constellation(seed: int, bg: str, on_dark: bool) -> str:
    """A sparse node graph, 1600x900, for use as a background texture.

    Nodes sit on a jittered grid so they read as organic without clustering;
    each connects only to near neighbours, which is what makes it look like a
    graph rather than a starfield. Density falls away toward the upper right so
    there is always somewhere clean to put a headline.
    """
    rng = random.Random(seed)
    W, H = 1600.0, 900.0
    cols, rows = 13, 8
    node_c = VIRIDIAN if not on_dark else "#5C9781"
    edge_c = "#AECFC1" if not on_dark else "#2B564A"

    pts: list[tuple[float, float, float]] = []
    for r in range(rows):
        for c in range(cols):
            # Falloff: dense lower-left, empty upper-right.
            weight = (c / (cols - 1)) * 0.5 + (1 - r / (rows - 1)) * 0.5
            if rng.random() < weight * 0.62:
                continue
            x = (c + 0.5) / cols * W + rng.uniform(-38, 38)
            y = (r + 0.5) / rows * H + rng.uniform(-30, 30)
            pts.append((x, y, rng.uniform(2.6, 6.4)))

    edges: set[tuple[int, int]] = set()
    for i, (x1, y1, _) in enumerate(pts):
        near = sorted(
            (
                (j, (x1 - x2) ** 2 + (y1 - y2) ** 2)
                for j, (x2, y2, _) in enumerate(pts)
                if j != i
            ),
            key=lambda t: t[1],
        )[: rng.choice((1, 1, 2))]
        for j, d2 in near:
            if d2 < 250**2:
                edges.add((min(i, j), max(i, j)))

    lines = [
        f'  <rect width="{fmt(W)}" height="{fmt(H)}" fill="{bg}"/>',
        f'  <g stroke="{edge_c}" stroke-width="1.6" stroke-linecap="round" opacity="0.85">',
    ]
    for i, j in sorted(edges):
        x1, y1, _ = pts[i]
        x2, y2, _ = pts[j]
        lines.append(
            f'    <line x1="{fmt(x1)}" y1="{fmt(y1)}" '
            f'x2="{fmt(x2)}" y2="{fmt(y2)}"/>'
        )
    lines.append("  </g>")
    lines.append(f'  <g fill="{node_c}">')
    for x, y, r in pts:
        lines.append(f'    <circle cx="{fmt(x)}" cy="{fmt(y)}" r="{fmt(r)}"/>')
    lines.append("  </g>")

    return svg_doc(W, H, "\n".join(lines) + "\n", "KluCode")


def wordmark_body(
    glyphs, split_at: int, color_a: str, color_b: str, upem: int, cap: int,
    cap_px: float, x0: float, baseline: float, indent: str = "  ",
) -> str:
    """Lay the outlined glyphs out at a given cap height, in two colours."""
    s = cap_px / cap
    lines = []
    for name, color, sl in (
        ("klu", color_a, slice(0, split_at)),
        ("code", color_b, slice(split_at, None)),
    ):
        lines.append(f'{indent}<g fill="{color}" id="{name}">')
        for g in glyphs[sl]:
            tx = x0 + g["x"] * s
            ty = baseline - g["y"] * s
            lines.append(
                f'{indent}  <path transform="translate({fmt(tx)} {fmt(ty)}) '
                f'scale({fmt(s)} {fmt(-s)})" d="{g["d"]}"/>'
            )
        lines.append(f"{indent}</g>")
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------
# The files
# --------------------------------------------------------------------------


def main() -> None:
    font, blob = load_font()
    upem = font["head"].unitsPerEm
    cap = font["OS/2"].sCapHeight

    glyphs, adv = shape("KluCode", font, blob)
    split = 3  # K | l | u  then  C | o | d | e
    written = []

    def write(name: str, content: str) -> None:
        (OUT / name).write_text(content)
        written.append(name)

    # -- 1. The mark, on its own ------------------------------------------
    for name, brackets, graph in (
        ("klucode-mark.svg", INK, VIRIDIAN),
        ("klucode-mark-ink.svg", INK, INK),
        ("klucode-mark-paper.svg", PAPER, PAPER),
        ("klucode-mark-on-dark.svg", PAPER, VIRIDIAN),
    ):
        write(
            name,
            svg_doc(MARK_W, MARK_H, mark_body(brackets, graph), "KluCode"),
        )

    # -- 2. Horizontal lockup ---------------------------------------------
    # The mark's cap height is matched to 1.32x the wordmark's, which optically
    # balances a wide mark against a bold wordmark.
    CAP_PX = 48.0
    mark_cap = MARK_CAP_BOTTOM - MARK_CAP_TOP
    mark_scale = (CAP_PX * 1.32) / mark_cap
    mark_w_s, mark_h_s = MARK_W * mark_scale, MARK_H * mark_scale
    gap = CAP_PX * 0.62
    pad = CAP_PX * 0.5

    word_w = adv * (CAP_PX / cap)
    # Trim the mark's own transparent margin so the optical gap is the real gap.
    mark_left_trim = MARK_INK_L * mark_scale
    mark_right_trim = (MARK_W - MARK_INK_R) * mark_scale
    mark_ink_w = mark_w_s - mark_left_trim - mark_right_trim

    total_w = pad + mark_ink_w + gap + word_w + pad
    total_h = pad + max(mark_h_s, CAP_PX) + pad
    mid = total_h / 2
    baseline = mid + CAP_PX / 2
    mark_dy = mid - mark_h_s / 2

    for name, bracket_c, graph_c, klu_c, code_c in (
        ("klucode-logo-horizontal.svg", INK, VIRIDIAN, INK, VIRIDIAN),
        ("klucode-logo-horizontal-on-dark.svg", PAPER, VIRIDIAN, PAPER, VIRIDIAN),
        ("klucode-logo-horizontal-ink.svg", INK, INK, INK, INK),
        ("klucode-logo-horizontal-paper.svg", PAPER, PAPER, PAPER, PAPER),
    ):
        body = (
            f'  <g transform="translate({fmt(pad - mark_left_trim)} {fmt(mark_dy)}) '
            f'scale({fmt(mark_scale)})">\n'
            + mark_body(bracket_c, graph_c, indent="    ")
            + "  </g>\n"
            + wordmark_body(
                glyphs, split, klu_c, code_c, upem, cap, CAP_PX,
                pad + mark_ink_w + gap, baseline,
            )
        )
        write(name, svg_doc(total_w, total_h, body, "KluCode"))

    # -- 3. Stacked lockup -------------------------------------------------
    s_cap = 40.0
    s_mark_scale = (s_cap * 2.05) / mark_cap
    s_mark_w, s_mark_h = MARK_W * s_mark_scale, MARK_H * s_mark_scale
    s_word_w = adv * (s_cap / cap)
    s_pad = s_cap * 0.6
    s_gap = s_cap * 0.45
    s_total_w = max(s_mark_w, s_word_w) + 2 * s_pad
    s_total_h = s_pad + s_mark_h + s_gap + s_cap + s_pad
    body = (
        f'  <g transform="translate({fmt((s_total_w - s_mark_w) / 2)} {fmt(s_pad)}) '
        f'scale({fmt(s_mark_scale)})">\n'
        + mark_body(INK, VIRIDIAN, indent="    ")
        + "  </g>\n"
        + wordmark_body(
            glyphs, split, INK, VIRIDIAN, upem, cap, s_cap,
            (s_total_w - s_word_w) / 2, s_pad + s_mark_h + s_gap + s_cap,
        )
    )
    write("klucode-logo-stacked.svg", svg_doc(s_total_w, s_total_h, body, "KluCode"))

    # -- 4. Wordmark alone -------------------------------------------------
    w_pad = CAP_PX * 0.25
    write(
        "klucode-wordmark.svg",
        svg_doc(
            word_w + 2 * w_pad,
            CAP_PX + 2 * w_pad,
            wordmark_body(
                glyphs, split, INK, VIRIDIAN, upem, cap, CAP_PX,
                w_pad, w_pad + CAP_PX,
            ),
            "KluCode",
        ),
    )

    # -- 5. Favicon + avatar ----------------------------------------------
    # Below ~32px the brackets collapse, so the small-size lockup is the
    # node-K alone, knocked out of a viridian tile.
    graph_l = HUB[0] - HUB_R
    graph_w = (ARMS[0][0] + NODE_R) - graph_l
    graph_h = MARK_CAP_BOTTOM - MARK_CAP_TOP

    def tile(size: float, radius: float, bg: str, fg: str, fill_ratio: float) -> str:
        sc = (size * fill_ratio) / graph_h
        dx = (size - graph_w * sc) / 2 - graph_l * sc
        dy = (size - graph_h * sc) / 2 - MARK_CAP_TOP * sc
        return svg_doc(
            size,
            size,
            f'  <rect width="{fmt(size)}" height="{fmt(size)}" '
            f'rx="{fmt(radius)}" fill="{bg}"/>\n'
            + graph_only_body(fg, "  ", sc, dx, dy),
            "KluCode",
        )

    # The tile is filled harder than the standalone mark would be: at 16px
    # every unit of margin costs a legible pixel.
    write("klucode-favicon.svg", tile(64, 14, VIRIDIAN, PAPER, 0.66))
    write("klucode-favicon-dark.svg", tile(64, 14, INK, VIRIDIAN, 0.66))
    write("klucode-avatar.svg", tile(512, 0, INK, VIRIDIAN, 0.52))

    # -- 6. Open Graph card ------------------------------------------------
    og_w, og_h = 1200.0, 630.0
    og_cap = 96.0
    og_mark_scale = (og_cap * 1.32) / mark_cap
    og_word_w = adv * (og_cap / cap)
    og_mark_ink_w = (MARK_INK_R - MARK_INK_L) * og_mark_scale
    og_gap = og_cap * 0.62
    og_lock_w = og_mark_ink_w + og_gap + og_word_w
    og_x = (og_w - og_lock_w) / 2
    og_mid = og_h / 2 - 34
    og_body = (
        f'  <rect width="{fmt(og_w)}" height="{fmt(og_h)}" fill="{PAPER}"/>\n'
        f'  <rect y="{fmt(og_h - 10)}" width="{fmt(og_w)}" height="10" '
        f'fill="{VIRIDIAN}"/>\n'
        f'  <g transform="translate({fmt(og_x - MARK_INK_L * og_mark_scale)} '
        f'{fmt(og_mid - MARK_H * og_mark_scale / 2)}) scale({fmt(og_mark_scale)})">\n'
        + mark_body(INK, VIRIDIAN, indent="    ")
        + "  </g>\n"
        + wordmark_body(
            glyphs, split, INK, VIRIDIAN, upem, cap, og_cap,
            og_x + og_mark_ink_w + og_gap, og_mid + og_cap / 2,
        )
    )
    # Tagline, outlined from the same family at a lighter optical size.
    tag_glyphs, tag_adv = shape("Klug gebaut.", font, blob)
    tag_cap = 34.0
    tag_w = tag_adv * (tag_cap / cap)
    og_body += wordmark_body(
        tag_glyphs, 0, VIRIDIAN, VIRIDIAN, upem, cap, tag_cap,
        (og_w - tag_w) / 2, og_mid + 132,
    )
    write("klucode-og.svg", svg_doc(og_w, og_h, og_body, "KluCode — Klug gebaut."))

    # -- 7. LinkedIn company banner (1128 x 191) ---------------------------
    b_w, b_h = 1128.0, 191.0
    b_cap = 44.0
    b_mark_scale = (b_cap * 1.32) / mark_cap
    b_mark_ink_w = (MARK_INK_R - MARK_INK_L) * b_mark_scale
    b_gap = b_cap * 0.62
    b_x = 64.0
    b_mid = b_h / 2
    tag2, tag2_adv = shape("Klug gebaut.", font, blob)
    tag2_cap = 19.0
    b_body = (
        f'  <rect width="{fmt(b_w)}" height="{fmt(b_h)}" fill="{INK}"/>\n'
        f'  <g transform="translate({fmt(b_x - MARK_INK_L * b_mark_scale)} '
        f'{fmt(b_mid - MARK_H * b_mark_scale / 2 - 12)}) scale({fmt(b_mark_scale)})">\n'
        + mark_body(PAPER, VIRIDIAN, indent="    ")
        + "  </g>\n"
        + wordmark_body(
            glyphs, split, PAPER, VIRIDIAN, upem, cap, b_cap,
            b_x + b_mark_ink_w + b_gap, b_mid + b_cap / 2 - 12,
        )
        + wordmark_body(
            tag2, 0, VIRIDIAN, VIRIDIAN, upem, cap, tag2_cap,
            b_x + b_mark_ink_w + b_gap, b_mid + b_cap / 2 + 26,
        )
    )
    write("klucode-linkedin-banner.svg", svg_doc(b_w, b_h, b_body, "KluCode"))

    # -- 8. Node-constellation textures ------------------------------------
    # The house graphic device from 03-visual-identity.md §7: the logo's own
    # node graph, scaled up. Vector rather than a raster image, so it stays
    # crisp at any size and carries exact brand hex values.
    #
    # Seeded, so re-running produces byte-identical files. Never make this
    # unseeded — a texture that changes on every build is not a brand asset.
    for name, seed, bg, on_dark in (
        ("klucode-texture-light.svg", 7, PAPER, False),
        ("klucode-texture-dark.svg", 7, INK, True),
    ):
        write(name, constellation(seed, bg, on_dark))

    print(f"Wrote {len(written)} files to {OUT}:")
    for n in sorted(written):
        print(f"  {n}  ({os.path.getsize(OUT / n):,} bytes)")


if __name__ == "__main__":
    main()
