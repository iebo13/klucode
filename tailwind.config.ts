import type { Config } from 'tailwindcss';

/**
 * Design language (§9): a well-kept accounts book, not a playful app.
 * Color is reserved for *meaning* — debt, settled, attention — never decoration.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic, meaning-only palette.
        debt: {
          DEFAULT: '#b42318', // money owed to the café
          soft: '#fef3f2',
        },
        settled: {
          DEFAULT: '#067647', // paid in full
          soft: '#ecfdf3',
        },
        attention: {
          DEFAULT: '#b54708', // over the alert threshold
          soft: '#fffaeb',
        },
        ink: {
          DEFAULT: '#1d2939', // primary text — like dark ink on ledger paper
          muted: '#475467',
          faint: '#98a2b3',
        },
        paper: '#fcfcfb', // page background — warm off-white ledger paper
        line: '#e4e7ec', // hairline rules between rows
      },
      fontFamily: {
        // System stack — no web-font overhead (KISS).
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
};

export default config;
