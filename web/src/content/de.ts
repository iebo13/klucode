import { filled, policyDate, profile } from './profile';
import type { Content } from './types';

const de = {
  meta: {
    siteName: 'KluCode',
    // „Webentwicklung Düsseldorf" is what a local owner actually types into
    // Google; the old title left the query term entirely to the description.
    // „Individuelle" moved there; the 60-char budget check-meta.mjs enforces
    // does not fit all three of brand, positioning word and query term.
    title: 'KluCode · Software & Webentwicklung in Düsseldorf',
    description:
      'Ich baue die Software, mit der Ihr Betrieb tatsächlich arbeitet: Web-Anwendungen, interne Tools und Websites. Ein Ansprechpartner, Festpreis, vom ersten Klick bis zum laufenden Server.',
    pages: {
      home: {
        title: 'KluCode · Software & Webentwicklung in Düsseldorf',
        description:
          'Freiberuflicher Softwareentwickler in Düsseldorf. Web-Anwendungen, interne Tools und Websites zum Festpreis. Frontend, Backend und Server von einer Person.',
      },
      // Plain spaces in this description on purpose: check-meta parses and
      // budgets the raw source string (an escape counts six chars), and a
      // search snippet never line-breaks inside a price. The NBSP rule
      // applies to rendered copy.
      services: {
        title: 'Leistungen · KluCode',
        description:
          'Website und Landingpage ab 2.500 €, individuelle Web-Anwendungen ab 9.000 €, Entwickler-Kapazität ab 680 €/Tag, Betrieb und Wartung ab 90 €/Monat.',
      },
      work: {
        title: 'Projekte · KluCode',
        description:
          'Drei Systeme im Produktivbetrieb: ein CRM mit Provisionsverwaltung, ein Kassensystem für die Gastronomie und eine Landingpage samt Kampagne.',
      },
      approach: {
        title: 'Ansatz · KluCode',
        description:
          'Wie ein Projekt bei mir abläuft: vier Schritte, ein Festpreis, ein Ansprechpartner. Und eine ehrliche Antwort auf die Frage, welche Rolle KI dabei spielt.',
      },
      about: {
        title: 'Über mich · KluCode',
        description:
          'Informatiker (B.Sc.), vier Jahre Frontend-Entwicklung, jetzt freiberuflich in Düsseldorf. Was KluCode heißt und warum ich so arbeite, wie ich arbeite.',
      },
      contact: {
        title: 'Kontakt · KluCode',
        description:
          'Erzählen Sie mir, was gerade nicht läuft. 30 Minuten, unverbindlich, ohne Präsentation.',
      },
      imprint: {
        title: 'Impressum · KluCode',
        description:
          'Angaben gemäß § 5 DDG: Diensteanbieter, Anschrift, Kontakt und Verantwortlichkeit für die Inhalte von klucode.de.',
      },
      privacy: {
        title: 'Datenschutzerklärung · KluCode',
        description: 'Welche Daten diese Website verarbeitet. Und welche nicht.',
      },
    },
  },

  nav: {
    home: 'Start',
    services: 'Leistungen',
    work: 'Projekte',
    approach: 'Ansatz',
    about: 'Über mich',
    contact: 'Kontakt',
    imprint: 'Impressum',
    privacy: 'Datenschutz',
  },

  ui: {
    ctaPrimary: 'Projekt besprechen',
    ctaSecondary: 'Projekte ansehen',
    availablePrefix: 'Freie Kapazität ab',
    draft: 'VORSCHLAG · NOCH NICHT BUCHBAR',
    shotPending: 'Screenshot folgt, sobald der Auftraggeber ihn freigegeben hat.',
    skipToContent: 'Zum Inhalt springen',
    menu: 'Menü',
    close: 'Schließen',
    switchLang: 'EN',
    switchLangLabel: 'Switch to English',
    themeToDark: 'Dunkles Design',
    themeToLight: 'Helles Design',
    footerNavLabel: 'Seiten',
    footerLegalLabel: 'Rechtliches',
    footerSocialLabel: 'Profile',
    backHome: 'Zur Startseite',
    stack: 'Technik',
    before: 'Vorher',
    after: 'Nachher',
    result: 'Ergebnis',
    includes: 'Enthalten',
    from: 'ab',
  },

  home: {
    heroEyebrow: 'Softwareentwicklung · Düsseldorf',
    // NBSP: „mit" must not separate from „der"; at display size the balanced
    // wrap otherwise breaks after „mit" and strands the pronoun.
    heroTitle: 'Software, mit der Ihr Betrieb',
    heroTitleAccent: 'tatsächlich arbeitet.',
    heroLead:
      'Web-Anwendungen, interne Tools und Websites, vom ersten Klick bis zum laufenden Server. Ein Ansprechpartner, ein Festpreis. Und der Mensch im Termin ist derselbe, der den Code schreibt.',
    heroProof: [
      'Drei Systeme im Produktivbetrieb',
      'Informatik B.Sc. · 4 Jahre Berufserfahrung',
      'Festpreis vor Projektstart',
    ],

    problemEyebrow: 'Die Ausgangslage',
    problemTitle: 'Zwei Angebote, und beide passen nicht.',
    problemLead:
      'Die meisten Betriebe, mit denen ich spreche, haben das Thema schon zweimal angefasst und wieder liegen gelassen. Aus guten Gründen.',
    problemCards: [
      {
        title: 'Die Agentur',
        body: 'Vier Monate, fünfstellig, drei Ansprechpartner. Bezahlt wird auch der Weg von dem, der Ihr Problem verstanden hat, zu dem, der es umsetzt. Auf diesem Weg geht das meiste verloren.',
      },
      {
        title: 'Der Baukasten',
        body: 'Sieht nach zwei Tagen fertig aus und hört genau da auf, wo Ihr Geschäft anfängt: bei der Provisionslogik, beim Schichtbetrieb, bei der einen Auswertung, die Sie wirklich brauchen.',
      },
      {
        title: 'Also weiter wie bisher',
        body: 'Excel, WhatsApp und ein Ordner, den nur eine Person versteht. Funktioniert. Bis diese Person Urlaub hat oder die Datei in drei Versionen existiert.',
      },
    ],
    answerTitle: 'Die dritte Möglichkeit',
    answerBody:
      'Eine Person, die mit Ihnen spricht, Ihren Ablauf versteht und danach das ganze System baut: Oberfläche, Logik, Datenbank, Server. Der Preis steht fest, bevor die erste Zeile geschrieben ist.',

    servicesEyebrow: 'Leistungen',
    servicesTitle: 'Vier Wege zur Zusammenarbeit.',
    servicesLink: 'Alle Leistungen und Preise',
    sceneAlt:
      'Die vier Wege als Raum: eine Website auf einem Monitor, eine Web-Anwendung mit Datenbank und Server dahinter, ein Büro mit einem freien Platz, ein Server-Rack an einer Wolke.',

    workEyebrow: 'Projekte',
    workTitle: 'Drei Systeme, die täglich laufen.',
    workLead:
      'Keine Konzeptstudien, keine Templates. Drei Projekte, die ausgeliefert sind und benutzt werden.',
    workLink: 'Projekte im Detail',

    approachEyebrow: 'Ansatz',
    approachTitle: 'Warum das in Wochen geht und nicht in Quartalen.',
    approachLead:
      'Kein Angebot läuft durch drei Abteilungen, kein Briefing wird zweimal übersetzt. Und ich arbeite KI-gestützt. Was das konkret heißt, steht offen auf einer eigenen Seite.',
    approachLink: 'So arbeite ich',

    faqEyebrow: 'Häufige Fragen',
    faqTitle: 'Was Betriebe vorher wissen wollen.',
    faq: [
      {
        q: 'Was kostet das?',
        a: 'Eine Website beginnt bei 2.500\u00A0€, eine individuelle Web-Anwendung bei 9.000\u00A0€. Den genauen Festpreis nenne ich Ihnen nach einem 30-Minuten-Gespräch und einer schriftlichen Leistungsbeschreibung. Nicht vorher, weil eine Zahl ohne Umfang wertlos ist.',
        link: { label: 'Alle vier Leistungen mit Preis', to: 'services' },
      },
      {
        q: 'Wie lange dauert es?',
        a: 'Eine Landingpage zwei bis drei Wochen. Eine Web-Anwendung vier bis zehn Wochen, je nach Umfang. Die erste lauffähige Version sehen Sie deutlich früher, meist nach zwei Wochen.',
      },
      {
        q: 'Was passiert, wenn Sie ausfallen?',
        a: 'Die berechtigte Frage bei einer Person. Deshalb: Der Code liegt in einem Repository, auf das Sie Zugriff haben, die Dokumentation liegt daneben, und es kommt keine Technik zum Einsatz, die nur ich bedienen kann. Jede andere Entwicklerin und jeder andere Entwickler kann übernehmen. Das ist kein Notfallplan, das ist Grundausstattung.',
        link: { label: 'Wie ich arbeite', to: 'approach' },
      },
      {
        q: 'Gehört mir der Code?',
        a: 'Ja. Vollständig, mit allen Zugängen, nach der Schlussrechnung. Kein Abo, in dem Sie festhängen, keine Lizenz, die ich Ihnen entziehen kann.',
      },
      {
        q: 'Machen Sie auch die Wartung?',
        a: 'Ja, ab 90\u00A0€ im Monat: Updates, Sicherheits-Patches, Backups, kleine Änderungen. Sie müssen es nicht buchen. Aber Software, die niemand pflegt, wird nach zwei Jahren zum Problem.',
      },
      {
        q: 'Arbeiten Sie auch außerhalb von Düsseldorf?',
        a: 'Ja. Im Rheinland komme ich gern persönlich vorbei, alles Weitere geht remote. Bei drei ausgelieferten Projekten war die Entfernung nie das Thema.',
        link: { label: 'Die drei Projekte', to: 'work' },
      },
    ],

    finalTitle: 'Erzählen Sie mir, was gerade nicht läuft.',
    finalLead: `30 Minuten, unverbindlich, ohne Präsentation. Wenn ich nicht der Richtige bin, sage ich Ihnen das. Und nach Möglichkeit, wer es ist. Antwort werktags innerhalb von ${profile.responseTime.de}.`,
  },

  services: {
    eyebrow: 'Leistungen',
    title: 'Vier Leistungen. Mehr braucht es nicht.',
    lead: 'Preise sind Startpreise für den beschriebenen Umfang. Den verbindlichen Festpreis bekommen Sie schriftlich, bevor ich anfange.',
    items: [
      {
        key: 'website',
        name: 'Website & Landingpage',
        forWhom: 'Für Betriebe, die online gefunden werden und Anfragen bekommen wollen.',
        reads: 'Ein Ding. Eine Seite, die lädt und Anfragen bringt.',
        body: 'Eine Seite, die lädt, auf dem Handy funktioniert und bei Google auffindbar ist. Handgebaut, ohne Baukasten-Ballast: deshalb schnell, und deshalb später erweiterbar.',
        includes: [
          'Aufbau, Text-Struktur und Gestaltung',
          'Responsiv von 320 px bis Desktop',
          'Technisches SEO, Ladezeit unter einer Sekunde',
          'Auf Wunsch mit Besucher-Statistik, datenschutzfreundlich umgesetzt',
          'Einweisung, damit Sie Inhalte selbst pflegen können',
        ],
        price: '2.500\u00A0€',
        priceNote: '2 bis 3 Wochen · Festpreis',
        example: { label: 'Beispiel: Landingpage für ein Reinigungsunternehmen', project: 'landing' }, // prettier-ignore
      },
      {
        key: 'app',
        name: 'Individuelle Web-Anwendung',
        forWhom: 'Für Abläufe, die heute in Excel, auf Papier oder in WhatsApp hängen.',
        reads: 'Kein Bildschirm, ein System. Oberfläche, Datenbank, Server.',
        body: 'CRM, Kassensystem, Auswertung, internes Werkzeug, Portal. Gebaut für Ihren Ablauf statt umgekehrt, inklusive Datenbank, Benutzerverwaltung und Server. Das ist die Arbeit, die ich am liebsten mache.',
        includes: [
          'Analyse des Ist-Ablaufs, gemeinsam mit den Menschen, die ihn ausführen',
          'Frontend, Backend, Datenbank und Deployment',
          'Rollen und Rechte, Protokollierung',
          'Datenübernahme aus dem, was Sie heute nutzen',
          'Erste lauffähige Version nach etwa zwei Wochen',
          'Dokumentation und Übergabe an Ihr Team',
        ],
        price: '9.000\u00A0€',
        priceNote: '4 bis 10 Wochen · Festpreis',
        example: { label: 'Beispiel: CRM und Provisionsverwaltung', project: 'crm' },
      },
      {
        key: 'capacity',
        name: 'Entwickler-Kapazität',
        forWhom: 'Für Agenturen und Produktteams, die Frontend-Kapazität brauchen.',
        reads: 'Ein freier Platz in einem Team, das schon arbeitet.',
        body: 'React, Next.js, TypeScript, Node.js. Ich arbeite mich in bestehenden Code ein, halte mich an Ihre Konventionen und kann in einen Kundentermin, ohne dass es Ihnen unangenehm wird.',
        includes: [
          'React · Next.js · TypeScript · Node.js · PostgreSQL',
          'Einarbeitung in bestehende Codebasen',
          'Code-Reviews und Pull Requests nach Ihren Regeln',
          'Remote, im Rheinland auch vor Ort',
          'Ab fünf Tagen buchbar',
        ],
        price: '680\u00A0€',
        priceNote: 'pro Tag · Rahmenvertrag möglich',
        priceUnit: 'day',
      },
      {
        key: 'care',
        name: 'Betrieb & Wartung',
        forWhom: 'Für alle, die etwas laufen haben. Von mir oder von jemand anderem.',
        reads: 'Der Server bleibt online, und jemand schaut hin.',
        body: 'Software, die niemand pflegt, wird nach zwei Jahren zum Sicherheitsproblem. Der günstigste Weg, das zu vermeiden, ist ein kleiner monatlicher Betrag statt einer großen Rechnung im Notfall.',
        includes: [
          'Updates und Sicherheits-Patches',
          'Überwachung der Erreichbarkeit',
          'Backups, regelmäßig geprüft',
          'Kleine Änderungen im vereinbarten Umfang',
          'Fester Ansprechpartner, Reaktion innerhalb von 24 Stunden',
        ],
        price: '90\u00A0€',
        priceNote: 'pro Monat · monatlich kündbar',
        priceUnit: 'month',
      },
    ],
    howEyebrow: 'Abrechnung',
    howTitle: 'Festpreis, nicht Stunden.',
    howBody:
      'Sie kaufen ein Ergebnis, keine Arbeitszeit. Der Preis steht vor dem Start und ändert sich nur, wenn Sie den Umfang ändern. Dann bekommen Sie eine neue Zahl und einen neuen Termin, schriftlich, bevor ich weiterarbeite. Zahlung in drei Schritten: 40 % bei Auftrag, 30 % bei der ersten nutzbaren Version, 30 % bei Übergabe.',
    notTitle: 'Was ich nicht mache',
    notBody:
      'Der schnellste Weg, glaubwürdig zu sein, ist zu sagen, wo ich nicht der Richtige bin:',
    notItems: [
      'Native Apps für iOS und Android',
      'SEO- oder Social-Media-Betreuung als Dauerleistung',
      'Shopsysteme von der Stange: dafür gibt es Bessere und Günstigere',
      'Teams stellen oder Projekte über zwölf Monate leiten',
    ],
    faqTitle: 'Noch Fragen zum Preis?',
    faqBody:
      'Was in einem Festpreis steckt, was passiert wenn sich der Umfang ändert, und was der Betrieb monatlich wirklich kostet: sechs Antworten auf der Startseite.',
    faqLink: 'Häufige Fragen',
    triage:
      'Unsicher, welcher der vier Wege passt? Beschreiben Sie Ihren Ablauf in zwei Sätzen. Die Einordnung ist Teil des Gesprächs und kostet nichts.',
    middle: {
      after: 'website',
      name: 'Website mit System',
      forWhom: 'Für Betriebe, die eine Seite brauchen und den ersten Ablauf gleich mit.',
      body: 'Die Seite aus dem ersten Angebot, und daran der eine Vorgang, der heute die meiste Zeit kostet. Ein Formular, das in einer Datenbank landet statt in einem Postfach, und eine Auswertung, die zeigt, was daraus geworden ist. Der Schritt zwischen Website und eigener Anwendung, für alle, die den großen Sprung noch nicht machen wollen.',
      includes: [
        'Alles aus Website & Landingpage',
        'Ein Ablauf, gemeinsam aufgenommen und abgebildet',
        'Formular mit Datenbank statt E-Mail-Postfach',
        'Eine Auswertung, die Sie selbst öffnen können',
        'Zugänge für Sie und eine zweite Person',
      ],
      price: '4.500\u00A0€',
      priceNote: '3 bis 5 Wochen · Festpreis',
    },
  },

  work: {
    eyebrow: 'Projekte',
    title: 'Drei Systeme im Produktivbetrieb.',
    lead: 'Alle drei sind ausgeliefert, bezahlt und in täglicher Nutzung. Kundennamen nenne ich nur mit schriftlicher Freigabe. Die Zahlen sind wichtiger als die Logos.',
    projects: [
      {
        key: 'crm',
        title: 'CRM, Provisionsverwaltung und Vergleichsportal',
        sector: 'Vertriebsorganisation',
        scope: 'Full-Stack · drei Systeme, eine Datenbank',
        summary:
          'Drei Systeme, die vorher drei Excel-Dateien waren: Kundenverwaltung, Provisionsabrechnung und ein öffentliches Vergleichsportal, die dieselben Daten teilen.',
        before:
          'Kundendaten in einer Tabelle, Provisionen in einer zweiten, das Portal gepflegt von Hand. Die Abrechnung kostete jeden Monat mehrere Tage, und jeder Übertragungsfehler kostete Geld oder Vertrauen.',
        after:
          'Ein System mit einer Datenbank. Die Provision wird aus den Daten berechnet, die ohnehin erfasst werden. Das Vergleichsportal zieht seinen Bestand aus derselben Quelle und ist damit immer aktuell.',
        result:
          'Die monatliche Abrechnung läuft automatisch. Keine Datei wandert mehr per E-Mail, und es gibt keine zweite Version, von der niemand weiß, ob sie die richtige ist.',
        stack: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Plesk'],
        offer: { label: 'Passendes Angebot: Individuelle Web-Anwendung', service: 'app' },
        shotPending: true,
      },
      {
        key: 'pos',
        title: 'Kassensystem für eine Shisha-Bar',
        sector: 'Gastronomie',
        scope: 'Frontend & Datenmodell · Tablet-Kasse',
        summary:
          'Ein Kassensystem, das zum Betrieb passt. Nicht ein Betrieb, der sich an ein Kassensystem anpassen muss.',
        before:
          'Standardlösungen aus dem Handel bilden den Ablauf einer Shisha-Bar nicht ab: offene Rechnungen am Tisch, Wechsel während der Schicht, Abrechnung am Ende des Abends.',
        after:
          'Eine Oberfläche, die auf einem Tablet im Halbdunkel bedienbar ist: große Ziele, wenige Schritte pro Buchung, und eine Datenstruktur, in der jede Buchung nachvollziehbar bleibt.',
        result:
          'Bedienbar ohne Schulung. Die Abrechnung am Ende des Abends ist ein Vorgang statt einer Rekonstruktion.',
        stack: ['JavaScript', 'Datenbankmodellierung', 'Touch-UI'],
        offer: { label: 'Passendes Angebot: Individuelle Web-Anwendung', service: 'app' },
      },
      {
        key: 'landing',
        title: 'Landingpage und LinkedIn-Kampagne',
        sector: 'Reinigungsunternehmen',
        scope: 'Frontend & Kampagne · ohne Framework',
        summary:
          'Kein Baukasten, kein Framework-Ballast: eine Seite, die lädt. Und dazu die Kampagne, die Menschen darauf bringt.',
        before:
          'Kein eigener Auftritt im Netz. Neue Aufträge kamen ausschließlich über Empfehlungen, und damit war das Wachstum gedeckelt.',
        after:
          'Eine handgebaute Seite in reinem JavaScript, ohne Framework-Overhead, dazu eine LinkedIn-Kampagne mit KI-erzeugten Videos und Bildern. Zu Kosten, die für einen Betrieb dieser Größe sonst nicht darstellbar gewesen wären.',
        result:
          'Sichtbarkeit über den Empfehlungskreis hinaus. Aus einem reinen Web-Auftrag wurde ein vollständiges Paket zur Kundengewinnung.',
        stack: ['Vanilla JavaScript', 'HTML', 'CSS', 'KI-Bild und -Video'],
        offer: { label: 'Passendes Angebot: Website & Landingpage', service: 'website' },
        shotPending: true,
      },
    ],
    noteTitle: 'Zu Zahlen und Namen',
    noteBody:
      'Belastbare Kennzahlen und Kundenstimmen ergänze ich hier, sobald die jeweiligen Auftraggeber sie schriftlich freigegeben haben. Bis dahin beschreibe ich die Projekte lieber genau als beeindruckend.',
  },

  approach: {
    eyebrow: 'Ansatz',
    title: 'Vier Schritte. Ein Preis. Ein Ansprechpartner.',
    lead: 'Kein Prozessdiagramm mit neun Phasen. So läuft ein Projekt tatsächlich ab.',
    steps: [
      {
        title: 'Gespräch',
        body: '30 Minuten. Sie erzählen, was heute wie läuft und was daran stört. Ich stelle Rückfragen und sage Ihnen am Ende ehrlich, ob ich der Richtige bin. Kostenlos, und ohne dass Sie danach etwas an der Backe haben.',
      },
      {
        title: 'Leistungsbeschreibung und Festpreis',
        body: 'Eine Seite: was gebaut wird, was ausdrücklich nicht, bis wann, zu welchem Preis. Sie unterschreiben eine Zahl, keine Schätzung. Diese Seite ist später auch der Maßstab, an dem sich das Ergebnis messen lässt.',
      },
      {
        title: 'Bauen, mit Zwischenständen',
        body: 'Nach etwa zwei Wochen sehen Sie die erste lauffähige Version: nicht ein Bild davon, sondern etwas, das Sie anklicken können. Danach im festen Rhythmus weiter. Sie sind immer im Bilde, ohne dafür Termine wahrnehmen zu müssen.',
      },
      {
        title: 'Übergabe',
        body: 'Live-Schaltung, Einweisung, Dokumentation, alle Zugänge. Der Code gehört Ihnen. Danach entweder Wartungsvertrag oder Funkstille. Beides ist in Ordnung, und beides habe ich schon gehabt.',
      },
    ],

    aiEyebrow: 'Offengelegt',
    aiTitle: 'Wie ich so schnell arbeite.',
    aiBody: [
      'Ich entwickle KI-gestützt. Alle drei Projekte auf dieser Seite sind so entstanden. Ich schreibe das offen hin, weil es die ehrliche Antwort auf die Frage ist, wie eine Person die Arbeitsmenge einer kleinen Agentur schafft.',
      'Der Nutzen für Sie liegt nicht in der Technik, sondern in zwei Zahlen: dem Preis und dem Termin. Was eine Agentur in vier Monaten und fünfstellig anbietet, liefere ich in Wochen. Nicht, weil ich schneller tippe, sondern weil das Tippen nicht mehr der Engpass ist.',
      'Was sich dadurch ausdrücklich nicht ändert: die Verantwortung. Ich prüfe, teste und verantworte jede Zeile, die auf Ihrem Server landet.',
    ],
    objection: {
      q: 'Schreibt das nicht einfach eine KI?',
      a: 'Nein. Eine KI tippt schneller, als ich tippen kann. Was sie nicht kann: entscheiden, was gebaut werden soll, wo die Grenzen Ihres Geschäfts liegen und welche Fehler Sie am Monatsende Geld kosten. Das ist meine Arbeit. Ich prüfe, teste und verantworte jede Zeile, die ausgeliefert wird, mit einem abgeschlossenen Informatikstudium und vier Jahren Berufserfahrung im Rücken. Der Unterschied für Sie ist nicht die Qualität. Es ist der Preis und der Termin.',
    },

    principlesTitle: 'Woran ich mich halte',
    principles: [
      {
        title: 'Keine Technik, die nur ich bedienen kann',
        body: 'Bewährte, verbreitete Werkzeuge statt exotischer Entscheidungen. Damit jede andere Entwicklerin und jeder andere Entwickler übernehmen könnte, auch wenn es nie nötig sein sollte.',
      },
      {
        title: 'Der Code gehört Ihnen',
        body: 'Repository, Zugänge, Dokumentation, nach der Schlussrechnung. Es gibt keine Abhängigkeit von mir, die ich künstlich aufrechterhalte.',
      },
      {
        title: 'Schlechte Nachrichten kommen sofort',
        body: 'Wenn ein Termin wackelt, erfahren Sie es an dem Tag, an dem ich es weiß. Nicht in der Woche, in der geliefert werden sollte.',
      },
      {
        title: 'Barrierefrei, weil es zur Arbeit gehört',
        body: 'Kontraste, Tastaturbedienung, Bildschirmleser. Diese Seite selbst ist der Beleg dafür: keine Cookies, keine fremden Server, WCAG-konforme Farbwerte.',
      },
    ],
  },

  about: {
    eyebrow: 'Über mich',
    title: 'Eine Person, kein Wir.',
    lead: 'Auf dieser Seite steht durchgehend „ich“, weil KluCode aus einer Person besteht. Das ist keine Bescheidenheit, sondern der Punkt: Sie sprechen mit dem, der es baut.',
    paragraphs: [
      'Ich bin 33, Informatiker (B.Sc.) und lebe in Düsseldorf. Vier Jahre habe ich als Frontend-Entwickler angestellt gearbeitet und in dieser Zeit gelernt, was mir an dem Beruf am meisten liegt: nicht das Umsetzen fertiger Vorgaben, sondern das Gespräch davor. Herauszufinden, was jemand wirklich braucht, und dann das Passende zu bauen.',
      'Parallel dazu habe ich drei Projekte für eigene Kunden umgesetzt: ein CRM mit Provisionsverwaltung und angeschlossenem Vergleichsportal, ein Kassensystem für eine Shisha-Bar und eine Landingpage samt LinkedIn-Kampagne für ein Reinigungsunternehmen. Alle drei laufen. Alle drei wurden bezahlt. Genau diese Arbeit möchte ich hauptberuflich machen.',
      'Was mir dabei wichtig ist: Ich baue keine Software, die beeindruckt. Ich baue Software, die jemand am Montagmorgen benutzt, ohne darüber nachzudenken, und die nach zwei Jahren noch jemand anderes weiterentwickeln kann.',
    ],
    nameNote:
      'Das „Klu“ in KluCode kommt von Klusmann. Und von „klug“, weil das der Teil der Arbeit ist, der zählt: Die Entscheidung, was gebaut wird, fällt vor der ersten Zeile Code.',
    factsTitle: 'Kurz und sachlich',
    facts: [
      { label: 'Standort', value: 'Düsseldorf, Nordrhein-Westfalen' },
      { label: 'Ausbildung', value: 'B.Sc. Informatik' },
      { label: 'Erfahrung', value: '4 Jahre Frontend-Entwicklung' },
      { label: 'Schwerpunkt', value: 'React · Next.js · TypeScript · Node.js · PostgreSQL' },
      { label: 'Ausgeliefert', value: '3 Systeme im Produktivbetrieb' },
      { label: 'Sprachen', value: 'Deutsch (Muttersprache), Englisch' },
    ],
    portraitAlt: `${profile.firstName} ${profile.lastName}, freiberuflicher Softwareentwickler in Düsseldorf`,
  },

  contact: {
    eyebrow: 'Kontakt',
    title: 'Erzählen Sie mir, was gerade nicht läuft.',
    lead: `30 Minuten, unverbindlich, ohne Präsentation. Ich melde mich werktags innerhalb von ${profile.responseTime.de}.`,
    triage:
      'Sie müssen vorher nicht wissen, welche Leistung die richtige ist. Beschreiben Sie, was gerade nicht läuft, die Einordnung übernehme ich.',
    directTitle: 'Direkt',
    directBody: 'Eine E-Mail geht schneller als jedes Formular.',
    formTitle: 'Oder hier',
    fields: {
      name: 'Name',
      email: 'E-Mail',
      company: 'Unternehmen (optional)',
      message: 'Worum geht es?',
      messagePlaceholder:
        'Was läuft heute wie, und was soll sich ändern? Zwei, drei Sätze reichen völlig.',
    },
    consent:
      'Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden. Sie werden nicht weitergegeben. Widerruf jederzeit per E-Mail.',
    submit: 'Nachricht senden',
    submitting: 'Wird gesendet …',
    sent: `Angekommen. Ich melde mich werktags innerhalb von ${profile.responseTime.de}.`,
    handoffTitle: 'Ihr E-Mail-Programm sollte sich jetzt geöffnet haben.',
    handoffBody:
      'Die Nachricht ist fertig vorbereitet. Abgeschickt ist sie erst, wenn Sie in Ihrem E-Mail-Programm auf Senden drücken. Falls sich nichts geöffnet hat, schreiben Sie mir bitte direkt an:',
    failed: 'Das hat nicht geklappt. Schreiben Sie mir bitte direkt.',
    errorRequired: 'Bitte ausfüllen.',
    errorEmail: 'Diese Adresse stimmt so nicht.',
    mailtoNote:
      'Diese Seite läuft ohne Server und ohne Tracking. Das Formular überträgt deshalb nichts selbst, sondern öffnet Ihr E-Mail-Programm mit der fertigen Nachricht: Sie sehen genau, was gesendet wird, und Sie drücken auf Senden. Wenn Ihr Gerät kein E-Mail-Programm eingerichtet hat, nehmen Sie bitte die Adresse links.',
    postNote:
      'Diese Seite läuft ohne Tracking und ohne fremde Dienste. Das Formular sendet Ihre Nachricht an meinen eigenen Server, der sie als E-Mail an mich weiterleitet. Kein Formulardienst, keine Dritten. Was dabei gespeichert wird, steht in der Datenschutzerklärung.',
    expectTitle: 'Was danach passiert',
    expect: [
      'Antwort werktags innerhalb von 24 Stunden.',
      'Ein Gespräch von 30 Minuten, telefonisch oder per Video.',
      'Danach eine Leistungsbeschreibung mit Festpreis. Oder eine ehrliche Absage.',
    ],
  },

  imprint: {
    title: 'Impressum',
    lead: 'Angaben gemäß § 5 DDG.',
    sections: [
      {
        heading: 'Diensteanbieter',
        paragraphs: [
          'KluCode - individuelle Softwarelösungen',
          `Inhaber ${profile.firstName} ${profile.lastName}`,
          profile.role.de,
          `${profile.street}`,
          `${profile.postalCode} ${profile.city}`,
          profile.country.de,
        ],
      },
      {
        heading: 'Kontakt',
        // The phone line is dropped rather than printed empty when there is no
        // number. An Impressum that says „Telefon:" and stops is worse than one
        // that does not raise the subject. See profile.phone for what carrying
        // email alone costs under § 5 DDG.
        paragraphs: [
          ...(filled(profile.phone) ? [`Telefon: ${profile.phone}`] : []),
          `E-Mail: ${profile.email}`,
        ],
      },
      // Either a USt-IdNr. under § 27 a UStG, or the Kleinunternehmer statement
      // under § 19 UStG. Printing the § 27 a heading with nothing under it is
      // worse than saying plainly that there is no VAT ID.
      profile.vatId
        ? {
            heading: 'Umsatzsteuer-Identifikationsnummer',
            paragraphs: [
              'Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:',
              profile.vatId,
            ],
          }
        : {
            heading: 'Umsatzsteuer',
            paragraphs: [
              'Als Kleinunternehmer im Sinne des § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet und keine Umsatzsteuer-Identifikationsnummer geführt.',
            ],
          },
      // § 2 Nr. 11 DL-InfoV: only where a policy actually exists.
      ...(profile.insurance
        ? [
            {
              heading: 'Berufshaftpflichtversicherung',
              paragraphs: [
                profile.insurance.name,
                profile.insurance.address,
                `Räumlicher Geltungsbereich: ${profile.insurance.scope.de}`,
              ],
            },
          ]
        : []),
      {
        heading: 'Berufsbezeichnung',
        paragraphs: [
          'Freiberufliche Tätigkeit im Sinne des § 18 Abs. 1 Nr. 1 EStG (ingenieurähnlicher Beruf). Verliehen in der Bundesrepublik Deutschland.',
        ],
      },
      {
        heading: 'Verantwortlich für den Inhalt',
        paragraphs: [`${profile.firstName} ${profile.lastName}, Anschrift wie oben.`],
      },
      // Kein Hinweis auf die OS-Plattform der EU-Kommission: sie wurde zum
      // 20.07.2025 abgeschaltet. Ein Link darauf informiert Verbraucher seither
      // falsch und ist damit selbst abmahnfähig; die Angabe zu entfernen ist
      // Pflicht, nicht Kosmetik.
      {
        heading: 'Streitbeilegung',
        paragraphs: [
          'Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        ],
      },
      {
        heading: 'Haftung für Inhalte',
        paragraphs: [
          'Als Diensteanbieter bin ich gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.',
          'Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werde ich diese Inhalte umgehend entfernen.',
        ],
      },
      {
        heading: 'Haftung für Links',
        paragraphs: [
          'Dieses Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Deshalb kann ich für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.',
          'Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werde ich derartige Links umgehend entfernen.',
        ],
      },
      {
        heading: 'Urheberrecht',
        paragraphs: [
          'Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.',
        ],
      },
    ],
    todoWarningTitle: 'Dieses Impressum ist noch unvollständig',
    todoWarningBody:
      'Die folgenden Pflichtangaben fehlen und müssen vor dem Livegang in src/content/profile.ts eingetragen werden. Eine Website mit unvollständigem Impressum ist in Deutschland abmahnfähig:',
  },

  privacy: {
    title: 'Datenschutzerklärung',
    lead: 'Kurz gesagt: Diese Website setzt keine Cookies, bindet keine fremden Dienste ein und wertet Ihr Verhalten nicht aus. Was trotzdem an Daten anfällt, steht hier.',
    updated: `Stand: ${policyDate('de')}`,
    sections: [
      {
        heading: '1. Verantwortlicher',
        paragraphs: [
          'Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:',
          `${profile.firstName} ${profile.lastName}, ${profile.street}, ${profile.postalCode} ${profile.city}, ${profile.country.de}`,
          filled(profile.phone)
            ? `E-Mail: ${profile.email} · Telefon: ${profile.phone}`
            : `E-Mail: ${profile.email}`,
        ],
      },
      {
        heading: '2. Was diese Website nicht tut',
        paragraphs: [
          'Diese Website setzt keine Cookies und verwendet keine vergleichbaren Techniken wie Local Storage zur Wiedererkennung. Aus diesem Grund gibt es hier auch kein Einwilligungsbanner.',
          'Eine einzige Einstellung wird lokal in Ihrem Browser gespeichert, und nur dann, wenn Sie sie selbst treffen: Ihre Wahl zwischen hellem und dunklem Design (Local Storage, Schlüssel „kc-theme“). Sie enthält keine personenbezogenen Daten, verlässt Ihr Gerät nicht und dient nicht der Wiedererkennung. Die Speicherung ist unbedingt erforderlich, um die von Ihnen ausdrücklich gewünschte Darstellung bereitzustellen (§ 25 Abs. 2 Nr. 2 TDDDG).',
          'Es findet keine Reichweitenmessung und keine Analyse Ihres Nutzungsverhaltens statt. Es sind keine Dienste Dritter eingebunden: keine Analysewerkzeuge, keine Kartendienste, keine sozialen Netzwerke, keine externen Videos.',
          'Insbesondere werden keine Schriftarten von fremden Servern nachgeladen. Alle verwendeten Schriften werden vom Server dieser Website ausgeliefert. Ihre IP-Adresse wird dadurch an keinen Dritten übermittelt.',
        ],
      },
      {
        heading: '3. Server-Logfiles',
        paragraphs: [
          'Beim Aufruf dieser Website werden durch den Hosting-Anbieter automatisch Informationen erfasst, die Ihr Browser übermittelt. Dies sind in der Regel: aufgerufene Seite, Datum und Uhrzeit des Zugriffs, übertragene Datenmenge, Meldung über erfolgreichen Abruf, Browsertyp und -version, Betriebssystem, Referrer-URL und die IP-Adresse.',
          'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt im technisch fehlerfreien Betrieb und in der Sicherheit der Website. Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und nicht zur Identifikation von Personen genutzt.',
          `Der Hosting-Anbieter verarbeitet diese Daten als Auftragsverarbeiter auf Grundlage eines Vertrags nach Art. 28 DSGVO: ${profile.host.name}, ${profile.host.address}.`,
        ],
      },
      {
        heading: '4. Kontaktaufnahme',
        paragraphs: [
          'Wenn Sie mir per E-Mail oder über das Kontaktformular schreiben, verarbeite ich Ihre Angaben ausschließlich zur Bearbeitung Ihrer Anfrage und für den Fall von Anschlussfragen.',
          'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die Anfrage auf einen Vertrag abzielt, im Übrigen Art. 6 Abs. 1 lit. f DSGVO beziehungsweise Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO.',
          'Ihre Daten gebe ich nicht ohne Ihre Einwilligung weiter. Sie werden gelöscht, sobald Ihre Anfrage abschließend bearbeitet ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Handelsrechtliche und steuerrechtliche Aufbewahrungsfristen bleiben unberührt.',
        ],
      },
      {
        heading: '5. Kontaktformular',
        paragraphs: [
          'Das Formular auf der Kontaktseite überträgt Ihre Angaben an den Server dieser Website. Übermittelt werden Ihr Name, Ihre E-Mail-Adresse, auf Wunsch Ihr Unternehmen und Ihre Nachricht. Der Server leitet sie ausschließlich als E-Mail an mich weiter und speichert sie nicht dauerhaft.',
          'Ein externer Formulardienst wird nicht eingesetzt. Die Verarbeitung findet auf dem Server statt, den ich selbst betreibe. Ihre Angaben werden nicht an Dritte weitergegeben.',
          'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage auf einen Vertrag abzielt, im Übrigen Art. 6 Abs. 1 lit. f DSGVO beziehungsweise Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO. Ihre Angaben werden gelöscht, sobald Ihre Anfrage abschließend bearbeitet ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.',
          'Zum Schutz vor automatisierten Zusendungen enthält das Formular ein verstecktes Feld, das Sie nicht sehen und nicht ausfüllen können, und die Zahl der Zusendungen je IP-Adresse ist begrenzt. Dafür wird Ihre IP-Adresse als SHA-256-Prüfsumme für höchstens eine Stunde gespeichert und danach automatisch verworfen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, mein berechtigtes Interesse am Schutz vor Missbrauch.',
        ],
      },
      {
        heading: '6. Verschlüsselung',
        paragraphs: [
          'Diese Website nutzt aus Sicherheitsgründen eine TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie an „https://“ in der Adresszeile Ihres Browsers.',
        ],
      },
      {
        heading: '7. Ihre Rechte',
        paragraphs: [
          'Sie haben jederzeit das Recht auf Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO), auf Berichtigung (Art. 16 DSGVO), auf Löschung (Art. 17 DSGVO), auf Einschränkung der Verarbeitung (Art. 18 DSGVO), auf Datenübertragbarkeit (Art. 20 DSGVO) sowie ein Widerspruchsrecht (Art. 21 DSGVO).',
          'Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Eine formlose Mitteilung per E-Mail genügt.',
          'Unabhängig davon steht Ihnen ein Beschwerderecht bei einer Aufsichtsbehörde zu. Zuständig ist in Nordrhein-Westfalen die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen, Kavalleriestraße 2–4, 40213 Düsseldorf.',
        ],
      },
      {
        heading: '8. Änderungen dieser Erklärung',
        paragraphs: [
          'Ich passe diese Datenschutzerklärung an, sobald sich die Website oder die Rechtslage ändert. Es gilt jeweils die hier veröffentlichte Fassung.',
        ],
      },
    ],
  },

  footer: {
    tagline: 'Klug gebaut.',
    builtNote:
      'Diese Seite: statisch ausgeliefert, keine Cookies, keine fremden Server, Schriften lokal eingebunden.',
    rights: 'Alle Rechte vorbehalten.',
  },

  notFound: {
    title: 'Diese Seite gibt es nicht.',
    body: 'Vielleicht hilft die Startseite weiter.',
  },
} satisfies Content;

export default de;
