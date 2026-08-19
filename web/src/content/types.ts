/**
 * The shape of the site's copy.
 *
 * Both de.ts and en.ts are declared `satisfies Content`, so adding a section to
 * one language and forgetting the other is a compile error rather than a
 * half-translated page discovered by a client.
 */

export type Card = { title: string; body: string };
export type Faq = { q: string; a: string };
export type Step = { title: string; body: string };
export type StoryPhase = { phase: string; title: string; body: string };

export type Service = {
  key: string;
  name: string;
  forWhom: string;
  body: string;
  includes: string[];
  price: string;
  priceNote: string;
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
    /**
     * The five-phase scroll story „Vom Gespräch zum laufenden System": the
     * hero is Phase 01 (the hero fields above carry its copy), `phases` are
     * 02–04, and the finale is Phase 05, where the assembled app goes live
     * and the tagline lands. `stage` holds every string that appears inside
     * the aria-hidden 3D scene — it must exist in both languages even though
     * screen readers never meet it, because sighted readers do.
     */
    story: {
      /** The strip above the scene, e.g. „Vom Gespräch zum laufenden System". */
      label: string;
      /** The hero's phase tag, e.g. „Phase 01 — Das Gespräch · 30 Minuten". */
      heroPhase: string;
      phases: StoryPhase[];
      finale: StoryPhase;
      /** The affordance under the hero — a few words beside a small arrow. */
      scrollHint: string;
      stage: {
        addressBar: string;
        emptyLabel: string;
        draftLabel: string;
        /** Requirement cards that float in during Phase 02. */
        requirements: string[];
        /** The one requirement that gets cut — and visibly flies out. */
        discarded: string;
        priceStamp: string;
        weekLabel: string;
        dbLabel: string;
        kpi1Label: string;
        kpi1Value: string;
        kpi2Label: string;
        kpi2Value: string;
        serverLabel: string;
        liveTab: string;
        metricValue: string;
        metricNote: string;
      };
    };
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
    portraitPlaceholder: string;
  };

  contact: {
    eyebrow: string;
    title: string;
    lead: string;
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
    mailtoNote: string;
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
