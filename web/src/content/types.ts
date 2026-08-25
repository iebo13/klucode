/**
 * The shape of the site's copy.
 *
 * Both de.ts and en.ts are declared `satisfies Content`, so adding a section to
 * one language and forgetting the other is a compile error rather than a
 * half-translated page discovered by a client.
 */

export type Card = { title: string; body: string };
/**
 * A question, its answer, and optionally the page that answers it in full.
 *
 * The link is the fix for a site whose copy contained no internal links at
 * all. „Was kostet das?" names two prices and then stops, on a page that is
 * not the price page, with nothing joining the two. A reader who wants the
 * detail has to go back to the nav and guess.
 */
export type Faq = {
  q: string;
  a: string;
  link?: { label: string; to: LinkTarget };
  /**
   * True for the questions about money, which the services page renders
   * inline. A price-shopper who has read four cards and the billing terms
   * used to be sent to another page to read the answers; now the three that
   * matter there are on the page and the link covers the rest.
   */
  price?: boolean;
};

/**
 * Where a link inside the copy is allowed to point.
 *
 * A closed set rather than a href, so a link in the German content cannot
 * hard-code a German slug that the English content then inherits. The routing
 * table owns the slugs and this owns the intent.
 */
export type LinkTarget = 'services' | 'work' | 'approach' | 'about' | 'contact';
/**
 * One step of the process. `body` is the full account on /ablauf; `brief` is
 * the one line the homepage shows beside the step's title, because the
 * homepage used to render all four bodies and was a duplicate of the page it
 * linked to.
 */
export type Step = { title: string; brief: string; body: string };

/**
 * The closing ask of a page: a heading and a lead.
 *
 * One per page rather than one for the site. The same H2, lead and buttons
 * closed six pages and were also the H1 of /kontakt, which a reader meets as
 * the site repeating itself. Each page now asks in its own terms, and the
 * button underneath is the same everywhere because the action is.
 */
export type Cta = { title: string; lead: string };

/**
 * The four services, as a closed set.
 *
 * Declared here because the content files own these keys. The homepage's 3D
 * section keys its objects off this union, so adding a service is a compile
 * error in the scene until it has something to stand at the end of its lane,
 * which is the correct order of events.
 */
export type ServiceKey = 'website' | 'app' | 'capacity' | 'care';

export type Service = {
  key: ServiceKey;
  name: string;
  forWhom: string;
  body: string;
  includes: string[];
  /**
   * What the price does NOT cover, per offer. „Festpreis heißt Festpreis" is
   * only believable next to the lines that say where it stops, and until now
   * that list existed once for the whole site („Was ich nicht mache") rather
   * than once per card. Two or three lines, and every one of them a thing a
   * buyer in this segment actually asks about: content, photography, hosting,
   * a logo.
   */
  excludes: string[];
  price: string;
  priceNote: string;
  /**
   * The delivered project that proves this offer, if there is one.
   *
   * Optional and honestly so: two of the four have a case study and two do
   * not, and inventing a link for the other two would be exactly the kind of
   * decoration the rest of this content refuses. `project` is a Project.key.
   */
  example?: { label: string; project: string };
  /**
   * The unit `price` is charged in, where it is not a one-off project fee.
   * Omitted for the two fixed-price lines; 'day' and 'month' for the two
   * supporting ones. The prose in `priceNote` already says this to a reader —
   * this says it to a machine, so lib/schema.ts can emit 680 €/day as a
   * UnitPriceSpecification rather than as a flat 680 € project price.
   */
  priceUnit?: 'day' | 'month';
};

export type Project = {
  key: string;
  title: string;
  sector: string;
  scope: string;
  summary: string;
  before: string;
  after: string;
  result: string;
  stack: string[];
  /**
   * One client-approved number, as a complete sentence fragment the reader
   * can verify — „Aus drei Tagen Abrechnung wurden ein paar Minuten." The
   * strategy's rule: one real number outperforms every adjective. Optional so
   * the site can ship before approvals arrive; the layout renders a slot the
   * moment the value exists.
   */
  metric?: string;
  /** A written, client-released testimonial. Same deal: add when approved. */
  quote?: { text: string; attribution: string };
  /**
   * The offer this project was delivered under, so a reader who is convinced
   * by the case has somewhere to go that is not the back button. The other
   * half of Service.example.
   */
  offer?: { label: string; service: ServiceKey };
  /**
   * A picture of the delivered system. Three shipped systems and zero pixels
   * of any of them is the single largest gap on this site: every competitor
   * shows work, and precision without evidence reads as copywriting.
   *
   * `src` is a path under public/. Anonymised is fine, and preferable to
   * nothing. Once it exists it replaces the diagram below on the project
   * page; until then the diagram is the figure.
   */
  shot?: { src: string; alt: string };
  /**
   * The system, drawn as what it is: what feeds it, what it is built around,
   * where it runs.
   *
   * Required, so all three projects get the same treatment. It replaced a
   * dashed box on two of them saying a screenshot was coming and no figure at
   * all on the third: three projects, three visual treatments, two of them
   * apologies. A diagram drawn from the case study's own words is honest in a
   * way a stand-in image is not, and it is the same node graph the logo is
   * made of doing real work. The labels are content, so they localise.
   */
  diagram: {
    /** The three left-hand inputs or parts, top to bottom. */
    sources: [string, string, string];
    /** The thing at the centre they share. */
    hub: string;
    /** Where it ends up: the server, the till, the enquiries. */
    out: string;
    /** Accessible description of the whole drawing. */
    label: string;
  };
};

export type LegalSection = { heading: string; paragraphs: string[] };

export type Content = {
  meta: {
    siteName: string;
    title: string;
    description: string;
    /** Per-page <title> and meta description. */
    pages: Record<
      'home' | 'services' | 'work' | 'approach' | 'about' | 'contact' | 'imprint' | 'privacy',
      { title: string; description: string }
    >;
  };

  nav: {
    home: string;
    services: string;
    work: string;
    approach: string;
    about: string;
    contact: string;
    imprint: string;
    privacy: string;
  };

  ui: {
    ctaPrimary: string;
    ctaSecondary: string;
    availablePrefix: string;
    /** Marks an offer that is proposed rather than settled. */
    draft: string;
    skipToContent: string;
    menu: string;
    close: string;
    switchLang: string;
    switchLangLabel: string;
    /** Action labels, not state labels: they say what the press will do. */
    themeToDark: string;
    themeToLight: string;
    /** Footer navigation landmarks — one for the pages, one for the legal pair. */
    footerNavLabel: string;
    footerLegalLabel: string;
    /** Heading over the LinkedIn/GitHub links, shown only once they exist. */
    footerSocialLabel: string;
    backHome: string;
    stack: string;
    before: string;
    after: string;
    result: string;
    includes: string;
    /** Heading over the per-offer list of what the price does not cover. */
    excludes: string;
    from: string;
  };

  home: {
    heroEyebrow: string;
    heroTitle: string;
    heroTitleAccent: string;
    heroLead: string;
    servicesEyebrow: string;
    servicesTitle: string;
    /**
     * The one sentence „Die Ausgangslage" was worth keeping. The rest of that
     * section argued against agencies and website kits between the proof and
     * the prices, which is the wrong place and the wrong register for it; the
     * argument lives in the FAQ now, as a question a reader actually asks.
     */
    servicesLead: string;
    servicesLink: string;
    /**
     * What the crossroads looks like, for everyone who never sees it move.
     *
     * Most visitors: every phone, every tablet held upright, every
     * reduced-motion request, every browser without WebGL. The fallback is
     * honest and complete without it and it never told them the place existed.
     * A 13 kB still of the closing shot does, and it is rendered FROM the
     * scene by tools/shoot-poster.mjs rather than drawn, so it cannot describe
     * a world the site stopped having.
     *
     * The alt text is the same information again for a reader who gets neither
     * the scene nor the image, which is why it names the four objects rather
     * than calling itself an illustration.
     */
    sceneAlt: string;
    workEyebrow: string;
    workTitle: string;
    workLead: string;
    workLink: string;
    approachEyebrow: string;
    approachTitle: string;
    approachLead: string;
    approachLink: string;
    faqEyebrow: string;
    faqTitle: string;
    faq: Faq[];
    finalTitle: string;
    finalLead: string;
  };

  services: {
    eyebrow: string;
    title: string;
    lead: string;
    items: Service[];
    howEyebrow: string;
    howTitle: string;
    howBody: string;
    notTitle: string;
    notBody: string;
    notItems: string[];
    /**
     * The heading over the price questions rendered inline on this page (the
     * home.faq entries flagged `price`), and the link to the rest. This page
     * is where the objection is formed; the answers used to be one click away
     * with only a link to make it.
     */
    faqTitle: string;
    faqLink: string;
    /**
     * The closing ask. Its lead is the triage sentence: for the visitor who
     * cannot tell which of the four they are, the site's answer has always
     * been the 30 minute call, and this is the page where the doubt forms.
     */
    cta: Cta;
    /**
     * A PROPOSED fifth rung, shown on this page only, and null where there
     * isn't one.
     *
     * The ladder jumps 2.500 € to 9.000 €, and the competitors' best selling
     * tiers cluster at 3.900 to 5.500 €. A buyer who has outgrown a landing
     * page and cannot sign a five-figure-adjacent number currently has no rung
     * to stand on and no reason to stay.
     *
     * Deliberately NOT a fifth entry in `items`, and that is the whole reason
     * this field exists. `items` feeds the homepage crossroads, whose floor is
     * laid out for exactly four lanes: boot() refuses any other number, and
     * ServiceKey is closed so that adding a service is a compile error until
     * it has an object to stand at the end of its lane. That guard is correct
     * and a draft price should not be the thing that trips it. Promoting this
     * to a real service means modelling a fifth object and a fifth lane, which
     * is a separate decision taken after this one.
     *
     * `after` names the offer it slots in behind, so the page renders the
     * ladder in price order without anything having to be kept in step by
     * hand.
     */
    middle: {
      after: ServiceKey;
      name: string;
      forWhom: string;
      body: string;
      includes: string[];
      price: string;
      priceNote: string;
    } | null;
  };

  work: {
    eyebrow: string;
    title: string;
    lead: string;
    projects: Project[];
    cta: Cta;
  };

  approach: {
    eyebrow: string;
    title: string;
    lead: string;
    /**
     * How long the whole thing takes, end to end, in one line above the
     * steps. The numbers were only on the offer cards.
     */
    duration: string;
    steps: Step[];
    aiEyebrow: string;
    aiTitle: string;
    aiBody: string[];
    objection: Faq;
    principlesTitle: string;
    principles: Card[];
    /**
     * The questions about continuity and ownership, which belong on the page
     * about how the work is done. They were on the homepage, where they
     * duplicated two of the principles above, and the homepage FAQ is about
     * money and time now.
     */
    faqTitle: string;
    faq: Faq[];
    cta: Cta;
  };

  about: {
    eyebrow: string;
    title: string;
    lead: string;
    paragraphs: string[];
    /** Heading over the links to the three projects the bio mentions. */
    projectsTitle: string;
    nameNote: string;
    factsTitle: string;
    facts: { label: string; value: string }[];
    portraitAlt: string;
    cta: Cta;
  };

  contact: {
    eyebrow: string;
    title: string;
    lead: string;
    /** The same triage line as on the services page, where the form is. */
    triage: string;
    directTitle: string;
    directBody: string;
    /** Label on the WhatsApp link. Rendered only once profile.whatsapp is set. */
    whatsapp: string;
    /** Label on the slot-picker link. Rendered only once profile.booking is set. */
    booking: string;
    formTitle: string;
    fields: {
      name: string;
      email: string;
      company: string;
      /**
       * An optional number, for a call back. The site publishes no phone
       * number, so this is how the 30 minute call the whole site offers can
       * actually be arranged by a reader who would rather talk than write.
       */
      phone: string;
      message: string;
      messagePlaceholder: string;
    };
    consent: string;
    submit: string;
    submitting: string;
    /** Only reachable when profile.formEndpoint is set and the POST succeeded. */
    sent: string;
    /**
     * The mailto path. Assigning `window.location.href` hands off to whatever
     * mail client the device has — which may be none. Nothing was sent, so this
     * copy must not say it was; it says what should have happened and repeats
     * the address for the case where it did not.
     */
    handoffTitle: string;
    handoffBody: string;
    failed: string;
    errorRequired: string;
    errorEmail: string;
    /**
     * The note under the form, and there are two because the form behaves in
     * two ways. mailtoNote describes the hand-off to the visitor's own mail
     * client, which is what every preview build does, because GitHub Pages
     * cannot run the PHP handler. postNote describes the real transmission to
     * this site's own server, which is production. Rendering the wrong one is
     * not a copy slip, it is telling a visitor their data went somewhere it
     * did not.
     */
    mailtoNote: string;
    postNote: string;
    expectTitle: string;
    expect: string[];
  };

  imprint: {
    title: string;
    lead: string;
    sections: LegalSection[];
    todoWarningTitle: string;
    todoWarningBody: string;
  };

  privacy: {
    title: string;
    lead: string;
    updated: string;
    sections: LegalSection[];
  };

  footer: {
    tagline: string;
    builtNote: string;
    rights: string;
  };

  notFound: {
    title: string;
    body: string;
  };
};
