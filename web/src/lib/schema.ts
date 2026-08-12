import type { Content } from '@/content';
import { fullName, isTodo, profile } from '@/content/profile';
import type { Lang } from '@/lib/routes';

/**
 * Structured data (JSON-LD) builders.
 *
 * For a local one-person studio, LocalBusiness/ProfessionalService markup
 * consistent with the Google Business Profile is the single biggest
 * machine-readability lever in German local search — see
 * brand/04-launch-playbook.md §3 (Google Business Profile task).
 *
 * The business graph is gated: while profile.ts still contains todo()
 * placeholders it returns null, because publishing «E-Mail-Adresse» as
 * machine-readable fact would be worse than publishing nothing. The FAQ
 * markup has no personal data and is always emitted.
 */

const BUSINESS_ID = '#klucode';
const PERSON_ID = '#klausmann';

/** '2.500 €' / '€2,500' → '2500' (schema.org wants a plain decimal). */
const numeric = (price: string): string => price.replace(/[^\d]/g, '');

export function businessJsonLd(c: Content, lang: Lang): object | null {
  const required = [
    profile.firstName,
    profile.email,
    profile.phone,
    profile.street,
    profile.postalCode,
  ];
  if (required.some(isTodo)) return null;

  const sameAs = [profile.linkedin, profile.github].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': `${profile.siteUrl}/${BUSINESS_ID}`,
        name: profile.brand,
        slogan: c.footer.tagline,
        description: c.meta.description,
        url: `${profile.siteUrl}/${lang}/`,
        email: profile.email,
        telephone: profile.phone,
        address: {
          '@type': 'PostalAddress',
          streetAddress: profile.street,
          postalCode: profile.postalCode,
          addressLocality: profile.city,
          addressRegion: 'Nordrhein-Westfalen',
          addressCountry: 'DE',
        },
        areaServed: ['Düsseldorf', 'Nordrhein-Westfalen', 'Deutschland'],
        knowsLanguage: ['de', 'en'],
        priceRange: '€€',
        founder: { '@id': `${profile.siteUrl}/${PERSON_ID}` },
        ...(sameAs.length > 0 ? { sameAs } : {}),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: c.services.title,
          itemListElement: c.services.items.map((s) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: s.name, description: s.forWhom },
            // The public anchors are "ab"-prices, so minPrice, not price.
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: numeric(s.price),
              priceCurrency: 'EUR',
            },
          })),
        },
      },
      {
        '@type': 'Person',
        '@id': `${profile.siteUrl}/${PERSON_ID}`,
        name: fullName,
        jobTitle: profile.role[lang],
        worksFor: { '@id': `${profile.siteUrl}/${BUSINESS_ID}` },
        address: {
          '@type': 'PostalAddress',
          addressLocality: profile.city,
          addressCountry: 'DE',
        },
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
    ],
  };
}

export function faqJsonLd(c: Content): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.home.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
