/**
 * The subpath the site is served from, if any.
 *
 * Next prefixes `basePath` onto `<Link>` hrefs and onto its own bundled assets
 * automatically. Beyond that the metadata API splits into two behaviours, and
 * mixing them up is the classic subpath-deployment bug:
 *
 *   - `alternates` (canonical, hreflang) and `openGraph.images` are RESOLVED
 *     AGAINST `metadataBase`. Since `profile.siteUrl` already contains the
 *     subpath, these take PLAIN paths. Prefixing them yields /test/test/de/.
 *   - `icons` are emitted VERBATIM into the HTML, so they DO need `asset()`.
 *
 * Anything hand-written — the root redirect page — needs `basePath` too.
 * Verified by building with NEXT_PUBLIC_BASE_PATH set and reading the output;
 * both mistakes are invisible until the site is served from a subpath.
 */

const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** '' for a domain root, '/test' for a project-repo GitHub Pages site. */
export const basePath = raw === '/' ? '' : raw.replace(/\/$/, '');

/** Prefix a path under public/ with the base path. */
export function asset(path: string): string {
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}
