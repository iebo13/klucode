'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Content } from '@/content';
import { profile } from '@/content/profile';
import { NAV_KEYS, alternatePath, pathFor, type Lang, type PageKey } from '@/lib/routes';

export function Header({
  lang,
  c,
  current,
}: {
  lang: Lang;
  c: Content;
  current: PageKey | 'home';
}) {
  const [open, setOpen] = useState(false);

  const links = NAV_KEYS.map((k) => ({ key: k, href: pathFor(k, lang), label: c.nav[k] }));

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 md:px-6 md:pt-5">
      {/* A floating capsule rather than a full-width bar. This is the most
          recognisable liquid-glass move: the chrome is an object sitting on
          the page, with the content visibly flowing underneath it. */}
      <div className="glass mx-auto flex max-w-container items-center justify-between gap-6 rounded-full py-3 pl-6 pr-3 md:pl-8 md:pr-4">
        <Link
          href={pathFor('home', lang)}
          className="shrink-0 text-[1.35rem]"
          aria-label={c.meta.siteName}
        >
          <Logo />
        </Link>

        <nav aria-label={c.ui.menu} className="hidden items-center gap-7 lg:flex">
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
            aria-label={c.ui.switchLangLabel}
            className="font-mono text-eyebrow uppercase text-muted transition-colors duration-base hover:text-body"
          >
            {c.ui.switchLang}
          </Link>

          <ThemeToggle c={c} />

          <Link
            href={pathFor('contact', lang)}
            className="rounded-full bg-brand-action px-5 py-2.5 text-small font-medium text-on-brand shadow-[0_6px_18px_-6px_rgba(53,108,91,.5)] transition-colors duration-base hover:bg-viridian-700"
          >
            {c.nav.contact}
          </Link>
        </nav>

        {/* On phones the toggle sits in the capsule rather than inside the
            drawer. Changing the theme is a one-tap decision people make on
            arrival; burying it behind the menu makes it a three-tap one. */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle c={c} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="glass glass-sm px-4 py-2 font-mono text-eyebrow uppercase"
          >
            {open ? c.ui.close : c.ui.menu}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label={c.ui.menu}
          className="glass mx-auto mt-3 max-w-container rounded-glass px-6 py-6 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {[
              ...links,
              { key: 'contact' as const, href: pathFor('contact', lang), label: c.nav.contact },
            ].map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 font-display text-h3"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
            <Link
              href={alternatePath(current, lang)}
              lang={lang === 'de' ? 'en' : 'de'}
              className="font-mono text-eyebrow uppercase text-muted"
            >
              {c.ui.switchLangLabel}
            </Link>
            <span className="font-mono text-eyebrow uppercase text-muted">
              {c.ui.availablePrefix} {profile.availableFrom[lang]}
            </span>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
