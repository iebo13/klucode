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

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        viridian: scale(color.viridian),
        stone: scale(color.stone),
        success: color.semantic.success.value,
        warning: color.semantic.warning.value,
        'warning-surface': color.semantic.warningSurface.value,
        danger: color.semantic.danger.value,

        // Semantic roles, wired to CSS variables so a single [data-theme]
        // switch flips the whole site. Components should reach for these.
        surface: 'var(--kc-surface)',
        'surface-alt': 'var(--kc-surfaceAlt)',
        'surface-raised': 'var(--kc-surfaceRaised)',
        'surface-inverse': 'var(--kc-surfaceInverse)',
        line: 'var(--kc-border)',
        body: 'var(--kc-text)',
        muted: 'var(--kc-textMuted)',
        brand: 'var(--kc-brand)',
        'brand-text': 'var(--kc-brandText)',
        'brand-action': 'var(--kc-brandAction)',
        'on-brand': 'var(--kc-onBrand)',

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
      spacing: {
        section: space.section,
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        // Glass panels need a softer corner than the flat system did — a
        // frosted panel with a 14px radius reads as a cut-out, not a pane.
        glass: '1.75rem',
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
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: `rise ${motion.slow} ${motion.ease} both`,
      },
    },
  },
  plugins: [],
} satisfies Config;
