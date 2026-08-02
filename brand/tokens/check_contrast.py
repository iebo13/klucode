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

THE FOUR TIERS
--------------
  TEXT      4.5:1  WCAG 1.4.3, normal-size text
  LARGE     3.0:1  WCAG 1.4.3, >=24px or >=18.66px bold
  NONTEXT   3.0:1  WCAG 1.4.11, graphical objects and UI component state —
                   bullet dots, the FAQ affordance, focus rings, accent rules
  BOUNDARY  1.4:1  panel edges and dividers. NOT a WCAG number: a panel border
                   is decorative reinforcement of an elevation step that also
                   carries a fill difference, so 1.4.11 does not bind it. It is
                   here because 1.007:1 shipped once and must not again.
  ELEVATION 1.15:1 raised surface against the page it sits on

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

TEXT, LARGE, NONTEXT, BOUNDARY, ELEVATION = 4.5, 3.0, 3.0, 1.4, 1.15


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
        out.append(
            (f"navBorder over {bname}", r("navBorder"), over, BOUNDARY, "BOUNDARY")
        )
    return out


# --------------------------------------------------------------------------
# run
# --------------------------------------------------------------------------


def main() -> int:
    quiet = "--quiet" in sys.argv
    failures: list[str] = []

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
