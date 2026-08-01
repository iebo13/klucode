'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Logo } from '@/components/logo';
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
    <header className="sticky top-0 z-50 border-b border-line bg-[color-mix(in_srgb,var(--kc-surface)_72%,transparent)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-container items-center justify-between gap-6 px-6 py-4 md:px-10">
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

          <Link
            href={pathFor('contact', lang)}
            className="rounded-full bg-brand-action px-5 py-2.5 text-small font-medium text-on-brand shadow-[0_6px_18px_-6px_rgba(53,108,91,.5)] transition-colors duration-base hover:bg-viridian-700"
          >
            {c.nav.contact}
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="glass rounded-full px-4 py-2 font-mono text-eyebrow uppercase lg:hidden"
        >
          {open ? c.ui.close : c.ui.menu}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label={c.ui.menu}
          className="border-t border-line bg-surface px-6 py-6 lg:hidden"
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
