/**
 * Every personal, legal and contact detail on the site, in one file.
 *
 * FILL THIS IN BEFORE THE SITE GOES LIVE. Anything still wrapped in todo()
 * renders as «…» and triggers a loud, un-missable warning banner on the
 * Impressum page — because in Germany an incomplete Impressum is not a cosmetic
 * problem, it is an Abmahnung waiting to happen (§ 5 DDG).
 */

/** The origin the real site lives on. Everything else is a preview. */
const PRODUCTION_ORIGIN = 'https://klucode.de';

/** Marks a value that still has to be supplied. */
const todo = (label: string): string => `«${label}»`;

/** True while a value is still the todo() placeholder. */
export const isTodo = (v: string): boolean => v.startsWith('«') && v.endsWith('»');

export const profile = {
  // --- identity ----------------------------------------------------------
  brand: 'KluCode',
  firstName: todo('Vorname'),
  lastName: 'Klausmann',
  role: {
    de: 'Freiberuflicher Softwareentwickler',
    en: 'Freelance software developer',
  },

  // --- contact -----------------------------------------------------------
  // § 5 DDG requires an email address PLUS a second fast channel. A phone
  // number is the simplest way to satisfy that.
  email: todo('E-Mail-Adresse'),
  phone: todo('Telefonnummer'),

  // --- ladungsfähige Anschrift -------------------------------------------
  // Must be a real street address. A P.O. box does not satisfy § 5 DDG.
  street: todo('Straße und Hausnummer'),
  postalCode: todo('PLZ'),
  city: 'Düsseldorf',
  country: { de: 'Deutschland', en: 'Germany' },

  // --- tax ---------------------------------------------------------------
  // Publish the USt-IdNr., not the Steuernummer: the Steuernummer exposes your
  // personal tax file and is not required in an Impressum.
  vatId: todo('USt-IdNr. (sobald vorhanden)'),

  // --- hosting -----------------------------------------------------------
  // Named in the privacy policy as the recipient of server log data.
  host: {
    name: todo('Name des Hosting-Anbieters'),
    address: todo('Anschrift des Hosting-Anbieters'),
  },

  // --- online ------------------------------------------------------------
  /**
   * Absolute origin used for canonical URLs, hreflang, sitemap.xml, robots.txt
   * and OG image URLs. Overridable so a preview deploy (GitHub Pages) does not
   * advertise klucode.de as its canonical home — which would tell search
   * engines the preview is the real site.
   */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN).replace(/\/$/, ''),
  // Optional, so NOT todo()-wrapped: todo() feeds the Impressum warning
  // banner, which calls its list "Pflichtangaben" — and a missing LinkedIn
  // URL is not something anyone can send an Abmahnung over. Fill them in and
  // the footer renders the links; leave them empty and it renders nothing.
  linkedin: '' as string,
  github: '' as string,

  // --- commercial --------------------------------------------------------
  /** Shown in the header. Update it; a stale availability line is worse than none. */
  availableFrom: { de: 'Januar', en: 'January' },
  responseTime: { de: '24 Stunden', en: 'one working day' },

  /**
   * Optional endpoint for the contact form (Formspree, Basin, your own
   * handler, …). Left empty, the form falls back to opening a pre-filled
   * email — which keeps a static site honest: no hidden third party.
   */
  formEndpoint: '' as string,
} as const;

export const fullName = `${profile.firstName} ${profile.lastName}`;

/**
 * True on any deploy that is not klucode.de — i.e. the GitHub Pages preview,
 * whose workflow feeds NEXT_PUBLIC_SITE_URL from configure-pages. Previews
 * must be noindex: they would otherwise be indexed as a full duplicate of the
 * production site.
 */
export const isPreviewDeploy = profile.siteUrl !== PRODUCTION_ORIGIN;

/** Every unfilled field, for the Impressum warning banner. */
export function openTodos(): string[] {
  const found: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      if (isTodo(v)) found.push(v.slice(1, -1));
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  };
  walk(profile);
  return found;
}
