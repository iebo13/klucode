'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Content } from '@/content';
import { availableFrom } from '@/content/profile';
import { NAV_KEYS, alternatePath, pathFor, type Lang, type PageKey } from '@/lib/routes';

/**
 * Client component, so its props are serialized into every page's flight
 * payload — which is why it takes the handful of strings it renders rather
 * than the whole Content object (that once shipped the full privacy policy
 * with the homepage).
 *
 * Four pages, the language switch, the theme toggle and „Kontakt". The two
 * controls spent an afternoon in the footer on the audit's advice that they
 * are developer chrome; the owner wants them reachable from the header, so
 * they are back here on a laptop and in the drawer on a phone.
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
  // padding clears the capsule, and globals.css sets scroll-padding-top so an
  // anchor jump clears it too.
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-2 md:px-6">
      {/* The strip the capsule floats on. Full width, no colour of its own,
          and the whole of what it does is blur what passes underneath so a
          heading sliding under the viewport edge smears rather than arriving
          as a sliced line of type beside the pill. See .nav-scrim. */}
      <div aria-hidden="true" className="nav-scrim" />

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
          className="inline-flex min-h-[2.75rem] shrink-0 items-center text-[1.35rem]"
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
              className={`px-3 py-2 text-small transition-colors duration-fast ${
                current === l.key
                  ? 'font-medium text-brand-text'
                  : 'text-muted hover:text-brand-text'
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
            className="px-3 py-2 text-small text-muted transition-colors duration-fast hover:text-brand-text"
          >
            {ui.switchLang}
          </Link>

          <ThemeToggle labels={themeLabels} />

          <Link
            href={pathFor('contact', lang)}
            className="inline-flex min-h-[2.75rem] items-center rounded-full bg-brand-action px-4 py-2 text-small font-semibold text-on-brand transition-colors duration-base hover:bg-viridian-700"
          >
            {nav.contact}
          </Link>
        </nav>

        {/* On phones the persistent capsule carries the contact button — the
            one action a business site exists for — ahead of the menu. Most
            first visits from local owners are on a phone; contact must not be
            a tap deeper than the menu. */}
        {/* whitespace-nowrap on both, because `hyphens: auto` is set on <html>
            and these are the two elements it must never touch. It is right for
            German body copy and absurd on a 7-character control: at 390px with
            the drawer open the two labels shrank and broke as „Kon-takt" and
            „Schlie-ßen", two lines each, inside a capsule that had room for
            neither. The rule wins over the flex shrink that let them get
            narrow enough to need it. */}
        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href={pathFor('contact', lang)}
            className="inline-flex min-h-[2.75rem] items-center whitespace-nowrap rounded-full bg-brand-action px-4 py-2 text-small font-medium text-on-brand transition-colors duration-base hover:bg-viridian-700"
          >
            {nav.contact}
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="inline-flex min-h-[2.75rem] items-center whitespace-nowrap rounded-full border border-line px-4 py-2 text-small transition-colors duration-base hover:border-brand-action"
          >
            {open ? ui.close : ui.menu}
          </button>
        </div>
      </div>

      {/* The backdrop, which is what makes the drawer a layer rather than a
          panel that happens to be on top.

          It was left out on the grounds that the drawer is a flat panel below
          the capsule and a stray scroll-tap should not dismiss it. Both halves
          of that turned out to be wrong in use: the page behind stayed fully
          lit and fully scrollable, so the drawer read as part of the page
          rather than over it, and a tap outside it did nothing at all, which
          is the one gesture every visitor already knows.

          aria-hidden and no tab stop, because Escape and the toggle button are
          the keyboard routes and this must not become a third one. */}
      {open ? (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 -z-10 bg-stone-950/45 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      {/* Always in the DOM and toggled with `hidden`, so the button's
          aria-controls has something to point at while the drawer is closed. */}
      <nav
        id="mobile-nav"
        hidden={!open}
        aria-label={ui.menu}
        // The drawer is part of the navigation layer, so it shares the
        // capsule's glass. This is NOT glass-under-glass: the drawer is a
        // sibling of the capsule, not nested inside it, so each samples the
        // page exactly once. It takes the material OPAQUE, though — see
        // .glass-nav-solid: at the capsule's own fill the hero headline read
        // straight through the menu items.
        className="glass-nav glass-nav-solid mx-auto mt-3 max-w-container rounded-lg px-6 py-6 lg:hidden"
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
        {/* Two rows, not one. Three unrelated things sharing a single flex row
            put the availability line, the language switch and the theme toggle
            shoulder to shoulder at 390px, where the availability line is the
            longest of them and the only one carrying information rather than a
            control. It gets its own line above the two controls. */}
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-small text-muted">
            {ui.availablePrefix} {availableFrom(lang)}
          </p>
          {/* Both controls carry their name. They were a labelled text link
              beside an unlabelled sun in a circle: two controls of the same
              rank, presented two different ways, and the icon was the one a
              first-time reader could not name. The icon keeps its own
              aria-label for the laptop capsule, where it stands alone. */}
          <div className="mt-3 flex items-center justify-between gap-4">
            <Link
              href={alternatePath(current, lang)}
              lang={lang === 'de' ? 'en' : 'de'}
              className="inline-flex min-h-[2.75rem] items-center text-small text-muted"
            >
              {ui.switchLangLabel}
            </Link>
            <span className="flex items-center gap-3 text-small text-muted">
              {ui.themeLabel}
              <ThemeToggle labels={themeLabels} />
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}
