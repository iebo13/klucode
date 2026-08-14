import type { MetadataRoute } from 'next';

import { isPreviewDeploy, profile } from '@/content/profile';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  // The GitHub Pages preview is a byte-for-byte duplicate of the production
  // site on another origin. Belt (robots disallow) and braces (per-page
  // noindex in the metadata) keep it out of the index.
  if (isPreviewDeploy) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${profile.siteUrl}/sitemap.xml`,
  };
}
