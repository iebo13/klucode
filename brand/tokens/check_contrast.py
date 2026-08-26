#!/usr/bin/env python3
"""Assert every colour pair in tokens.json meets its accessibility threshold.

    python3 check_contrast.py            # table + verdict, exit 1 on failure
    python3 check_contrast.py --quiet    # failures only

WHY THIS EXISTS
---------------
Three defects shipped that a script this small would have caught on the day
they were written:

  * viridian-500 was used as `text-brand` on the accent span in the 80px hero
    h1. It measures 2.79:1 on paper. tokens.css's own header comment said
    viridian-500 is display-only and text must use brandText/brandAction; the
    hero ignored it, so the biggest word on the site failed AA.
  * The same viridian-500 was the fill for bullet dots and the FAQ "+"
    affordance — non-text UI, which WCAG 1.4.11 puts at 3:1, and which it
    missed everywhere.
  * `surface` and `surfaceRaised` were both stone-50 in light mode: a 1.0:1
    elevation step, i.e. no elevation. The glass material existed to fake it.

Each of those is one subtraction away from being obvious. None of them was
obvious by eye, which is the entire argument for measuring.

THE TIERS
---------
  TEXT      4.5:1  WCAG 1.4.3, normal-size text
  LARGE     3.0:1  WCAG 1.4.3, >=24px or >=18.66px bold
  NONTEXT   3.0:1  WCAG 1.4.11, graphical objects and UI component state —
                   bullet dots, the FAQ affordance, focus rings, accent rules
  CONTROL   3.0:1  WCAG 1.4.11 again, but specifically the BOUNDARY OF A
                   CONTROL: a form field's edge, and the sticky capsule's.
  BOUNDARY  1.4:1  panel edges and dividers. NOT a WCAG number: a panel border
                   is decorative reinforcement of an elevation step that also
                   carries a fill difference, so 1.4.11 does not bind it. It is
                   here because 1.007:1 shipped once and must not again.
  ELEVATION 1.15:1 raised surface against the page it sits on

WHY CONTROL AND BOUNDARY ARE TWO TIERS
--------------------------------------
The 26 August visual audit measured /kontakt and found four input boxes with
no edges: a fill 1.26:1 against the page and a border 1.41:1 against that fill.
Both cleared BOUNDARY, because BOUNDARY is the tier for a panel edge, and a
form field is not a panel — 1.4.11 binds it at 3:1 and it was failing by a
factor of two.

The audit's own prescription was to raise `border` itself and assert 3:1 on it.
That is not what happened here, and the reason is worth stating: `border` is
the edge of every card on the site, and at 3:1 in dark mode it lands around
stone.550, which outlines every panel on the page in a mid grey. The rule
1.4.11 states is about controls, so the ROLES were split instead —
`fieldSurface` and `fieldBorder` are new, they are held to CONTROL, and
`border` keeps BOUNDARY and keeps looking like a hairline. `navBorder` moves to
CONTROL as well: the capsule is a floating control surface over content it does
not own, which is the argument its own comment already made.

THE NAV COMPOSITE CHECK
-----------------------
The header capsule is translucent and STICKY, so its effective background is
whatever is passing underneath — including the ink footer, which is the worst
case by a distance. Declared CSS values lie the moment translucency is
involved, so the nav fill is composited over every backdrop it can cross and
the nav text roles are measured against the result. This is what pins the fill
opacity: it is a legibility floor, not a taste setting.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOKENS = json.loads((HERE / "tokens.json").read_text())

TEXT, LARGE, NONTEXT, CONTROL, BOUNDARY, ELEVATION = 4.5, 3.0, 3.0, 3.0, 1.4, 1.15


# --------------------------------------------------------------------------
# colour maths
# --------------------------------------------------------------------------


def _lin(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _rgb(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    return tuple(float(int(h[i : i + 2], 16)) for i in (0, 2, 4))


def luminance(hexv: str) -> float:
    r, g, b = (_lin(c) for c in _rgb(hexv))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg: str, bg: str) -> float:
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def lstar(hexv: str) -> float:
    """CIE L*, 0 to 100. The unit the grounds are separated in — see GROUNDS."""
    y = luminance(hexv)
    return 116 * (y ** (1 / 3)) - 16 if y > 216 / 24389 else y * 24389 / 27


def chroma(hexv: str) -> float:
    """OKLCH chroma. How far off the neutral axis a colour sits."""
    r, g, b = (_lin(c) for c in _rgb(hexv))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    a_ = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    b_ = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return (a_ * a_ + b_ * b_) ** 0.5


RGBA = re.compile(r"rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)")


def composite(layer: str, backdrop: str) -> str:
    """Flatten an `rgba(...)` layer over an opaque hex backdrop.

    Source-over, in sRGB, because that is what the compositor does to a
    background-color — it does not linearise first.
    """
    m = RGBA.match(layer.strip())
    if not m:
        raise ValueError(f"not an rgba() colour: {layer!r}")
    lr, lg, lb = (float(m.group(i)) for i in (1, 2, 3))
    alpha = float(m.group(4)) if m.group(4) else 1.0
    br, bg_, bb = _rgb(backdrop)
    out = (
        alpha * lr + (1 - alpha) * br,
        alpha * lg + (1 - alpha) * bg_,
        alpha * lb + (1 - alpha) * bb,
    )
    return "#" + "".join(f"{round(max(0.0, min(255.0, c))):02X}" for c in out)


# --------------------------------------------------------------------------
# token lookup
# --------------------------------------------------------------------------


def swatch(ref: str) -> str:
    """'viridian.700' -> '#396C43'."""
    group, step = ref.split(".")
    return TOKENS["color"][group][step]["value"]


def role(mode: str, name: str) -> str:
    return swatch(TOKENS["role"][mode][name])


# --------------------------------------------------------------------------
# the pairs
# --------------------------------------------------------------------------


def pairs(mode: str) -> list[tuple[str, str, str, float, str]]:
    """(label, fg, bg, threshold, tier) for one colour scheme."""
    r = lambda n: role(mode, n)
    out: list[tuple[str, str, str, float, str]] = []

    surfaces = [
        ("page", r("surface")),
        ("panel", r("surfaceRaised")),
        ("tint", r("surfaceAlt")),
    ]

    # --- running text on every surface it can land on ---------------------
    for text_role in ("text", "textMuted", "brandText"):
        for sname, sval in surfaces:
            out.append((f"{text_role} on {sname}", r(text_role), sval, TEXT, "TEXT"))

    # --- links, buttons, focus -------------------------------------------
    out += [
        ("brandAction as link text on page", r("brandAction"), r("surface"), TEXT, "TEXT"),
        ("brandAction as link text on panel", r("brandAction"), r("surfaceRaised"), TEXT, "TEXT"),
        ("button label on brandAction", r("onBrand"), r("brandAction"), TEXT, "TEXT"),
    ]

    # --- non-text UI: dots, rules, affordances, the focus ring ------------
    # This is the tier viridian-500 failed. The `brand` role is the fill for
    # every bullet dot, accent rule and disclosure affordance on the site, so
    # it is a graphical object under 1.4.11 and owes 3:1, not 2.79:1.
    for sname, sval in surfaces:
        out.append((f"brand fill (dots, rules) on {sname}", r("brand"), sval, NONTEXT, "NONTEXT"))
    out += [
        ("focus ring on page", r("brandAction"), r("surface"), NONTEXT, "NONTEXT"),
        ("focus ring on panel", r("brandAction"), r("surfaceRaised"), NONTEXT, "NONTEXT"),
        ("focus ring on tint", r("brandAction"), r("surfaceAlt"), NONTEXT, "NONTEXT"),
    ]
    # The availability status dot — the only place the warm counterpoint is
    # used. Its lightness was chosen to be the brightest step that still clears
    # this row, so this row is what pins it.
    for sname, sval in surfaces:
        out.append((f"accentWarm dot on {sname}", r("accentWarm"), sval, NONTEXT, "NONTEXT"))

    # --- the ink slab at the foot of the page -----------------------------
    for t in ("inkText", "inkTextMuted", "inkTextFaint", "inkAccent"):
        out.append((f"{t} on inkSurface", r(t), r("inkSurface"), TEXT, "TEXT"))
    out.append(
        ("inkBorder on inkSurface", r("inkBorder"), r("inkSurface"), BOUNDARY, "BOUNDARY")
    )

    # --- panel edges and the elevation step they reinforce ----------------
    for sname, sval in surfaces:
        out.append((f"border on {sname}", r("border"), sval, BOUNDARY, "BOUNDARY"))
    out += [
        ("panel vs page", r("surfaceRaised"), r("surface"), ELEVATION, "ELEVATION"),
        ("panel vs tint", r("surfaceRaised"), r("surfaceAlt"), ELEVATION, "ELEVATION"),
    ]

    # --- form controls: 1.4.11 binds these at 3:1, not at BOUNDARY --------
    # The BORDER is the boundary and it is measured against its own fill and
    # against every ground a field can land on, because that is the pair 1.4.11
    # is about and the one that was failing at 1.41:1.
    #
    # The FILL is only measured against the page. A field on this site sits on
    # the page and nowhere else, and asking a fill to step away from a raised
    # panel as well would pin fieldSurface between two surfaces it has no room
    # between — in light mode a white field on a white panel is 1.00:1 and it
    # is still an obvious field, because it has a 3:1 edge. The edge is the
    # requirement; the fill is a courtesy where there is room for one.
    for sname, sval in surfaces:
        out.append((f"field border on {sname}", r("fieldBorder"), sval, CONTROL, "CONTROL"))
    out += [
        ("field fill on page", r("fieldSurface"), r("surface"), ELEVATION, "ELEVATION"),
        (
            "field border on its own fill",
            r("fieldBorder"),
            r("fieldSurface"),
            CONTROL,
            "CONTROL",
        ),
        ("text in a field", r("text"), r("fieldSurface"), TEXT, "TEXT"),
        ("placeholder in a field", r("textMuted"), r("fieldSurface"), TEXT, "TEXT"),
    ]

    # --- interface states --------------------------------------------------
    sem = TOKENS["color"]["semantic"]
    out += [
        # Form validation messages. Read from the ROLE, not the raw hex — the
        # raw danger value is a deep brick that is unreadable on a dark page,
        # which is what this pair caught.
        ("danger text on page", r("dangerText"), r("surface"), TEXT, "TEXT"),
        ("danger text on panel", r("dangerText"), r("surfaceRaised"), TEXT, "TEXT"),
        (
            # Fixed in both schemes on purpose: an alert that follows the theme
            # stops looking like an alert. Both halves are pinned, so this pair
            # is measured once rather than per-surface.
            "alert body on warningSurface",
            swatch("stone.900"),
            sem["warningSurface"]["value"],
            TEXT,
            "TEXT",
        ),
        (
            "warning border on warningSurface",
            sem["warning"]["value"],
            sem["warningSurface"]["value"],
            NONTEXT,
            "NONTEXT",
        ),
    ]
    return out


def nav_pairs(mode: str) -> list[tuple[str, str, str, float, str]]:
    """The sticky capsule, composited over everything it can scroll across.

    Declared values are meaningless here: the capsule is translucent, so its
    real background is whatever is underneath at that scroll position. The ink
    footer is the worst case in light mode by a wide margin.
    """
    fill = TOKENS["glass"][mode]["fill"]
    r = lambda n: role(mode, n)
    backdrops = [
        ("page", r("surface")),
        ("tint", r("surfaceAlt")),
        ("panel", r("surfaceRaised")),
        ("ink footer", r("inkSurface")),
    ]
    out: list[tuple[str, str, str, float, str]] = []
    for bname, bval in backdrops:
        over = composite(fill, bval)
        for t in ("text", "textMuted", "brandText"):
            out.append((f"nav {t} over {bname}", r(t), over, TEXT, "TEXT"))
        out.append((f"navBorder over {bname}", r("navBorder"), over, CONTROL, "CONTROL"))
    return out


# --------------------------------------------------------------------------
# run
# --------------------------------------------------------------------------


# --------------------------------------------------------------------------
# ordering
# --------------------------------------------------------------------------

# The value ladder, darkest ground first, as a rule rather than as four
# numbers somebody once agreed on.
#
# This exists because the defect it catches is invisible to every ratio in the
# tables above. contrast() is symmetric: it says how far apart two colours are
# and never which of them is darker. Dark mode shipped for a fortnight with
# inkSurface one step LIGHTER than surface, so the slab the page is framed in
# was a pale band at the top and bottom of a darker page, and every pair
# involving it passed. Light mode passes this trivially, which is the point —
# the rule is the same in both schemes and only the values move.
ORDERING = [
    ("ink", "inkSurface"),
    ("page", "surface"),
    ("tint", "surfaceAlt"),
    ("raised", "surfaceRaised"),
]


def ordering_failures(mode: str) -> list[str]:
    """Assert ink < page <= tint < raised, by luminance, in this scheme."""
    out: list[str] = []
    lums = [(name, role(mode, key), luminance(role(mode, key))) for name, key in ORDERING]
    for (an, ah, al), (bn, bh, bl) in zip(lums, lums[1:]):
        if al > bl:
            out.append(
                f"{mode}/ORDERING: {an} ({ah}) is lighter than {bn} ({bh}) — "
                "the ground ladder runs ink, page, tint, raised, darkest first"
            )
    return out


# --------------------------------------------------------------------------
# ground separation
# --------------------------------------------------------------------------

# How far apart two GROUNDS have to be, and it is deliberately not a WCAG
# ratio.
#
# A contrast ratio is the wrong instrument at the dark end. Ink and the page
# sit 4.0 CIE L* apart in the dark scheme, which is a plainly visible frame,
# and the ratio for it is 1.09:1 — the same number two colours nobody could
# tell apart would produce in the light scheme. WCAG's formula is built for
# legibility of a mark on a ground, not for the difference between two grounds,
# and it compresses hard below about 15% luminance. The 26 August audit
# measured this section of the site in L* for exactly that reason, and its
# thresholds are stated in L*, so the check is too.
#
# `min_l` is the value separation. `min_c` is the escape hatch, and it is the
# light scheme's tint band: viridian.100 sits 0.3 L* from stone.100 and is
# still an obvious mint band, because on a bright ground a chroma shift
# registers as a change of material. On a dark ground it does not, which is the
# whole finding — so the tint owes ONE of the two, and dark has to pay in
# value because chroma is not available to it.
DELTA_L, DELTA_C = 4.0, 0.02

GROUNDS = [
    ("ink vs page", "inkSurface", "surface", DELTA_L, 0.0),
    ("tint vs page", "surfaceAlt", "surface", DELTA_L, DELTA_C),
]


def ground_rows(mode: str) -> list[tuple[str, str, str, float, float, float, float, bool]]:
    """(label, a, b, dL, dC, wantL, wantC, ok) for one colour scheme."""
    out = []
    for label, ak, bk, want_l, want_c in GROUNDS:
        a, b = role(mode, ak), role(mode, bk)
        d_l = abs(lstar(a) - lstar(b))
        d_c = abs(chroma(a) - chroma(b))
        ok = d_l >= want_l - 5e-3 or (want_c > 0 and d_c >= want_c - 5e-5)
        out.append((label, a, b, d_l, d_c, want_l, want_c, ok))
    return out


def main() -> int:
    quiet = "--quiet" in sys.argv
    failures: list[str] = []

    for mode in ("light", "dark"):
        failures += ordering_failures(mode)
        if not quiet:
            print(f"\n=== {mode} — ground separation (CIE L*, OKLCH C) ===")
        for label, a, b, d_l, d_c, want_l, want_c, ok in ground_rows(mode):
            if not ok:
                failures.append(
                    f"{mode}/GROUND: {label} — {a} vs {b} differ by {d_l:.2f} L* and "
                    f"{d_c:.4f} C, needs {want_l} L*"
                    + (f" or {want_c} C" if want_c else "")
                )
            if not quiet:
                want = f">= {want_l} L*" + (f" or {want_c} C" if want_c else "")
                print(
                    f"  [{'ok  ' if ok else 'FAIL'}] GROUND    {label:42} "
                    f"{a} vs {b}  dL* {d_l:6.2f}  dC {d_c:.4f}  ({want})"
                )

    for mode in ("light", "dark"):
        for title, rows in (
            (f"{mode} — surfaces", pairs(mode)),
            (f"{mode} — sticky nav capsule, composited", nav_pairs(mode)),
        ):
            if not quiet:
                print(f"\n=== {title} ===")
            for label, fg, bg, want, tier in rows:
                got = contrast(fg, bg)
                ok = got >= want - 5e-3  # tolerate float noise, not real misses
                if not ok:
                    failures.append(
                        f"{mode}/{tier}: {label} — {fg} on {bg} is {got:.2f}:1, needs {want}:1"
                    )
                if not quiet:
                    print(
                        f"  [{'ok  ' if ok else 'FAIL'}] {tier:9} {label:42} "
                        f"{fg} on {bg}  {got:6.2f}:1  (>= {want})"
                    )

    print()
    if failures:
        print(f"FAILED — {len(failures)} pair(s) below threshold:")
        for f in failures:
            print(f"  * {f}")
        return 1
    print("All colour pairs meet their threshold.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
