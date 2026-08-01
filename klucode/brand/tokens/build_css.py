#!/usr/bin/env python3
"""Generate tokens.css from tokens.json.

tokens.json is the source of truth. This produces a framework-free CSS custom
property sheet for anything that is not the Next.js site — email signatures,
a WordPress theme, a one-off landing page, a client handover.

    python3 build_css.py
"""

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
tokens = json.loads((HERE / "tokens.json").read_text())


def scale_vars(group: str) -> list[str]:
    return [
        f"  --kc-{group}-{step}: {v['value']};"
        for step, v in tokens["color"][group].items()
        if not step.startswith("$")
    ]


def resolve(ref: str) -> str:
    group, step = ref.split(".")
    return f"var(--kc-{group}-{step})"


def role_vars(mode: str) -> list[str]:
    return [f"  --kc-{k}: {resolve(v)};" for k, v in tokens["role"][mode].items()]


lines = [
    "/* KluCode design tokens — GENERATED from tokens.json by build_css.py.",
    " * Do not edit by hand; edit tokens.json and re-run the script.",
    " *",
    " * Colour rule that matters most: --kc-brand (#40826D) is a DISPLAY colour.",
    " * It measures 4.10:1 on paper and 3.94:1 on ink, so it fails WCAG AA for",
    " * normal-size text on both. For text and buttons use --kc-brand-text and",
    " * --kc-brand-action, which are pre-resolved per colour scheme below.",
    " */",
    "",
    ":root {",
    "  /* --- raw scales ------------------------------------------------- */",
]
for g in ("viridian", "stone", "sand"):
    lines += scale_vars(g)
lines += [
    f"  --kc-{k}: {v['value']};"
    for k, v in tokens["color"]["semantic"].items()
    if not k.startswith("$")
]

lines += ["", "  /* --- type ------------------------------------------------------- */"]
for name, f in tokens["font"].items():
    lines.append(f"  --kc-font-{name}: {f['family']};")
for name, v in tokens["scale"].items():
    if not name.startswith("$"):
        lines.append(f"  --kc-text-{name}: {v};")

lines += ["", "  /* --- space, radius, layout, motion ------------------------------ */"]
for name, v in tokens["space"].items():
    if not name.startswith("$"):
        lines.append(f"  --kc-space-{name}: {v};")
for name, v in tokens["radius"].items():
    if not name.startswith("$"):
        lines.append(f"  --kc-radius-{name}: {v};")
for name, v in tokens["layout"].items():
    if not name.startswith("$"):
        lines.append(f"  --kc-{name}: {v};")
for name, v in tokens["motion"].items():
    if not name.startswith("$"):
        lines.append(f"  --kc-motion-{name}: {v};")

lines += ["", "  /* --- semantic roles: light (default) ---------------------------- */"]
lines += role_vars("light")
lines += ["}", ""]

lines += [
    "/* Dark mode follows the OS by default, and can be forced with",
    "   <html data-theme=\"dark\"> for a preview or a screenshot. */",
    "@media (prefers-color-scheme: dark) {",
    "  :root {",
]
lines += ["  " + v for v in role_vars("dark")]
lines += ["  }", "}", ""]
lines += ['[data-theme="dark"] {']
lines += role_vars("dark")
lines += ["}", ""]
lines += ['[data-theme="light"] {']
lines += role_vars("light")
lines += ["}", ""]

css = "\n".join(lines)

# Written to two places from the one source: the standalone sheet for anything
# outside the Next.js app, and a copy inside the app, because Next refuses to
# import global CSS from outside its own tree.
targets = [HERE / "tokens.css", HERE.parent.parent / "web" / "src" / "app" / "tokens.css"]
for t in targets:
    if t.parent.exists():
        t.write_text(css)
        print(f"wrote {t}")
