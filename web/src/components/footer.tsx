import Link from 'next/link';

import { Logo } from '@/components/logo';
import type { Content } from '@/content';
import { profile } from '@/content/profile';
import { LEGAL_KEYS, NAV_KEYS, pathFor, type Lang } from '@/lib/routes';

export function Footer({ lang, c }: { lang: Lang; c: Content }) {
  // Evaluated at build time — this is a static export, so the footer year is
  // whatever the site was last built in rather than whatever was hardcoded in
  // whichever year the file was written.
  const year = new Date().getFullYear();

  // bg-ink, not bg-surface-inverse. Inverting the surface made the footer
  // follow the theme in the wrong direction: in dark mode surfaceInverse
  // resolves to stone.50, so the page ended with a white slab glued under a
  // dark page while the text on it stayed light and vanished. The footer is
  // dark by intent in BOTH themes — it is the ink block that closes the page,
  // not a mirror of whatever the body happens to be. In dark mode it lifts to
  // stone.900 rather than inverting, so it still separates from the body.
  return (
    <footer className="border-t border-line bg-ink text-ink-fg">
      <div className="mx-auto max-w-container px-6 py-16 md:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link href={pathFor('home', lang)} className="text-[1.35rem] text-ink-fg">
              <Logo />
            </Link>
            <p className="mt-4 font-display text-lead text-ink-accent">{c.footer.tagline}</p>
            <p className="mt-4 text-small text-ink-muted">
              {profile.brand} · {profile.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <nav aria-label={c.nav.services}>
              <h2 className="text-small font-medium text-ink-faint">{c.meta.siteName}</h2>
              <ul className="mt-4 space-y-3">
                {[...NAV_KEYS, 'contact' as const].map((k) => (
                  <li key={k}>
                    <Link
                      href={pathFor(k, lang)}
                      className="text-small text-ink-muted transition-colors duration-base hover:text-ink-fg"
                    >
                      {c.nav[k]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={c.nav.imprint}>
              <h2 className="text-small font-medium text-ink-faint">Legal</h2>
              <ul className="mt-4 space-y-3">
                {LEGAL_KEYS.map((k) => (
                  <li key={k}>
                    <Link
                      href={pathFor(k, lang)}
                      className="text-small text-ink-muted transition-colors duration-base hover:text-ink-fg"
                    >
                      {c.nav[k]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink-line pt-6 text-small text-ink-faint md:flex-row md:items-center md:justify-between">
          <p className="max-w-measure">{c.footer.builtNote}</p>
          <p>
            © {year} {profile.brand}. {c.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
