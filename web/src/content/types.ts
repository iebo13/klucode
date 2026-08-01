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

export type Service = {
  key: string;
  name: string;
  forWhom: string;
  body: string;
  includes: string[];
  price: string;
  priceNote: string;
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
    sent: string;
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
