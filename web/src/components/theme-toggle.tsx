'use client';

import { useEffect, useState } from 'react';

import { THEME_STORAGE_KEY } from '@/lib/theme';

type ThemeChoice = 'light' | 'dark' | 'system';

function resolve(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Two states, not three.
 *
 * A light/dark/system cycle is more correct and worse to use: the third stop
 * looks identical to whichever of the other two the OS is already on, so the
 * control appears not to have done anything. This toggles between the two
 * visible states, and "follow the OS" is simply what you get before you ever
 * touch it — the stored value is only written once the user has expressed a
 * preference, so an untouched browser keeps tracking the system.
 */
/**
 * Props are the two action labels only, so the flight payload stays small.
 *
 * It lives in the header capsule on a laptop and in the drawer on a phone.
 * The audit called it developer chrome and it spent an afternoon in the
 * footer; the owner wants it in the header, so it is.
 */
export function ThemeToggle({ labels }: { labels: { toDark: string; toLight: string } }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // Rendered markup must match the server's, so the icon and the pressed state
  // only appear once we know what the browser actually resolved to.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null;
      } catch {
        return null;
      }
    })();

    setTheme(resolve(stored === 'light' || stored === 'dark' ? stored : 'system'));
    setReady(true);

    // Keep following the OS for as long as no explicit choice has been stored.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        /* storage unavailable — fall through and follow the OS */
      }
      setTheme(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* the toggle still works for this page view; it just will not persist */
    }
  };

  const label = theme === 'dark' ? labels.toLight : labels.toDark;

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      // 2.75rem is 44px, WCAG 2.5.5's minimum target, and it is off the token
      // scale for the same reason ArrowLink's is: it is somebody else's
      // constant. It was 32px, which is inside that minimum on a phone.
      className="grid h-[2.75rem] w-[2.75rem] place-items-center rounded-full border border-line text-muted transition-colors duration-base hover:border-brand-action hover:text-body"
    >
      {/* Both icons are always in the DOM and cross-faded, so the button never
          reflows and the swap has no flicker. Before hydration neither is
          shown, which avoids rendering an icon that contradicts the theme. */}
      <span className="relative block h-[18px] w-[18px]">
        <Sun active={ready && theme === 'dark'} />
        <Moon active={ready && theme === 'light'} />
      </span>
    </button>
  );
}

const iconClass = (active: boolean) =>
  `absolute inset-0 transition-opacity duration-base ${active ? 'opacity-100' : 'opacity-0'}`;

/** Shown while dark is active — pressing it returns to light. */
function Sun({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
      className={iconClass(active)}
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.4 6.4 4.9 4.9M19.1 19.1l-1.5-1.5M17.6 6.4l1.5-1.5M4.9 19.1l1.5-1.5" />
    </svg>
  );
}

/** Shown while light is active — pressing it goes to dark. */
function Moon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={iconClass(active)}
    >
      <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" />
    </svg>
  );
}
