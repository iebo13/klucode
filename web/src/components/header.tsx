'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Content } from '@/content';
import { profile } from '@/content/profile';
import { NAV_KEYS, alternatePath, pathFor, type Lang, type PageKey } from '@/lib/routes';

/**
 * Client component, so its props are serialized into every page's flight
 * payload — which is why it takes the handful of strings it renders rather
 * than the whole Content object (that once shipped the full privacy policy
 * with the homepage).
 */
export function Header({
  lang,
  nav,
  ui,
  siteName,
  current,
}: {
  lang: Lang;
  nav: Content['nav'];
  ui: Content['ui'];
  siteName: string;
  current: PageKey | 'home';
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Escape closes the drawer and hands focus back to the button that opened
  // it, per the disclosure pattern. Outside clicks are left alone: the drawer
  // is a flat panel below the capsule, and dismissing it on a stray scroll-tap
  // costs more than it saves on a page this short.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const links = NAV_KEYS.map((k) => ({ key: k, href: pathFor(k, lang), label: nav[k] }));
  const themeLabels = { toDark: ui.themeToDark, toLight: ui.themeToLight };

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 md:px-6">
      {/* A floating capsule rather than a full-width bar: the chrome is an
          object sitting on the page, with content visibly flowing underneath
          it. This is the ONLY element on the site that carries .glass-nav —
          the only one where a backdrop blur has moving content to sample and
          therefore earns its compositing layer. */}
      <div className="glass-nav mx-auto flex max-w-container items-center justify-between gap-6 rounded-full py-3 pl-6 pr-3 md:pl-8 md:pr-4">
        <Link
          href={pathFor('home', lang)}
          className="shrink-0 text-[1.35rem]"
          aria-label={siteName}
        >
          <Logo />
        </Link>

        <nav aria-label={ui.menu} className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={current === l.key ? 'page' : undefined}
              className={`text-small transition-colors duration-base ${
                current === l.key ? 'text-brand-text' : 'text-muted hover:text-body'
              }`}
            >
              {l.label}
            </Link>
          ))}

          <span aria-hidden="true" className="h-4 w-px bg-line" />

          <Link
            href={alternatePath(current, lang)}
            lang={lang === 'de' ? 'en' : 'de'}
            aria-label={ui.switchLangLabel}
            className="text-small text-muted transition-colors duration-base hover:text-body"
          >
            {ui.switchLang}
          </Link>

          <ThemeToggle labels={themeLabels} />

          <Link
            href={pathFor('contact', lang)}
            className="rounded-full bg-brand-action px-4 py-3 text-small font-medium text-on-brand shadow-[0_6px_18px_-6px_rgba(53,108,91,.5)] transition-colors duration-base hover:bg-viridian-700"
          >
            {nav.contact}
          </Link>
        </nav>

        {/* On phones the persistent capsule carries the contact button — the
            one action a business site exists for — ahead of the theme toggle,
            which moves into the drawer. Most first visits from local owners
            are on a phone; contact must not be a tap deeper than the menu. */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={pathFor('contact', lang)}
            className="rounded-full bg-brand-action px-4 py-2 text-small font-medium text-on-brand transition-colors duration-base hover:bg-viridian-700"
          >
            {nav.contact}
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="rounded-full border border-line px-4 py-2 text-small transition-colors duration-base hover:border-brand-action"
          >
            {open ? ui.close : ui.menu}
          </button>
        </div>
      </div>

      {/* Always in the DOM and toggled with `hidden`, so the button's
          aria-controls has something to point at while the drawer is closed. */}
      <nav
        id="mobile-nav"
        hidden={!open}
        aria-label={ui.menu}
        // A flat panel, not glass. Glass under glass is a nested
        // backdrop-filter: the drawer would sample a capsule that is itself
        // sampling the page, which costs two layers and looks like neither.
        className="panel mx-auto mt-3 max-w-container px-6 py-6 lg:hidden"
      >
        <ul className="flex flex-col gap-1">
          {[
            ...links,
            { key: 'contact' as const, href: pathFor('contact', lang), label: nav.contact },
          ].map((l) => (
            <li key={l.key}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 font-display text-h3"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
          <Link
            href={alternatePath(current, lang)}
            lang={lang === 'de' ? 'en' : 'de'}
            className="text-small text-muted"
          >
            {ui.switchLangLabel}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-small text-muted">
              {ui.availablePrefix} {profile.availableFrom[lang]}
            </span>
            <ThemeToggle labels={themeLabels} />
          </div>
        </div>
      </nav>
    </header>
  );
}
