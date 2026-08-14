// Where the site will be served from. Empty for a domain root (klucode.de,
// Plesk, Netlify); "/test" or similar when GitHub Pages serves a project repo
// from a subpath. configure-pages reports "/" for a user/org site, which Next
// rejects — basePath must be empty or start with a slash and not be just one.
const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const basePath = raw === '/' ? '' : raw.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next prefixes basePath onto <Link> hrefs and bundled assets automatically.
  // It does NOT prefix string URLs in the metadata API or anything written by
  // hand — see src/lib/base-path.ts for the places that need doing manually.
  basePath,
  // No image optimisation server exists in a static export.
  images: { unoptimized: true },

  // Emit /leistungen/index.html rather than /leistungen.html, so Apache and
  // nginx both serve clean URLs with no rewrite rules.
  trailingSlash: true,

  reactStrictMode: true,

  // Dev and production want different shapes, so the two keys are set as a
  // pair:
  //
  //  - Production: `output: 'export'` — static export. Three reasons this is
  //    the right call for klucode.de: it deploys to the Plesk server KluCode
  //    already runs (plain files over FTP, no Node process to keep alive);
  //    nothing executes per request, so there is no server-side logging of
  //    visitor IPs to justify under the DSGVO; and it is fast in the way that
  //    shows up in Lighthouse. In the export, `/` is a static language
  //    chooser emitted by scripts/emit-root-redirect.mjs.
  //  - Dev: `next dev` knows nothing about that emitted file, so the root URL
  //    would 404 — which reads as "the project doesn't run" to anyone opening
  //    localhost:3000. A dev-only redirect keeps the root usable. It must not
  //    coexist with `output: 'export'` in the same config, or every dev
  //    request logs a "redirects will not work with export" warning.
  ...(process.env.NODE_ENV === 'development'
    ? {
        redirects: async () => [{ source: '/', destination: '/de/', permanent: false }],
      }
    : { output: 'export' }),

  // The site sets no cookies and makes no third-party requests; these headers
  // are honoured by hosts that read them at deploy time (Vercel, Netlify).
  // On Plesk, apply the equivalent from deploy/htaccess.txt.
  poweredByHeader: false,
};

export default nextConfig;
