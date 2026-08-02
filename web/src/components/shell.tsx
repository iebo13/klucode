import type { ReactNode } from 'react';

import { Footer } from '@/components/footer';
import { GlassLens } from '@/components/glass-lens';
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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-brand-action focus:px-5 focus:py-3 focus:text-on-brand"
      >
        {c.ui.skipToContent}
      </a>
      <Header lang={lang} c={c} current={current} />
      <main id="main">{children}</main>
      <Footer lang={lang} c={c} />
      {/* Enhancement only — builds the per-panel refraction filters. The glass
          is fully styled without it. */}
      <GlassLens />
    </>
  );
}
