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
    # The semantic group is emitted unprefixed (--kc-danger, not
    # --kc-semantic-danger) because those names are already unambiguous.
    if group == "semantic":
        return f"var(--kc-{step})"
    return f"var(--kc-{group}-{step})"


def role_vars(mode: str) -> list[str]:
    out = [
        f"  --kc-{k}: {resolve(v)};"
        for k, v in tokens["role"][mode].items()
        if not k.startswith("$")
    ]
    # The nav capsule's material flips with the colour scheme alongside the
    # roles, so a single [data-theme] switch carries the header too.
    out += [
        f"  --kc-glass-{k}: {v};"
        for k, v in tokens["glass"][mode].items()
        if not k.startswith("$")
    ]
    return out


lines = [
    "/* KluCode design tokens — GENERATED from tokens.json by build_css.py.",
    " * Do not edit by hand; edit tokens.json and re-run the script.",
    " *",
    " * Colour rule that matters most: viridian-500 (#5EA472) is a DISPLAY",
    " * colour — the mark, and nothing else. It measures 2.79:1 on paper, so it",
    " * fails WCAG AA for text AND 1.4.11's 3:1 for non-text UI. The --kc-brand",
    " * ROLE therefore resolves to viridian-600, the lightest step that clears",
    " * 3:1 for dots, rules and affordances; text uses --kc-brandText and",
    " * --kc-brandAction, which are pre-resolved per colour scheme below.",
    " * check_contrast.py asserts all of this and fails the build on regression.",
    " */",
    "",
    ":root {",
    "  /* --- raw scales ------------------------------------------------- */",
]
for g in ("viridian", "stone", "warm"):
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

lines += [
    "",
    "  /* --- nav glass (scheme-independent parts) ----------------------- */",
    f"  --kc-glass-blur: {tokens['glass']['blur']};",
    f"  --kc-glass-saturate: {tokens['glass']['saturate']};",
]

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

lines += [
    "",
    "  /* --- semantic roles: DARK, which is the fallback ----------------- */",
    "  /* Dark sits on bare :root and light is the media override, rather than",
    "     the other way round, because dark is this site's declared default:",
    "     whatever the browser cannot tell us, it gets. In practice every",
    "     current browser answers prefers-color-scheme with a concrete light or",
    "     dark and never with neither, so this decides the rendering only where",
    "     media queries do not reach — a UA that does not support them, and the",
    "     colour-scheme hint the UA paints its own widgets and scrollbars with",
    "     before it knows anything else. Owner's call, 2026-08-26. */",
]
lines += role_vars("dark")
lines += ["}", ""]

lines += [
    "/* Light mode follows the OS, and can be forced with",
    "   <html data-theme=\"light\"> for a preview or a screenshot. */",
    "@media (prefers-color-scheme: light) {",
    "  :root {",
]
lines += ["  " + v for v in role_vars("light")]
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
