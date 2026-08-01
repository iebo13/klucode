/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export. Three reasons this is the right call for klucode.de:
  //  1. It deploys to the Plesk server KluCode already runs — plain files over
  //     FTP, no Node process to keep alive, no runtime to patch.
  //  2. Nothing executes per request, so there is no server-side logging of
  //     visitor IPs to disclose or justify under the DSGVO.
  //  3. It is fast in the way that actually shows up in Lighthouse.
  output: 'export',

  // No image optimisation server exists in a static export.
  images: { unoptimized: true },

  // Emit /leistungen/index.html rather than /leistungen.html, so Apache and
  // nginx both serve clean URLs with no rewrite rules.
  trailingSlash: true,

  reactStrictMode: true,

  // The site sets no cookies and makes no third-party requests; these headers
  // are honoured by hosts that read them at deploy time (Vercel, Netlify).
  // On Plesk, apply the equivalent from deploy/htaccess.txt.
  poweredByHeader: false,
};

export default nextConfig;
