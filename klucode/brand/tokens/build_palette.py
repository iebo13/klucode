#!/usr/bin/env python3
"""
Generate the KluCode colour scales in OKLCH and write them into tokens.json.

WHY THIS EXISTS
---------------
The first palette was hand-picked in hex. Measured in OKLCH it had three
defects that no amount of re-tinting fixes, because they are structural:

  * Uneven lightness steps. ΔL ran from 0.038 to 0.129 between adjacent
    steps, so the light tints bunched together while the mid-tones lurched.
    A scale that is not perceptually even cannot look harmonious.
  * Chroma too low, and peaking in the wrong place. The brand step sat at
    C=0.076 when the hue supports ~0.12 at that lightness — which is exactly
    what "muddy" means: a colour starved of chroma reads as dirty grey-green.
  * Uncontrolled hue drift. Viridian swung 166°→175° and the neutrals swung
    135°→169° across their scales. The neutrals were not neutral; they were
    an inconsistent green fighting the brand green.

This script fixes all three by construction: a fixed perceptual lightness
ladder, an explicit chroma curve that peaks mid-scale and tapers at both
ends, and deliberate hue torsion instead of accidental drift.

    python3 build_palette.py            # writes tokens.json
    python3 build_palette.py --preview  # prints the table, writes nothing
"""

from __future__ import annotations

import json
import sys
from math import atan2, cbrt, cos, degrees, radians, sin
from pathlib import Path

HERE = Path(__file__).resolve().parent

# --------------------------------------------------------------------------
# The system
# --------------------------------------------------------------------------

STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

# Perceptual lightness ladder. Even-ish by design, with slightly finer steps
# at the light end where the eye is more sensitive to surface differences.
LIGHTNESS = [0.975, 0.945, 0.888, 0.820, 0.742, 0.658, 0.572, 0.484, 0.396, 0.310, 0.238]

# Chroma curve: peaks at 500/600 and tapers at both ends. Tapering matters —
# a tint that keeps full chroma turns pastel-garish, and a shade that keeps it
# turns to sludge.
CHROMA = [0.012, 0.028, 0.052, 0.074, 0.092, 0.102, 0.099, 0.085, 0.069, 0.052, 0.041]

# Hue torsion. Real pigments shift hue with tint and shade; holding one hue
# flat across a scale is what makes generated palettes look synthetic. Lighter
# steps run cooler (toward teal), darker steps deepen toward forest.
HUE_TORSION = [+6, +5, +4, +3, +1.5, 0, -1.5, -3, -4, -5, -6]

# The brand hue. 152° is a deep forest green — rotated 14° warmer than a true
# blue-green viridian. Chosen over the cooler, more saturated option because it
# reads as craft rather than SaaS, which is what the positioning asks for, and
# because it sits more comfortably against near-neutral greys.
BRAND_HUE = 152.0

# Neutrals carry a *hint* of the brand hue so they belong to the family, but
# an order of magnitude less chroma than before (0.006 vs up to 0.023). This
# is the change that stops the whole page reading as one muddy hue: the eye
# needs somewhere to rest.
NEUTRAL_HUE = 150.0
NEUTRAL_CHROMA = [0.004, 0.005, 0.006, 0.007, 0.008, 0.008, 0.008, 0.008, 0.009, 0.010, 0.010]


# --------------------------------------------------------------------------
# OKLCH ↔ sRGB
# --------------------------------------------------------------------------


def _srgb_to_lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _lin_to_srgb(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def oklch_to_rgb(L: float, C: float, H: float) -> tuple[float, float, float]:
    a, b = C * cos(radians(H)), C * sin(radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    return (
        _lin_to_srgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        _lin_to_srgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        _lin_to_srgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    )


def _in_gamut(rgb, eps: float = 1e-4) -> bool:
    return all(-eps <= c <= 1 + eps for c in rgb)


def oklch_to_hex(L: float, C: float, H: float) -> str:
    """Gamut-map by binary-searching chroma down until sRGB can hold it."""
    if not _in_gamut(oklch_to_rgb(L, C, H)):
        lo, hi = 0.0, C
        for _ in range(30):
            mid = (lo + hi) / 2
            if _in_gamut(oklch_to_rgb(L, mid, H)):
                lo = mid
            else:
                hi = mid
        C = lo
    r, g, b = oklch_to_rgb(L, C, H)
    return "#" + "".join(f"{round(max(0.0, min(1.0, c)) * 255):02X}" for c in (r, g, b))


def hex_to_oklch(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    rgb = tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    r, g, b = (_srgb_to_lin(c) for c in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = cbrt(l), cbrt(m), cbrt(s)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, (A * A + B * B) ** 0.5, degrees(atan2(B, A)) % 360


def rel_lum(h: str) -> float:
    h = h.lstrip("#")
    r, g, b = (_srgb_to_lin(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------


def build_scale(hue: float, chroma: list[float]) -> dict[str, str]:
    return {
        str(step): oklch_to_hex(L, C, hue + torsion)
        for step, L, C, torsion in zip(STEPS, LIGHTNESS, chroma, HUE_TORSION)
    }


def main() -> None:
    viridian = build_scale(BRAND_HUE, CHROMA)
    stone = build_scale(NEUTRAL_HUE, NEUTRAL_CHROMA)

    paper, ink = stone["50"], stone["950"]

    def annotate(scale: dict[str, str]) -> dict[str, dict]:
        out = {}
        for step, hexv in scale.items():
            L, C, H = hex_to_oklch(hexv)
            out[step] = {
                "value": hexv,
                "oklch": {"l": round(L, 3), "c": round(C, 4), "h": round(H, 1)},
                "wcag": {
                    "onPaper": round(contrast(hexv, paper), 2),
                    "onInk": round(contrast(hexv, ink), 2),
                },
            }
        return out

    if "--preview" in sys.argv:
        for name, scale in (("viridian", viridian), ("stone", stone)):
            print(f"--- {name} ---")
            print(f"{'step':5} {'hex':9} {'L':>6} {'C':>7} {'H':>7} {'/paper':>8} {'/ink':>7}")
            for step, hexv in scale.items():
                L, C, H = hex_to_oklch(hexv)
                print(
                    f"{step:5} {hexv:9} {L:6.3f} {C:7.4f} {H:7.1f} "
                    f"{contrast(hexv, paper):8.2f} {contrast(hexv, ink):7.2f}"
                )
            print()
        return

    path = HERE / "tokens.json"
    tokens = json.loads(path.read_text())
    tokens["color"]["viridian"] = {
        "$comment": (
            "Generated by build_palette.py in OKLCH — do not hand-edit. Even perceptual "
            "lightness ladder, chroma peaking at 500/600 and tapering at both ends, and "
            "deliberate hue torsion (cooler tints, deeper shades). 500 is THE brand colour "
            "and is display-only: it fails AA for body text on both paper and ink."
        ),
        **annotate(viridian),
    }
    tokens["color"]["stone"] = {
        "$comment": (
            "Generated by build_palette.py. Near-neutral by design: chroma 0.004-0.010, an "
            "order of magnitude below the old hand-picked scale, with the hue held steady "
            "instead of drifting 34 degrees. The neutrals must be somewhere the eye can "
            "rest, or the whole page reads as one muddy hue. 50 is paper, 950 is ink."
        ),
        **annotate(stone),
    }
    path.write_text(json.dumps(tokens, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path}")
    print(f"  paper {paper}   ink {ink}   brand {viridian['500']}")


if __name__ == "__main__":
    main()
