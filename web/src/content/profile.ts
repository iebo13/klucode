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

/** The origin the real site lives on. Everything else is a preview. */
const PRODUCTION_ORIGIN = 'https://klucode.de';

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
  firstName: 'Ibrahim',
  lastName: 'Klusmann',
  role: {
    de: 'Freiberuflicher Softwareentwickler',
    en: 'Freelance software developer',
  },

  // --- contact -----------------------------------------------------------
  email: 'info@klucode.de',

  /**
   * No phone number on the site. Owner's decision, 2026-08-25.
   *
   * null rather than todo(), because this is a deliberate absence and not an
   * unfilled field: it never renders, never reaches openTodos(), and does not
   * hold the Impressum banner up. Every line that would have printed it is
   * dropped instead, in both languages.
   *
   * What this costs, stated plainly because it is a legal question and not a
   * layout one. § 5 Abs. 1 Nr. 2 DDG wants details allowing "schnelle
   * elektronische Kontaktaufnahme und unmittelbare Kommunikation", the email
   * address included. A phone number is NOT compulsory: the ECJ settled that
   * in C-298/07, where an electronic enquiry form answered inside 30 to 60
   * minutes was held sufficient. But the ruling asks for a second route
   * alongside email, and this site currently has none, because formEndpoint is
   * '' and the contact form hands off to mailto. Email and a mailto form are
   * one channel wearing two hats.
   *
   * So the second channel is now the contact form's job. deploy/contact.php is
   * a ready-made first-party handler for the Plesk server: set formEndpoint to
   * '/contact.php' and update privacy.sections § 5 in de.ts and en.ts in the
   * same change. Until that happens the Impressum leans on email alone.
   */
  phone: null as string | null,

  // --- ladungsfähige Anschrift -------------------------------------------
  // Must be a real street address. A P.O. box does not satisfy § 5 DDG.
  street: 'Heyestraße 140',
  postalCode: '40625',
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
  // Kleinunternehmer under § 19 UStG (owner-confirmed 2026-08-14): no VAT ID.
  // The Impressum prints the § 19 statement instead of a § 27a heading.
  vatId: null as string | null,

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
  /**
   * Absolute origin used for canonical URLs, hreflang, sitemap.xml, robots.txt,
   * JSON-LD @ids and OG image URLs. Overridable so a preview deploy (GitHub
   * Pages) does not advertise klucode.de as its canonical home — which would
   * tell search engines the preview is the real site.
   */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN).replace(/\/$/, ''),

  /**
   * Public profiles, emitted as schema.org `sameAs`. Optional by design: null
   * means "no such profile", not "not filled in yet", so neither one blocks the
   * Impressum banner from clearing.
   */
  linkedin: null as string | null,
  github: null as string | null,

  // --- commercial --------------------------------------------------------
  /** Shown in the header. Update it; a stale availability line is worse than none. */
  availableFrom: { de: 'September', en: 'September' },
  responseTime: { de: '24 Stunden', en: 'one working day' },

  /**
   * The date the privacy policy last changed substantively, ISO 8601. Bump it
   * whenever privacy.sections changes — a policy with a stale date reads as an
   * unmaintained one.
   */
  policyUpdated: '2026-08-02',

  /**
   * Optional endpoint for the contact form. Left empty — the decided path
   * (issue #11) is the mailto hand-off, which keeps a static site honest: no
   * hidden third party, and no processor to name in the privacy policy.
   *
   * If server-side sending is ever wanted, deploy/contact.php is a ready-made
   * FIRST-party handler for the Plesk server (set this to '/contact.php') —
   * still no third-party processor. Setting this switches the form to a real
   * POST. Update privacy.sections § 5 in de.ts and en.ts in the same change.
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

/**
 * True on any deploy that is not klucode.de — i.e. the GitHub Pages preview,
 * whose workflow feeds NEXT_PUBLIC_SITE_URL from configure-pages. Previews
 * must be noindex: they would otherwise be indexed as a full duplicate of the
 * production site.
 */
export const isPreviewDeploy = profile.siteUrl !== PRODUCTION_ORIGIN;

/** Formats profile.policyUpdated for display, e.g. "2. August 2026". */
export function policyDate(lang: 'de' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${profile.policyUpdated}T00:00:00Z`));
}
