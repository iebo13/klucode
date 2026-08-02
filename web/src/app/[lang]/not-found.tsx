import Link from 'next/link';

import { Logo } from '@/components/logo';
import { getContent } from '@/content';
import { DEFAULT_LANG, pathFor } from '@/lib/routes';

/**
 * A 404 is not the place for a joke about broken software — see
 * brand/02-voice.md §7. It says what happened and offers the way out.
 */
export default function NotFound() {
  const c = getContent(DEFAULT_LANG);

  return (
    <div className="flex min-h-dvh flex-col items-start justify-center px-6 md:px-8">
      <div className="mx-auto w-full max-w-narrow">
        <Link href={pathFor('home', DEFAULT_LANG)} className="text-[1.35rem]">
          <Logo />
        </Link>
        <p className="mt-16 font-mono text-eyebrow uppercase tracking-[0.08em] text-brand-text">
          404
        </p>
        <h1 className="mt-4 text-h1">{c.notFound.title}</h1>
        <p className="mt-4 text-lead text-muted">{c.notFound.body}</p>
        <Link
          href={pathFor('home', DEFAULT_LANG)}
          className="mt-8 inline-flex rounded-md bg-brand-action px-6 py-3 font-display font-medium text-on-brand"
        >
          {c.ui.backHome}
        </Link>
      </div>
    </div>
  );
}
