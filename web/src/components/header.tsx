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

  // Fixed, not sticky: a sticky header occupies layout space, which forced
  // the ink heroes to guess its height with a negative margin — and any
  // rendering that made the header taller than the guess (zoom, narrow
  // viewports, font settings) opened a page-coloured seam at the viewport
  // top. A fixed overlay takes no space at all, so the ink slab starts at
  // pixel zero by construction. Every page opens with a hero whose top
  // padding clears the capsule.
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-2 md:px-6">
      {/* A floating capsule rather than a full-width bar: the chrome is an
          object sitting on the page, with content visibly flowing underneath
          it. This is the ONLY element on the site that carries .glass-nav —
          the only one where a backdrop blur has moving content to sample and
          therefore earns its compositing layer. Deliberately slim: pt-2 above,
          py-2 inside — a chrome that takes 80px of the viewport before the
          page starts is chrome arguing with the content. */}
      <div className="glass-nav mx-auto flex max-w-container items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 md:gap-6 md:pl-6">
        <Link
          href={pathFor('home', lang)}
          className="shrink-0 text-[1.35rem]"
          aria-label={siteName}
        >
          <Logo />
        </Link>

        <nav aria-label={ui.menu} className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={current === l.key ? 'page' : undefined}
              className={`nav-link px-3 py-2 text-small ${
                current === l.key ? 'text-body' : 'text-muted hover:text-body'
              }`}
            >
              {l.label}
            </Link>
          ))}

          <span aria-hidden="true" className="mx-2 h-4 w-px bg-line" />

          <Link
            href={alternatePath(current, lang)}
            lang={lang === 'de' ? 'en' : 'de'}
            aria-label={ui.switchLangLabel}
            className="nav-link px-3 py-2 text-small text-muted hover:text-body"
          >
            {ui.switchLang}
          </Link>

          <ThemeToggle labels={themeLabels} />

          <Link
            href={pathFor('contact', lang)}
            className="rounded-full bg-brand-action px-4 py-2 text-small font-semibold text-on-brand transition-colors duration-base hover:bg-viridian-700"
          >
            {nav.contact}
          </Link>
        </nav>

        {/* On phones the persistent capsule carries the contact button — the
            one action a business site exists for — ahead of the theme toggle,
            which moves into the drawer. Most first visits from local owners
            are on a phone; contact must not be a tap deeper than the menu. */}
        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href={pathFor('contact', lang)}
            className="rounded-full bg-brand-action px-3 py-2 text-small font-medium text-on-brand transition-colors duration-base hover:bg-viridian-700"
          >
            {nav.contact}
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="rounded-full border border-line px-3 py-2 text-small transition-colors duration-base hover:border-brand-action"
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
        // The drawer is part of the navigation layer, so it shares the
        // capsule's glass. This is NOT glass-under-glass: the drawer is a
        // sibling of the capsule, not nested inside it, so each samples the
        // page exactly once.
        className="glass-nav mx-auto mt-3 max-w-container rounded-lg px-6 py-6 lg:hidden"
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
