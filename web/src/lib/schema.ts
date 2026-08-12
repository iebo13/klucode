/**
 * schema.org JSON-LD, built from the same content that renders on the page.
 *
 * Every value here is read from `src/content` or `src/content/profile.ts`. That
 * is the whole design rule: structured data that is hand-written next to the
 * copy it describes drifts from it within one edit, and a mismatch between what
 * a page says and what its markup claims is worse than no markup at all.
 *
 * ── URLs ────────────────────────────────────────────────────────────────────
 * Absolute, built from `profile.siteUrl`, which ALREADY CONTAINS the base path
 * on a subpath deploy. So `abs()` — never `asset()`. This is the same split
 * `src/lib/base-path.ts` documents for `alternates` vs `icons`, and it fails
 * the same invisible way: nothing looks wrong until the site is served from a
 * subpath, at which point every @id reads /klucode/klucode/. The CI job builds
 * with NEXT_PUBLIC_BASE_PATH set and greps the output for exactly that.
 *
 * ── Placeholders ───────────────────────────────────────────────────────────
 * `filled()` drops any value still wrapped in todo(). A preview build with an
 * unfilled profile.ts therefore emits a smaller graph rather than an invalid
 * one advertising «Telefonnummer» as a phone number.
 */

import type { Content } from '@/content';
import { filled, fullName, profile } from '@/content/profile';
import { pathFor, type Lang, type PageKey } from '@/lib/routes';

/** A JSON-LD node. Loose on purpose — schema.org is not a closed vocabulary. */
type Node = Record<string, unknown>;

const abs = (path: string): string => `${profile.siteUrl}${path}`;

const BUSINESS_ID = `${profile.siteUrl}/#business`;
const PERSON_ID = `${profile.siteUrl}/#person`;
const WEBSITE_ID = `${profile.siteUrl}/#website`;

const locale = (lang: Lang): string => (lang === 'de' ? 'de-DE' : 'en-GB');

/** Drops undefined entries so an unfilled profile does not emit [null, null]. */
const compact = <T>(items: (T | undefined)[]): T[] => items.filter((v): v is T => v !== undefined);

function postalAddress(lang: Lang): Node | undefined {
  const streetAddress = filled(profile.street);
  const postalCode = filled(profile.postalCode);
  // A PostalAddress without a street is not an address; § 5 DDG needs a
  // ladungsfähige Anschrift and so does Google. Emit nothing rather than half.
  if (!streetAddress || !postalCode) return undefined;

  return {
    '@type': 'PostalAddress',
    streetAddress,
    postalCode,
    addressLocality: profile.city,
    addressRegion: profile.region[lang],
    addressCountry: profile.countryCode,
  };
}

const sameAs = (): string[] => compact([filled(profile.linkedin), filled(profile.github)]);

/** UN/CEFACT common codes, which is what schema.org's unitCode expects. */
const UNIT_CODE = { day: 'DAY', month: 'MON' } as const;

/**
 * The published number is a *starting* price, so it is emitted as `minPrice`,
 * never as `price` — claiming a firm price for scope-dependent work would
 * misrepresent the offer, and the site's own copy says the binding figure comes
 * after a call.
 *
 * The two supporting lines are rates, not project fees. 680 € as a flat
 * `minPrice` reads as "a day of work costs the same as a website"; a
 * UnitPriceSpecification carries the per-day / per-month unit the visible
 * `priceNote` already states in prose.
 */
function priceSpec(price: string, unit?: 'day' | 'month'): Node {
  const minPrice = Number(price.replace(/[^\d]/g, ''));

  return unit
    ? {
        '@type': 'UnitPriceSpecification',
        minPrice,
        priceCurrency: 'EUR',
        unitCode: UNIT_CODE[unit],
        valueAddedTaxIncluded: false,
      }
    : {
        '@type': 'PriceSpecification',
        minPrice,
        priceCurrency: 'EUR',
        valueAddedTaxIncluded: false,
      };
}

/**
 * The business. `ProfessionalService` rather than plain `LocalBusiness`: it is
 * the subtype for a services business, and it is what local results key off.
 */
function business(lang: Lang, c: Content): Node {
  const profiles = sameAs();

  return {
    '@type': 'ProfessionalService',
    '@id': BUSINESS_ID,
    name: profile.brand,
    legalName: filled(profile.firstName) ? fullName : undefined,
    url: abs(pathFor('home', lang)),
    description: c.meta.description,
    image: abs('/og.png'),
    logo: abs('/logo.svg'),
    email: filled(profile.email),
    telephone: filled(profile.phone),
    vatID: filled(profile.vatId),
    address: postalAddress(lang),
    areaServed: [
      { '@type': 'City', name: profile.city },
      { '@type': 'AdministrativeArea', name: profile.region[lang] },
      { '@type': 'Country', name: profile.country[lang] },
    ],
    // The cheapest service is the honest floor; a range says more than "€€".
    priceRange: `${c.ui.from} ${c.services.items[0]?.price ?? ''}`.trim(),
    currenciesAccepted: 'EUR',
    knowsLanguage: ['de', 'en'],
    founder: { '@id': PERSON_ID },
    sameAs: profiles.length > 0 ? profiles : undefined,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: c.services.title,
      itemListElement: c.services.items.map((s) => ({
        '@type': 'Offer',
        name: s.name,
        description: s.forWhom,
        priceCurrency: 'EUR',
        priceSpecification: priceSpec(s.price, s.priceUnit),
        itemOffered: { '@type': 'Service', name: s.name, description: s.body },
      })),
    },
  };
}

function person(lang: Lang, c: Content): Node {
  const profiles = sameAs();

  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: filled(profile.firstName) ? fullName : profile.brand,
    jobTitle: profile.role[lang],
    description: c.about.lead,
    url: abs(pathFor('about', lang)),
    email: filled(profile.email),
    telephone: filled(profile.phone),
    address: postalAddress(lang),
    worksFor: { '@id': BUSINESS_ID },
    knowsLanguage: ['de', 'en'],
    // The stack the About page already lists, as machine-readable expertise.
    knowsAbout: c.about.facts.find((f) => f.value.includes('·'))?.value.split(' · '),
    sameAs: profiles.length > 0 ? profiles : undefined,
  };
}

function website(lang: Lang, c: Content): Node {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: abs(pathFor('home', lang)),
    name: c.meta.siteName,
    description: c.meta.description,
    inLanguage: locale(lang),
    publisher: { '@id': BUSINESS_ID },
  };
}

function breadcrumbs(lang: Lang, c: Content, key: PageKey): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: c.nav.home, item: abs(pathFor('home', lang)) },
      { '@type': 'ListItem', position: 2, name: c.nav[key], item: abs(pathFor(key, lang)) },
    ],
  };
}

/**
 * FAQPage, from the same array the homepage accordion renders.
 *
 * Read this before adding to it: Google deprecated FAQ structured data on
 * 7 May 2026 — the FAQ rich result is gone from Search, Rich Results Test
 * support ends in June 2026 and the Search Console report in August 2026. This
 * is NOT here as a Google ranking or appearance lever, and no acceptance
 * criterion should depend on it. It stays because the markup is still valid,
 * costs ten lines generated from an array that already exists, and is still
 * consumed by Bing and by the retrieval crawlers. If it ever costs more than
 * this, delete it.
 */
function faq(c: Content): Node {
  return {
    '@type': 'FAQPage',
    mainEntity: c.home.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/**
 * The graph for one page. `key` is 'home' or a PageKey — the same union the
 * router uses, so a new page cannot be added without deciding what it claims.
 */
export function pageSchema(lang: Lang, c: Content, key: PageKey | 'home'): Node {
  const nodes: Node[] = [business(lang, c), website(lang, c)];

  if (key === 'home') nodes.push(faq(c));
  else nodes.push(breadcrumbs(lang, c, key));

  if (key === 'about' || key === 'contact') nodes.push(person(lang, c));

  return { '@context': 'https://schema.org', '@graph': nodes };
}
