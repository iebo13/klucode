import Link from 'next/link';

import { Logo } from '@/components/logo';
import type { Content } from '@/content';
import { profile } from '@/content/profile';
import { LEGAL_KEYS, NAV_KEYS, pathFor, type Lang } from '@/lib/routes';

export function Footer({ lang, c }: { lang: Lang; c: Content }) {
  const year = 2026;

  return (
    <footer className="border-t border-line bg-surface-inverse text-stone-50">
      <div className="mx-auto max-w-container px-6 py-16 md:px-10">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link href={pathFor('home', lang)} className="text-[1.35rem] text-stone-50">
              <Logo />
            </Link>
            <p className="mt-4 font-display text-lead text-viridian-300">{c.footer.tagline}</p>
            <p className="mt-4 text-small text-stone-300">
              {profile.brand} · {profile.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-10">
            <nav aria-label={c.nav.services}>
              <h2 className="font-mono text-eyebrow uppercase tracking-[0.08em] text-stone-400">
                {c.meta.siteName}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {[...NAV_KEYS, 'contact' as const].map((k) => (
                  <li key={k}>
                    <Link
                      href={pathFor(k, lang)}
                      className="text-small text-stone-300 transition-colors duration-base hover:text-stone-50"
                    >
                      {c.nav[k]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={c.nav.imprint}>
              <h2 className="font-mono text-eyebrow uppercase tracking-[0.08em] text-stone-400">
                Legal
              </h2>
              <ul className="mt-4 space-y-2.5">
                {LEGAL_KEYS.map((k) => (
                  <li key={k}>
                    <Link
                      href={pathFor(k, lang)}
                      className="text-small text-stone-300 transition-colors duration-base hover:text-stone-50"
                    >
                      {c.nav[k]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-stone-700 pt-6 text-small text-stone-400 md:flex-row md:items-center md:justify-between">
          <p className="max-w-measure">{c.footer.builtNote}</p>
          <p>
            © {year} {profile.brand}. {c.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
