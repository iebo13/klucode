import Link from 'next/link';

import { Logo } from '@/components/logo';
import type { Content } from '@/content';
import { filled, fullName, profile } from '@/content/profile';
import { LEGAL_KEYS, NAV_KEYS, pathFor, type Lang } from '@/lib/routes';

/**
 * prefetch={false} on every link here, and only here.
 *
 * Next prefetches the payload of every <Link> that enters the viewport, and
 * the footer holds a link to every page on the site: six route payloads,
 * about 50 kB, fetched the moment a phone reaches the bottom of any page. On
 * a laptop that is harmless. On a phone on a slow connection it is the
 * site's own pitch („Ladezeit unter einer Sekunde") spending the reader's
 * data on pages they have not asked for. The header keeps its prefetching,
 * because those are the links a reader actually clicks next.
 */
const footerLink =
  'flex min-h-[2.75rem] items-center text-small text-ink-muted transition-colors duration-base hover:text-ink-fg';

export function Footer({ lang, c }: { lang: Lang; c: Content }) {
  // Evaluated at build time — this is a static export, so the footer year is
  // whatever the site was last built in rather than whatever was hardcoded in
  // whichever year the file was written.
  const year = new Date().getFullYear();

  // Read for their RETURN value, not as predicates: filled() hands back the
  // string or undefined, which narrows. Testing profile.street would narrow
  // nothing, because it is typed `string` and its emptiness is the «…» marker
  // rather than the empty string. See page-sections.tsx for the same pair.
  const street = filled(profile.street);
  const email = filled(profile.email);

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
        {/* FOUR COLUMNS OF ROUGHLY EQUAL WEIGHT, and it was a mark on the left,
            two link lists on the right and 727px of nothing in between. The two
            lists held five items and three, so they did not balance each other
            either, and the whole block was 505px tall to say very little.

            The column that closes the hole is also the one that was missing:
            for a German local business the footer is where a visitor looks for
            the address, and it was only on the Impressum. Filling the gap and
            adding the trust signal are the same edit. */}
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:gap-8">
          <div>
            <Link
              href={pathFor('home', lang)}
              prefetch={false}
              className="inline-flex min-h-[2.75rem] items-center text-[1.35rem] text-ink-fg"
            >
              <Logo />
            </Link>
            <p className="mt-4 max-w-measure font-display text-lead text-ink-accent">
              {c.footer.tagline}
            </p>
          </div>

          {/* Name, address, email. The phone is deliberately absent site-wide
              (see profile.ts), so the block prints what exists and nothing
              else: an address rendered as «Straße» would be worse than none. */}
          <div>
            <h2 className="text-small font-medium text-ink-faint">{c.ui.footerContactLabel}</h2>
            {street ? (
              <address className="mt-4 text-small not-italic text-ink-muted">
                {fullName}
                <br />
                {street}
                <br />
                {profile.postalCode} {profile.city}
              </address>
            ) : (
              <p className="mt-4 text-small text-ink-muted">
                {profile.brand} · {profile.city}
              </p>
            )}
            {email ? (
              <a href={`mailto:${email}`} className={`${footerLink} mt-2`}>
                {email}
              </a>
            ) : null}
          </div>

          <nav aria-label={c.ui.footerNavLabel}>
            <h2 className="text-small font-medium text-ink-faint">{c.meta.siteName}</h2>
            <ul className="mt-4">
              {[...NAV_KEYS, 'contact' as const].map((k) => (
                <li key={k}>
                  <Link href={pathFor(k, lang)} prefetch={false} className={footerLink}>
                    {c.nav[k]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <nav aria-label={c.ui.footerLegalLabel}>
              <h2 className="text-small font-medium text-ink-faint">{c.ui.footerLegalLabel}</h2>
              <ul className="mt-4">
                {LEGAL_KEYS.map((k) => (
                  <li key={k}>
                    <Link href={pathFor(k, lang)} prefetch={false} className={footerLink}>
                      {c.nav[k]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Profiles render only once profile.ts carries real URLs — an
                empty column would just advertise their absence. They join the
                legal column rather than opening a fifth one, so the footer does
                not change shape the day a LinkedIn URL is pasted in. */}
            {profile.linkedin || profile.github ? (
              <>
                <h2 className="mt-8 text-small font-medium text-ink-faint">
                  {c.ui.footerSocialLabel}
                </h2>
                <ul className="mt-4">
                  {profile.linkedin ? (
                    <li>
                      <a href={profile.linkedin} rel="me noopener" className={footerLink}>
                        LinkedIn
                      </a>
                    </li>
                  ) : null}
                  {profile.github ? (
                    <li>
                      <a href={profile.github} rel="me noopener" className={footerLink}>
                        GitHub
                      </a>
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}
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
