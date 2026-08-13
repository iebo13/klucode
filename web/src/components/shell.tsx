import type { ReactNode } from 'react';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { getContent } from '@/content';
import type { Lang, PageKey } from '@/lib/routes';

export function Shell({
  lang,
  current,
  children,
}: {
  lang: Lang;
  current: PageKey | 'home';
  children: ReactNode;
}) {
  const c = getContent(lang);

  return (
    <>
      {/* focus-visible, not focus: on a client-side route change the router can
          move focus programmatically, and with plain focus styling the skip
          link flashed into view on every page switch. :focus-visible only
          matches keyboard-driven focus, which is the audience this link is
          for. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-[60] focus-visible:rounded-md focus-visible:bg-brand-action focus-visible:px-4 focus-visible:py-3 focus-visible:text-on-brand"
      >
        {c.ui.skipToContent}
      </a>
      {/* Header is a client component: it gets the strings it renders, not
          the whole Content object, so the flight payload stays small. */}
      <Header lang={lang} nav={c.nav} ui={c.ui} siteName={c.meta.siteName} current={current} />
      <main id="main">{children}</main>
      <Footer lang={lang} c={c} />
    </>
  );
}
