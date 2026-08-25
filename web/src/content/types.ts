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
};

/**
 * Where a link inside the copy is allowed to point.
 *
 * A closed set rather than a href, so a link in the German content cannot
 * hard-code a German slug that the English content then inherits. The routing
 * table owns the slugs and this owns the intent.
 */
export type LinkTarget = 'services' | 'work' | 'approach' | 'about' | 'contact';
export type Step = { title: string; body: string };

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
  /**
   * One line naming what the object at the end of this way actually is. Shown
   * beside the 3D crossroads on the homepage, where the reader can see the
   * object but has not been told what they are looking at. Required rather
   * than optional so a half-translated section is a compile error.
   */
  reads: string;
  body: string;
  includes: string[];
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
    from: string;
  };

  home: {
    heroEyebrow: string;
    heroTitle: string;
    heroTitleAccent: string;
    heroLead: string;
    heroProof: string[];
    problemEyebrow: string;
    problemTitle: string;
    problemLead: string;
    problemCards: Card[];
    answerTitle: string;
    answerBody: string;
    servicesEyebrow: string;
    servicesTitle: string;
    servicesLink: string;
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
     * Sends a price-shopper to the answers instead of leaving them on the
     * board. This page is where the objection is formed and the six answers
     * that meet it, including „Was kostet das?", are on the homepage with
     * nothing pointing at them from here.
     */
    faqTitle: string;
    faqBody: string;
    faqLink: string;
    /**
     * For the visitor who cannot tell which of the four they are.
     *
     * The site's answer to that has always been the 30 minute call, which is
     * right for the positioning and invisible on the page where the doubt
     * actually forms. One sentence converts it into the funnel that already
     * exists instead of losing it to a closed tab.
     */
    triage: string;
  };

  work: {
    eyebrow: string;
    title: string;
    lead: string;
    projects: Project[];
    noteTitle: string;
    noteBody: string;
  };

  approach: {
    eyebrow: string;
    title: string;
    lead: string;
    steps: Step[];
    aiEyebrow: string;
    aiTitle: string;
    aiBody: string[];
    objection: Faq;
    principlesTitle: string;
    principles: Card[];
  };

  about: {
    eyebrow: string;
    title: string;
    lead: string;
    paragraphs: string[];
    nameNote: string;
    factsTitle: string;
    facts: { label: string; value: string }[];
    portraitAlt: string;
  };

  contact: {
    eyebrow: string;
    title: string;
    lead: string;
    /** The same triage line as on the services page, where the form is. */
    triage: string;
    directTitle: string;
    directBody: string;
    formTitle: string;
    fields: {
      name: string;
      email: string;
      company: string;
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
