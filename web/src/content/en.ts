import { profile } from './profile';
import type { Content } from './types';

const en = {
  meta: {
    siteName: 'KluCode',
    title: 'KluCode — Custom software, built in Düsseldorf',
    description:
      'I build the system your business actually runs on: web applications, internal tools and websites. One engineer, a fixed price, front end to server.',
    pages: {
      home: {
        title: 'KluCode — Custom software, built in Düsseldorf',
        description:
          'Freelance software developer in Düsseldorf. Web applications, internal tools and websites at a fixed price — front end, back end, database and server from one person.',
      },
      services: {
        title: 'Services — KluCode',
        description:
          'Websites from €2,500, custom web applications from €9,000, development capacity from €680/day, maintenance from €90/month.',
      },
      work: {
        title: 'Work — KluCode',
        description:
          'Three delivered systems in production: a CRM with commission management and a comparison portal, a POS system for hospitality, and a landing page with campaign.',
      },
      approach: {
        title: 'Approach — KluCode',
        description:
          'How a project runs: four steps, one price, one person. Plus an honest account of what role AI plays in it.',
      },
      about: {
        title: 'About — KluCode',
        description:
          'Computer science graduate, four years of frontend development, now freelancing in Düsseldorf. What KluCode means and why I work the way I do.',
      },
      contact: {
        title: 'Contact — KluCode',
        description: 'Tell me what is not working. 30 minutes, no pitch.',
      },
      imprint: {
        title: 'Imprint — KluCode',
        description: 'Legal information under § 5 DDG.',
      },
      privacy: {
        title: 'Privacy — KluCode',
        description: 'What this website processes — and what it does not.',
      },
    },
  },

  nav: {
    home: 'Home',
    services: 'Services',
    work: 'Work',
    approach: 'Approach',
    about: 'About',
    contact: 'Contact',
    imprint: 'Imprint',
    privacy: 'Privacy',
  },

  ui: {
    ctaPrimary: 'Discuss a project',
    ctaSecondary: 'See the work',
    availablePrefix: 'Available from',
    skipToContent: 'Skip to content',
    menu: 'Menu',
    close: 'Close',
    switchLang: 'DE',
    switchLangLabel: 'Auf Deutsch ansehen',
    backHome: 'Back to the homepage',
    stack: 'Stack',
    before: 'Before',
    after: 'After',
    result: 'Result',
    includes: 'Included',
    from: 'from',
  },

  home: {
    heroEyebrow: 'Software development · Düsseldorf',
    heroTitle: 'The system your business',
    heroTitleAccent: 'actually runs on.',
    heroLead:
      'Web applications, internal tools and websites — front end to running server. One point of contact, a fixed price, and the person in the meeting is the person writing the code.',
    heroProof: [
      'Three systems in production',
      'BSc Computer Science · 4 years professional',
      'Fixed price before anything starts',
    ],

    problemEyebrow: 'The situation',
    problemTitle: 'Two options, and neither one fits.',
    problemLead:
      'Most teams I speak to have picked this up twice already and put it back down. For good reasons.',
    problemCards: [
      {
        title: 'The agency',
        body: 'Four months, five figures, three points of contact. You are also paying for the distance between the person who understood the problem and the person who builds it. Most of the understanding is lost on that trip.',
      },
      {
        title: 'The site builder',
        body: 'Looks finished in two days and stops exactly where your business starts: the commission logic, the shift handover, the one report you actually need.',
      },
      {
        title: 'So, no change',
        body: 'Spreadsheets, chat threads and a folder only one person understands. It works — until that person is on holiday, or the file exists in three versions.',
      },
    ],
    answerTitle: 'The third option',
    answerBody:
      'A qualified engineer who talks to you directly, understands how you actually work, and builds the whole system — interface, logic, database, server. At a fixed price you know before anything begins.',

    servicesEyebrow: 'Services',
    servicesTitle: 'Four ways to work together.',
    servicesLink: 'All services and prices',

    workEyebrow: 'Work',
    workTitle: 'Three systems, running daily.',
    workLead: 'No concept studies, no templates. Three projects that shipped and get used.',
    workLink: 'See the work in detail',

    approachEyebrow: 'Approach',
    approachTitle: 'Why this takes weeks, not quarters.',
    approachLead:
      'Because no brief passes through three departments, nothing needs translating — and because I work with modern tooling. What that means in practice is set out openly on its own page.',
    approachLink: 'How I work',

    faqEyebrow: 'Common questions',
    faqTitle: 'What people want to know first.',
    faq: [
      {
        q: 'What does it cost?',
        a: 'A website starts at €2,500, a custom web application at €9,000. You get the exact fixed price after a 30-minute call and a written scope — not before, because a number without a scope is worthless.',
      },
      {
        q: 'How long does it take?',
        a: 'A landing page, two to three weeks. A web application, four to ten weeks depending on scope. You see the first working version much earlier — usually after two weeks.',
      },
      {
        q: 'What happens if you are unavailable?',
        a: 'The fair question to ask one person. So: the code sits in a repository you have access to, documentation sits next to it, and nothing in the stack is exotic enough that only I can operate it. Any other developer can take over. That is not a contingency plan, it is the baseline.',
      },
      {
        q: 'Do I own the code?',
        a: 'Yes. Entirely, with all credentials, on final payment. No subscription you are locked into, no licence I can withdraw.',
      },
      {
        q: 'Do you handle maintenance?',
        a: 'Yes, from €90 a month: updates, security patches, backups, small changes. You do not have to take it — but software nobody maintains becomes a problem within two years.',
      },
      {
        q: 'Do you work remotely?',
        a: 'Yes. Around the Rhineland I am happy to come in person; everything else works remotely. Across three delivered projects, distance was never the issue.',
      },
    ],

    finalTitle: 'Tell me what is not working.',
    finalLead: `30 minutes, no obligation, no slide deck. If I am not the right fit I will say so — and point you at someone who is, where I can. Reply within ${profile.responseTime.en}.`,
  },

  services: {
    eyebrow: 'Services',
    title: 'Four services. That is enough.',
    lead: 'Prices are starting points for the scope described. You get the binding fixed price in writing before I start.',
    items: [
      {
        key: 'website',
        name: 'Website & landing page',
        forWhom: 'For businesses that need to be found and to receive enquiries.',
        body: 'A page that loads, works on a phone and can be found. Hand-built, without site-builder weight — which is why it is fast, and why it can grow later.',
        includes: [
          'Structure, copy architecture and design',
          'Responsive from 320px to desktop',
          'Technical SEO, sub-second load',
          'Legally compliant imprint and privacy pages',
          'No cookie banner, because no tracking',
          'A handover session so you can maintain the content',
        ],
        price: '€2,500',
        priceNote: '2 to 3 weeks · fixed price',
      },
      {
        key: 'app',
        name: 'Custom web application',
        forWhom: 'For processes currently living in spreadsheets, on paper or in chat.',
        body: 'CRM, point of sale, reporting, internal tooling, portals. Built around your process rather than the other way round — including database, user management and server. This is the work I like most.',
        includes: [
          'Analysis of the current process, with the people who run it',
          'Front end, back end, database and deployment',
          'Roles, permissions and audit trails',
          'Data migration from whatever you use today',
          'First working version after roughly two weeks',
          'Documentation and handover to your team',
        ],
        price: '€9,000',
        priceNote: '4 to 10 weeks · fixed price',
      },
      {
        key: 'capacity',
        name: 'Development capacity',
        forWhom: 'For agencies and product teams that need frontend capacity.',
        body: 'React, Next.js, TypeScript, Node.js. I pick up existing code, follow your conventions, and can join a client call without embarrassing you.',
        includes: [
          'React · Next.js · TypeScript · Node.js · PostgreSQL',
          'Onboarding into existing codebases',
          'Code review and pull requests to your standards',
          'Remote, on-site within the Rhineland',
          'Bookable from five days',
        ],
        price: '€680',
        priceNote: 'per day · framework agreement available',
      },
      {
        key: 'care',
        name: 'Maintenance & operations',
        forWhom: 'For anyone running something — built by me or by someone else.',
        body: 'Software nobody maintains becomes a security problem within two years. The cheapest way to avoid that is a small monthly amount instead of a large emergency invoice.',
        includes: [
          'Updates and security patches',
          'Uptime monitoring',
          'Backups, verified regularly',
          'Small changes within an agreed scope',
          'One contact, response within 24 hours',
        ],
        price: '€90',
        priceNote: 'per month · cancel monthly',
      },
    ],
    howEyebrow: 'How billing works',
    howTitle: 'Fixed price, not hours.',
    howBody:
      'You buy an outcome, not working time. The price is set before the start and changes only if you change the scope — in which case you get a new number and a new date, in writing, before I carry on. Payment in three parts: 40% on signature, 30% at the first usable version, 30% on handover.',
    notTitle: 'What I do not do',
    notBody: 'The fastest way to be believed is to say where I am not the right person:',
    notItems: [
      'Native iOS and Android apps',
      'Graphic design, print, logo work',
      'SEO or social media as an ongoing service',
      'Off-the-shelf shop systems — there are better and cheaper options',
      'Staffing teams or running projects beyond twelve months',
    ],
  },

  work: {
    eyebrow: 'Work',
    title: 'Three systems in production.',
    lead: 'All three shipped, paid for and in daily use. I name clients only with written permission — the numbers matter more than the logos.',
    projects: [
      {
        key: 'crm',
        title: 'CRM, commission management and comparison portal',
        sector: 'Sales organisation',
        scope: 'Largest project · full stack',
        summary:
          'Three systems that used to be three spreadsheets — customer management, commission settlement and a public comparison portal, all sharing the same data.',
        before:
          'Customer data in one sheet, commissions in another, the portal maintained by hand. Settlement took several days every month, and every transcription error cost money or trust.',
        after:
          'One system, one database. Commission is derived from data that is captured anyway. The portal reads from the same source, so it is never out of date.',
        result:
          'Monthly settlement runs automatically. No file travels by email, and there is no second version nobody can vouch for.',
        stack: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Plesk'],
      },
      {
        key: 'pos',
        title: 'Point-of-sale system for a shisha bar',
        sector: 'Hospitality',
        scope: 'Medium project · front end & database',
        summary:
          'A till that fits how the venue works — rather than a venue reorganised to fit a till.',
        before:
          'Off-the-shelf systems do not model how a shisha bar runs: open tabs at the table, staff changing mid-shift, cashing up at the end of the night.',
        after:
          'An interface usable on a tablet in low light: large targets, few steps per entry, and a data model in which every entry stays traceable.',
        result:
          'Usable without training. Cashing up at the end of the night is a procedure rather than a reconstruction.',
        stack: ['JavaScript', 'Database modelling', 'Touch UI'],
      },
      {
        key: 'landing',
        title: 'Landing page and LinkedIn campaign',
        sector: 'Cleaning company',
        scope: 'Small project · front end & marketing',
        summary:
          'No builder, no framework weight: a page that loads — plus the campaign that brings people to it.',
        before:
          'No web presence at all. New work arrived purely by word of mouth, which put a ceiling on growth.',
        after:
          'A hand-built page in plain JavaScript with no framework overhead, plus a LinkedIn campaign using AI-generated video and imagery — at a cost that would otherwise have been out of reach for a business this size.',
        result:
          'Visibility beyond the referral circle. What began as a web job became a complete customer-acquisition package.',
        stack: ['Vanilla JavaScript', 'HTML', 'CSS', 'AI-assisted image and video production'],
      },
    ],
    noteTitle: 'On numbers and names',
    noteBody:
      'Hard metrics and client quotes will be added here once the respective clients have approved them in writing. Until then I would rather describe the work precisely than impressively.',
  },

  approach: {
    eyebrow: 'Approach',
    title: 'Four steps. One price. One person.',
    lead: 'No nine-phase process diagram. This is how a project actually runs.',
    steps: [
      {
        title: 'The call',
        body: '30 minutes. You describe how things work today and what is wrong with it. I ask questions and tell you honestly whether I am the right fit. Free, and with nothing attached afterwards.',
      },
      {
        title: 'Scope and fixed price',
        body: 'One page: what gets built, what explicitly does not, by when, for how much. You sign a number, not an estimate. That page is also what we both measure the result against later.',
      },
      {
        title: 'Building, in the open',
        body: 'After roughly two weeks you see the first working version — not a picture of one, something you can click. Then a steady rhythm. You always know where things stand without having to attend meetings for it.',
      },
      {
        title: 'Handover',
        body: 'Go-live, a walkthrough, documentation, every credential. The code is yours. After that, either a maintenance agreement or silence — both are fine, and I have had both.',
      },
    ],

    aiEyebrow: 'Stated openly',
    aiTitle: 'How I work this fast.',
    aiBody: [
      'I develop with AI assistance. All three projects on this site were built that way. I write that down plainly because it is the honest answer to how one person handles the workload of a small agency.',
      'The benefit to you is not the tooling, it is two numbers: the price and the date. What an agency quotes at four months and five figures, I deliver in weeks — not because I type faster, but because typing is no longer the bottleneck.',
      'What explicitly does not change is accountability. I review, test and stand behind every line that reaches your server.',
    ],
    objection: {
      q: 'Is an AI just writing this?',
      a: 'No — an AI types faster than I can. What it cannot do is decide what should be built, where the edges of your business are, and which mistakes will cost you money at month end. That is my job. I review, test and stand behind every line that ships — with a completed computer science degree and four years of professional experience behind it. The difference for you is not quality. It is the price and the date.',
    },

    principlesTitle: 'What I hold to',
    principles: [
      {
        title: 'Nothing only I can operate',
        body: 'Proven, widely used tools instead of exotic choices. So that any other developer could take over — even if it never becomes necessary.',
      },
      {
        title: 'The code is yours',
        body: 'Repository, credentials, documentation, on final payment. There is no dependency on me that I maintain artificially.',
      },
      {
        title: 'Bad news travels immediately',
        body: 'If a date is at risk you hear about it the day I know — not in the week it was due.',
      },
      {
        title: 'Accessible, because it is part of the job',
        body: 'Contrast, keyboard operation, screen readers. This site is the evidence: no cookies, no third-party servers, WCAG-checked colour values.',
      },
    ],
  },

  about: {
    eyebrow: 'About',
    title: 'One person. Not a "we".',
    lead: 'This site says "I" throughout, because KluCode is one person. That is not modesty, it is the point: you are talking to whoever builds it.',
    paragraphs: [
      'I am 33, hold a BSc in Computer Science and live in Düsseldorf. I spent four years employed as a frontend developer, and learned in that time which part of the job suits me best: not implementing finished specifications, but the conversation before them — working out what someone actually needs, and then building the right thing.',
      'Alongside that I delivered three projects for my own clients: a CRM with commission management and an attached comparison portal, a point-of-sale system for a shisha bar, and a landing page with a LinkedIn campaign for a cleaning company. All three are running. All three were paid for. That is the work I want to do full time.',
      'What matters to me: I do not build software that impresses. I build software someone uses on a Monday morning without thinking about it — and that someone else can still work on two years later.',
    ],
    nameNote:
      'The "Klu" in KluCode comes from Klausmann. And from the German "klug" — smart, considered — because that is the part of the work that counts: what gets built is decided before the first line of code.',
    factsTitle: 'The short version',
    facts: [
      { label: 'Based in', value: 'Düsseldorf, North Rhine-Westphalia' },
      { label: 'Education', value: 'BSc Computer Science' },
      { label: 'Experience', value: '4 years frontend development' },
      { label: 'Focus', value: 'React · Next.js · TypeScript · Node.js · PostgreSQL' },
      { label: 'Delivered', value: '3 systems in production' },
      { label: 'Languages', value: 'German (native), English' },
    ],
    portraitAlt: `${profile.firstName} ${profile.lastName}, freelance software developer in Düsseldorf`,
    portraitPlaceholder:
      'A photograph of you belongs here. A one-person brand with no face is asking for trust it has not offered — drop the image in as public/portrait.jpg.',
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Tell me what is not working.',
    lead: `30 minutes, no obligation, no slide deck. You will hear back within ${profile.responseTime.en}.`,
    directTitle: 'Directly',
    directBody: 'Calling or writing is faster than any form.',
    formTitle: 'Or here',
    fields: {
      name: 'Name',
      email: 'Email',
      company: 'Company (optional)',
      message: 'What is this about?',
      messagePlaceholder:
        'How does it work today — and what should change? Two or three sentences is plenty.',
    },
    consent:
      'I agree that my details may be processed in order to handle my enquiry. They will not be passed on. Withdrawable at any time by email.',
    submit: 'Send message',
    submitting: 'Sending …',
    sent: `Got it. You will hear from me within ${profile.responseTime.en}.`,
    failed: 'That did not work. Please email me directly.',
    errorRequired: 'Required.',
    errorEmail: 'That address does not look right.',
    mailtoNote:
      'This site runs without a server and without tracking. The form therefore opens your email client with the message ready to go — so you can see exactly what is sent, and to whom.',
    expectTitle: 'What happens next',
    expect: [
      'A reply within one working day.',
      'A 30-minute call, by phone or video.',
      'Then a written scope with a fixed price — or an honest no.',
    ],
  },

  imprint: {
    title: 'Imprint',
    lead: 'Legal information under § 5 DDG. The German version is the authoritative one.',
    sections: [
      {
        heading: 'Service provider',
        paragraphs: [
          `${profile.firstName} ${profile.lastName}`,
          profile.role.en,
          `${profile.street}`,
          `${profile.postalCode} ${profile.city}`,
          profile.country.en,
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Phone: ${profile.phone}`, `Email: ${profile.email}`],
      },
      {
        heading: 'VAT identification number',
        paragraphs: [
          'VAT identification number under § 27 a of the German VAT Act:',
          profile.vatId,
        ],
      },
      {
        heading: 'Professional status',
        paragraphs: [
          'Freelance activity within the meaning of § 18 (1) no. 1 of the German Income Tax Act (engineering-like profession). Conferred in the Federal Republic of Germany.',
        ],
      },
      {
        heading: 'Responsible for content',
        paragraphs: [`${profile.firstName} ${profile.lastName}, address as above.`],
      },
      {
        heading: 'Dispute resolution',
        paragraphs: [
          'The European Commission provides a platform for online dispute resolution: https://ec.europa.eu/consumers/odr',
          'I am neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.',
        ],
      },
      {
        heading: 'Liability for content',
        paragraphs: [
          'As a service provider I am responsible for my own content on these pages under general law, in accordance with § 7 (1) DDG. Under §§ 8 to 10 DDG, however, I am not obliged to monitor transmitted or stored third-party information, or to investigate circumstances that indicate unlawful activity.',
          'Obligations to remove or block the use of information under general law remain unaffected. Liability in this respect is only possible from the point at which a specific infringement becomes known. On becoming aware of such infringements I will remove the content concerned without delay.',
        ],
      },
      {
        heading: 'Liability for links',
        paragraphs: [
          'This site contains links to external third-party websites over whose content I have no influence. I therefore cannot accept any responsibility for that third-party content. The respective provider or operator of the linked pages is always responsible for their content.',
          'The linked pages were checked for possible legal infringements at the time of linking. No unlawful content was apparent at that time. On becoming aware of any infringement I will remove such links without delay.',
        ],
      },
      {
        heading: 'Copyright',
        paragraphs: [
          'The content and works created by the site operator on these pages are subject to German copyright law. Reproduction, adaptation, distribution and any kind of exploitation outside the limits of copyright require the written consent of the respective author or creator.',
        ],
      },
    ],
    todoWarningTitle: 'This imprint is still incomplete',
    todoWarningBody:
      'The following mandatory details are missing and must be entered in src/content/profile.ts before going live. In Germany, a website with an incomplete imprint can attract a formal warning and costs:',
  },

  privacy: {
    title: 'Privacy policy',
    lead: 'In short: this site sets no cookies, embeds no third-party services and does not analyse your behaviour. What data nonetheless arises is set out below. The German version is the authoritative one.',
    updated: 'Last updated: set on go-live',
    sections: [
      {
        heading: '1. Controller',
        paragraphs: [
          'The controller for data processing on this website within the meaning of the General Data Protection Regulation (GDPR) is:',
          `${profile.firstName} ${profile.lastName}, ${profile.street}, ${profile.postalCode} ${profile.city}, ${profile.country.en}`,
          `Email: ${profile.email} · Phone: ${profile.phone}`,
        ],
      },
      {
        heading: '2. What this website does not do',
        paragraphs: [
          'This website sets no cookies and uses no comparable techniques such as local storage for recognition. For that reason there is no consent banner here.',
          'There is no reach measurement and no analysis of your usage behaviour. No third-party services are embedded — no analytics, no maps, no social networks, no external video.',
          'In particular, no fonts are loaded from third-party servers. All typefaces are served from this website’s own server, so your IP address is not transmitted to any third party.',
        ],
      },
      {
        heading: '3. Server log files',
        paragraphs: [
          'When you access this website, the hosting provider automatically records information transmitted by your browser. This typically comprises: the page requested, the date and time of access, the volume of data transferred, notification of successful retrieval, browser type and version, operating system, referrer URL and the IP address.',
          'The legal basis is Art. 6 (1) (f) GDPR. The legitimate interest lies in the technically error-free operation and the security of the website. This data is not merged with other data sources and is not used to identify individuals.',
          `The hosting provider processes this data as a processor on the basis of an agreement under Art. 28 GDPR: ${profile.host.name}, ${profile.host.address}.`,
        ],
      },
      {
        heading: '4. Getting in touch',
        paragraphs: [
          'If you contact me by email, by phone or via the contact form, I process your details solely to handle your enquiry and for any follow-up questions.',
          'The legal basis is Art. 6 (1) (b) GDPR where the enquiry relates to a contract, and otherwise Art. 6 (1) (f) GDPR or your consent under Art. 6 (1) (a) GDPR.',
          'I do not pass your data on without your consent. It is deleted once your enquiry has been dealt with conclusively and no statutory retention obligations apply. Commercial and tax retention periods remain unaffected.',
        ],
      },
      {
        heading: '5. Contact form',
        paragraphs: [
          'The form on the contact page does not transmit your details on its own. It opens your email client with a prepared message. Sending is done by you, through your own email provider. No data is transmitted to this website or to any third party in the process.',
          'Should server-side sending be introduced in future, this policy will be amended beforehand.',
        ],
      },
      {
        heading: '6. Encryption',
        paragraphs: [
          'This website uses TLS encryption for security reasons. You can recognise an encrypted connection by "https://" in your browser’s address bar.',
        ],
      },
      {
        heading: '7. Your rights',
        paragraphs: [
          'You have the right at any time to information about the data stored about you (Art. 15 GDPR), to rectification (Art. 16 GDPR), to erasure (Art. 17 GDPR), to restriction of processing (Art. 18 GDPR), to data portability (Art. 20 GDPR) and a right to object (Art. 21 GDPR).',
          'You may withdraw consent at any time with effect for the future. An informal message by email is sufficient.',
          'You also have the right to lodge a complaint with a supervisory authority. The competent authority in North Rhine-Westphalia is the Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen, Kavalleriestraße 2–4, 40213 Düsseldorf.',
        ],
      },
      {
        heading: '8. Changes to this policy',
        paragraphs: [
          'I will amend this privacy policy whenever the website or the legal position changes. The version published here applies.',
        ],
      },
    ],
  },

  footer: {
    tagline: 'Clever, not complicated.',
    builtNote:
      'This site: statically served, no cookies, no third-party servers, fonts hosted locally.',
    rights: 'All rights reserved.',
  },

  notFound: {
    title: 'This page does not exist.',
    body: 'The homepage is probably a better start.',
  },
} satisfies Content;

export default en;
