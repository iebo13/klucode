/**
 * The mock interfaces on ways 01 and 02.
 *
 * Elektro Vogt is a plausible client rather than a real one, and its name is a
 * proper noun in both languages. Everything around it is words, and words
 * localise.
 *
 * House copy rule applies here as everywhere: no em dash, no semicolon.
 *
 * Not imported by the site any more: the homepage shows five pre-rendered
 * Blender stills, and these strings are drawn once, offline, onto the screen
 * textures those stills bake in. `tools/blender/capture-textures.mjs` reads
 * this module (compiled with `tsc`) to draw them; `tools/blender/crossroads.py`
 * reads the PNGs it produces. Nothing here ships to a visitor's browser.
 */
import type { Lang } from '@/lib/routes';

import type { SceneLabels } from './types';

export const LABELS: Record<Lang, SceneLabels> = {
  de: {
    landing: {
      brand: 'Elektro Vogt',
      nav: ['Leistungen', 'Referenzen', 'Über uns'],
      cta: 'Anruf',
      eyebrow: 'MEISTERBETRIEB · DÜSSELDORF',
      headline: ['Strom, der sitzt.', 'Termin, der hält.'],
      lead: ['Elektroinstallation für Altbau und Gewerbe.', 'Seit 1998 im Rheinland.'],
      action: 'Termin anfragen',
      cards: [
        ['Altbau-Sanierung', 'Festpreis nach Termin'],
        ['E-Ladestationen', 'Förderung inklusive'],
        ['Notdienst', 'Innerhalb 24 Stunden'],
      ],
    },
    dashboard: {
      app: 'Vertrieb',
      nav: ['Übersicht', 'Kunden', 'Provisionen', 'Abrechnung', 'Portal', 'Auswertung'],
      navActive: 2,
      title: 'Provisionen · Mai 2026',
      action: 'Abrechnen',
      // Uppercase in the data, not in the draw call. The i18n test asserts
      // that every word drawn came from this object, and `label.toUpperCase()`
      // would draw a string that is not in it. `eyebrow` and `chartNote`
      // already work this way, so this is the file's existing habit.
      kpis: [
        ['UMSATZ', '48.230 €'],
        ['PROVISION', '7.912 €'],
        ['OFFEN', '3 Vorgänge'],
      ],
      chartNote: 'LETZTE 12 MONATE',
      rows: [
        ['Müller GmbH', '1.240 €'],
        ['Schmidt & Sohn', '3.980 €'],
        ['Bauer KG', '12.400 €'],
        ['Kremer', '2.150 €'],
      ],
    },
  },
  en: {
    landing: {
      brand: 'Elektro Vogt',
      nav: ['Services', 'Projects', 'About us'],
      cta: 'Call',
      eyebrow: 'MASTER ELECTRICIAN · DÜSSELDORF',
      headline: ['Wiring that holds.', 'Dates that hold.'],
      lead: ['Electrical work for period buildings and trade.', 'In the Rhineland since 1998.'],
      action: 'Request a date',
      cards: [
        ['Period rewiring', 'Fixed price after a visit'],
        ['EV charge points', 'Grant paperwork included'],
        ['Emergency call-out', 'Within 24 hours'],
      ],
    },
    dashboard: {
      app: 'Sales',
      nav: ['Overview', 'Clients', 'Commission', 'Billing', 'Portal', 'Reports'],
      navActive: 2,
      title: 'Commission · May 2026',
      action: 'Bill it',
      kpis: [
        ['REVENUE', '48,230 €'],
        ['COMMISSION', '7,912 €'],
        ['OPEN', '3 items'],
      ],
      chartNote: 'LAST 12 MONTHS',
      rows: [
        ['Müller GmbH', '1.240 €'],
        ['Schmidt & Sohn', '3.980 €'],
        ['Bauer KG', '12.400 €'],
        ['Kremer', '2.150 €'],
      ],
    },
  },
};
