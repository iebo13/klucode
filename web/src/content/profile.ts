/**
 * Every personal, legal and contact detail on the site, in one file.
 *
 * FILL THIS IN BEFORE THE SITE GOES LIVE. Anything still wrapped in todo()
 * renders as «…» and triggers a loud, un-missable warning banner on the
 * Impressum page — because in Germany an incomplete Impressum is not a cosmetic
 * problem, it is an Abmahnung waiting to happen (§ 5 DDG).
 *
 * There are two ways for a field to be empty and they mean different things:
 *
 *   todo('Telefonnummer')  a value that is REQUIRED and not supplied yet.
 *                          Renders as «Telefonnummer», lands in openTodos(),
 *                          keeps the banner up.
 *   null                   a value that is DELIBERATELY absent — no VAT ID
 *                          because of § 19 UStG, no public GitHub, no
 *                          professional indemnity policy to disclose. Never
 *                          renders, never reaches openTodos(), and the section
 *                          that would have shown it is dropped instead.
 *
 * The distinction exists because openTodos() gates the banner, and a solo
 * Kleinunternehmer with no USt-IdNr. could otherwise never make it go away.
 */

/** Marks a value that still has to be supplied. */
const todo = (label: string): string => `«${label}»`;

const isTodo = (v: string): boolean => v.startsWith('«') && v.endsWith('»');

/** Professional indemnity insurance, as § 2 Nr. 11 DL-InfoV wants it stated. */
type Insurance = {
  name: string;
  /** Full postal address of the insurer. */
  address: string;
  /** Territorial scope of cover — the part most disclosures get wrong. */
  scope: { de: string; en: string };
};

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
  region: { de: 'Nordrhein-Westfalen', en: 'North Rhine-Westphalia' },
  country: { de: 'Deutschland', en: 'Germany' },
  /** ISO 3166-1 alpha-2, for schema.org PostalAddress. */
  countryCode: 'DE',

  // --- tax ---------------------------------------------------------------
  // Publish the USt-IdNr., not the Steuernummer: the Steuernummer exposes your
  // personal tax file and is not required in an Impressum.
  //
  // Set to null if you are a Kleinunternehmer under § 19 UStG and have no
  // USt-IdNr. The Impressum then states that instead of printing an empty
  // § 27a heading.
  vatId: todo('USt-IdNr. (oder null bei Kleinunternehmerregelung § 19 UStG)') as string | null,

  /**
   * § 2 Nr. 11 DL-InfoV: a service provider who HOLDS professional indemnity
   * insurance must disclose the insurer's name and address and the territorial
   * scope of cover. There is no duty to hold a policy — but a partial or wrong
   * disclosure is itself chargeable, so this is all-or-nothing.
   *
   * null = no policy to disclose; the Impressum section is omitted entirely.
   */
  insurance: null as Insurance | null,

  // --- hosting -----------------------------------------------------------
  // Named in the privacy policy as the recipient of server log data.
  host: {
    name: todo('Name des Hosting-Anbieters'),
    address: todo('Anschrift des Hosting-Anbieters'),
  },

  // --- online ------------------------------------------------------------
  domain: 'klucode.de',

  /**
   * Absolute origin used for canonical URLs, hreflang, sitemap.xml, robots.txt,
   * JSON-LD @ids and OG image URLs. Overridable so a preview deploy (GitHub
   * Pages) does not advertise klucode.de as its canonical home — which would
   * tell search engines the preview is the real site.
   */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://klucode.de').replace(/\/$/, ''),

  /**
   * Public profiles, emitted as schema.org `sameAs`. Optional by design: null
   * means "no such profile", not "not filled in yet", so neither one blocks the
   * Impressum banner from clearing.
   */
  linkedin: null as string | null,
  github: null as string | null,

  // --- commercial --------------------------------------------------------
  /** Shown in the header. Update it; a stale availability line is worse than none. */
  availableFrom: { de: 'Januar', en: 'January' },
  responseTime: { de: '24 Stunden', en: 'one working day' },

  /**
   * The date the privacy policy last changed substantively, ISO 8601. Bump it
   * whenever privacy.sections changes — a policy with a stale date reads as an
   * unmaintained one.
   */
  policyUpdated: '2026-08-02',

  /**
   * Optional endpoint for the contact form (Formspree, Basin, your own
   * handler, …). Left empty — the decided path (issue #11) is the mailto
   * hand-off, which keeps a static site honest: no hidden third party, and no
   * processor to name in the privacy policy.
   *
   * Setting this switches the form to a real POST. Update privacy.sections § 5
   * in de.ts and en.ts in the same change if you ever do.
   */
  formEndpoint: '' as string,
} as const;

export const fullName = `${profile.firstName} ${profile.lastName}`;

/**
 * Every REQUIRED field that is still unfilled, for the Impressum warning
 * banner. Deliberately-absent fields are null and never appear here — see the
 * file header for why the two cases have to be distinguishable.
 */
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

/**
 * A value only if it is real — undefined for a todo() placeholder or a
 * deliberate null. Structured data must never carry «Telefonnummer» into a
 * search index, so every schema.org field runs through this.
 */
export function filled(v: string | null | undefined): string | undefined {
  return typeof v === 'string' && v.length > 0 && !isTodo(v) ? v : undefined;
}

/** Formats profile.policyUpdated for display, e.g. "2. August 2026". */
export function policyDate(lang: 'de' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${profile.policyUpdated}T00:00:00Z`));
}
