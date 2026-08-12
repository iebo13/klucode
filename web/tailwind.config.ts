import type { Config } from 'tailwindcss';

// The design tokens live one level up, in brand/tokens/tokens.json, and are
// imported rather than copied. There is exactly one place a brand colour is
// written down, and changing it there changes the site — no drift, no
// "which hex was it again?".
import tokens from '../brand/tokens/tokens.json';

type Step = { value: string };
const scale = (group: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(group)
      .filter(([k]) => !k.startsWith('$'))
      .map(([k, v]) => [k, (v as Step).value]),
  );

const { color, scale: type, space, radius, layout, motion } = tokens;

/**
 * The token spacing scale, and nothing else.
 *
 * This REPLACES Tailwind's default scale rather than extending it, which is the
 * only way the scale is actually enforced: with the default present, `mt-5`,
 * `gap-2.5` and `py-3.5` all resolve to real off-grid values and the tokens
 * become a suggestion. Components were bypassing the scale in about seventy
 * places, and the same semantic relationship — eyebrow to heading to lead —
 * differed per component.
 *
 * Off-scale utilities now produce no CSS at all, which is silent, so
 * scripts/check-spacing.mjs fails the build on any that remain.
 */
const spacing = {
  0: '0',
  px: '1px',
  ...Object.fromEntries(
    Object.entries(space).filter(([k]) => !k.startsWith('$') && k !== 'section'),
  ),
  section: space.section,
};

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    spacing,
    extend: {
      colors: {
        viridian: scale(color.viridian),
        stone: scale(color.stone),
        warm: scale(color.warm),
        warning: color.semantic.warning.value,
        'warning-surface': color.semantic.warningSurface.value,
        // danger is a ROLE, not a raw hex. The raw value is a deep brick that
        // measures 2.00:1 on the dark page — and it is the colour of form
        // validation messages, i.e. the one string a user must be able to read.
        danger: 'var(--kc-dangerText)',

        // Semantic roles, wired to CSS variables so a single [data-theme]
        // switch flips the whole site. Components should reach for these.
        surface: 'var(--kc-surface)',
        'surface-alt': 'var(--kc-surfaceAlt)',
        'surface-raised': 'var(--kc-surfaceRaised)',
        'surface-inverse': 'var(--kc-surfaceInverse)',
        line: 'var(--kc-border)',
        // The nav capsule floats over unknown content, so its edge cannot use
        // the page border: composited over the ink footer, stone-300 drops to
        // 1.32:1 against the capsule and the boundary disappears.
        'nav-line': 'var(--kc-navBorder)',
        body: 'var(--kc-text)',
        muted: 'var(--kc-textMuted)',
        brand: 'var(--kc-brand)',
        'brand-text': 'var(--kc-brandText)',
        'brand-action': 'var(--kc-brandAction)',
        'on-brand': 'var(--kc-onBrand)',
        // The one warm counterpoint in a system that is otherwise a single hue.
        // Used in exactly one place — the availability status dot. If you are
        // about to use it in a second, read the note in build_palette.py first.
        'accent-warm': 'var(--kc-accentWarm)',

        // The ink slab at the foot of the page. Dark in BOTH themes, which is
        // why it cannot be surface-inverse — see brand/tokens/tokens.json.
        ink: 'var(--kc-inkSurface)',
        'ink-fg': 'var(--kc-inkText)',
        'ink-muted': 'var(--kc-inkTextMuted)',
        'ink-faint': 'var(--kc-inkTextFaint)',
        'ink-line': 'var(--kc-inkBorder)',
        'ink-accent': 'var(--kc-inkAccent)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        eyebrow: [type.eyebrow, { lineHeight: '1.2', letterSpacing: '0.08em' }],
        small: [type.small, { lineHeight: '1.6' }],
        body: [type.body, { lineHeight: '1.65' }],
        lead: [type.lead, { lineHeight: '1.5' }],
        h3: [type.h3, { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        h2: [type.h2, { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        h1: [type.h1, { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        display: [type.display, { lineHeight: '1.0', letterSpacing: '-0.035em' }],
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
      },
      maxWidth: {
        measure: layout.measure,
        container: layout.container,
        narrow: layout.containerNarrow,
      },
      transitionTimingFunction: {
        brand: motion.ease,
      },
      transitionDuration: {
        fast: motion.fast.replace('ms', ''),
        base: motion.base.replace('ms', ''),
        slow: motion.slow.replace('ms', ''),
      },
    },
  },
  plugins: [],
} satisfies Config;
