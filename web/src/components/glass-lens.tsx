'use client';

import { useEffect } from 'react';

/**
 * Real edge refraction for .glass panels.
 *
 * WHY THIS EXISTS
 *
 * A painted stroke around a translucent box reads as a border, because it is
 * one. Glass has no border — it has an edge where the surface curves and the
 * view through it bends. The only way to get that in a browser is to actually
 * displace the backdrop, which means an SVG feDisplacementMap driven by a map
 * image, referenced from `backdrop-filter: url(#…)`.
 *
 * WHY IT NEEDS JAVASCRIPT
 *
 * feImage stretches its map to fill the filter region. A single hand-written
 * map therefore ramps across a percentage of each panel rather than across a
 * fixed number of pixels, so the optical edge would be 90px wide on a hero
 * card and 3px wide on a pill — and anisotropic on anything that is not
 * square. The map has to be built to the panel's real dimensions. Every
 * production implementation of this effect does the same thing.
 *
 * It is strictly an enhancement. Without JS, `--lg-filter` never gets set and
 * the rule falls back to `none`, leaving the clear pane and its sheen — which
 * is still glass, just without the bending. Nothing depends on this running.
 *
 * WHAT THE MAP ENCODES
 *
 * feDisplacementMap samples the backdrop at
 *     x + scale * (R - 0.5),  y + scale * (G - 0.5)
 * so R = G = 0.5 (#808080) means "no displacement". The map is therefore
 * neutral across the whole interior and ramps only inside `band` pixels of
 * each edge: R runs 0 → 0.5 across the left band and 0.5 → 1 across the
 * right, G likewise top to bottom. At the boundary the panel samples from
 * OUTSIDE itself and compresses that inward, which is what the rim of a
 * magnifying lens does to whatever is behind it.
 */

/** How far, in px, the rim bends the backdrop — the sample can move up to
 *  half this. Tuned down from 38: at that strength the edge reaches far enough
 *  out to drag the panel's own drop shadow inward, which paints a grey frame
 *  and undoes the entire point of the exercise. */
const SCALE = 18;

/** Softens the corners of the ramp where it meets the neutral interior. The
 *  gradient stops already make that transition continuous; this just takes the
 *  crease off it. */
const MAP_BLUR = 2.2;

const NS = 'http://www.w3.org/2000/svg';
const HOST_ID = 'kc-lens-defs';

/** Displacement map for one panel size, as a data URI.
 *
 *  Built by screening a red horizontal ramp and a green vertical ramp over
 *  black, so the two channels stay independent: R carries x, G carries y.
 *  The 0.5 plateaus in the middle of each gradient are the neutral interior. */
function mapUri(w: number, h: number, band: number): string {
  // Clamp so a small pill cannot ask for a band wider than half of itself,
  // which would leave no neutral interior and displace the whole panel.
  const bx = Math.min(band, w / 2 - 1) / w;
  const by = Math.min(band, h / 2 - 1) / h;
  const f = (n: number) => n.toFixed(4);

  const svg =
    `<svg xmlns="${NS}" width="${w}" height="${h}">` +
    `<defs>` +
    `<linearGradient id="x" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#000"/>` +
    `<stop offset="${f(bx)}" stop-color="#800000"/>` +
    `<stop offset="${f(1 - bx)}" stop-color="#800000"/>` +
    `<stop offset="1" stop-color="#f00"/>` +
    `</linearGradient>` +
    `<linearGradient id="y" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#000"/>` +
    `<stop offset="${f(by)}" stop-color="#008000"/>` +
    `<stop offset="${f(1 - by)}" stop-color="#008000"/>` +
    `<stop offset="1" stop-color="#0f0"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="${w}" height="${h}" fill="#000"/>` +
    `<rect width="${w}" height="${h}" fill="url(#x)" style="mix-blend-mode:screen"/>` +
    `<rect width="${w}" height="${h}" fill="url(#y)" style="mix-blend-mode:screen"/>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** One <filter> per distinct panel size.
 *
 *  Single displacement pass, deliberately. The obvious upgrade is chromatic
 *  dispersion — three passes at slightly different scales, each cut down to
 *  one channel with feColorMatrix and recombined — and it was built and
 *  measured. In Chromium the per-channel isolation greys the whole panel:
 *  identical result whether the three are recombined with feBlend screen or
 *  feComposite arithmetic, so it is the channel split itself, not the merge.
 *  Not worth a third of the frame budget and a visible colour cast to chase a
 *  fringe that is a pixel wide at this band width. */
function buildFilter(id: string, w: number, h: number, band: number): SVGFilterElement {
  const el = (name: string, attrs: Record<string, string>) => {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };

  const filter = el('filter', {
    id,
    // linearRGB is the SVG default and it mangles the neutral 0.5 grey, which
    // turns "no displacement" into a constant drift across the interior.
    'color-interpolation-filters': 'sRGB',
    // The filter region must not be clipped to the element box or the rim
    // loses the outside content it is supposed to be bending inward.
    x: '-20%',
    y: '-20%',
    width: '140%',
    height: '140%',
  }) as SVGFilterElement;

  filter.append(
    el('feImage', {
      href: mapUri(w, h, band),
      x: '0',
      y: '0',
      width: `${w}`,
      height: `${h}`,
      preserveAspectRatio: 'none',
      result: 'raw',
    }),
    el('feGaussianBlur', { in: 'raw', stdDeviation: `${MAP_BLUR}`, result: 'map' }),
  );

  filter.append(
    el('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'map',
      scale: `${SCALE}`,
      xChannelSelector: 'R',
      yChannelSelector: 'G',
    }),
  );

  return filter;
}

export function GlassLens() {
  useEffect(() => {
    // Bending the page behind a panel is decoration, and decoration that moves
    // under you is exactly what this preference exists to switch off.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Firefox parses backdrop-filter: url(…) and then declines to render it,
    // so there is no feature query that separates it from Chromium. Skipping
    // the work there is not possible; the filters are simply inert, which
    // costs a few hundred bytes of unused defs and nothing else.

    let host = document.getElementById(HOST_ID) as SVGSVGElement | null;
    if (!host) {
      host = document.createElementNS(NS, 'svg') as SVGSVGElement;
      host.id = HOST_ID;
      host.setAttribute('aria-hidden', 'true');
      host.setAttribute('focusable', 'false');
      // Not display:none — a hidden subtree does not render its filters in
      // some engines. Zero-size and clipped out of the way instead.
      host.setAttribute(
        'style',
        'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none',
      );
      document.body.append(host);
    }

    const built = new Set<string>();

    const apply = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w < 24 || h < 16) return;

      // --lg-band is declared on .glass and overridden by variants (pills go
      // smaller). It is a pure input to this map — nothing in CSS draws it.
      const band =
        parseFloat(getComputedStyle(node).getPropertyValue('--lg-band')) ||
        parseFloat(getComputedStyle(node).getPropertyValue('--kc-glass-lensBand')) ||
        14;

      const id = `kc-lens-${w}x${h}-${Math.round(band)}`;
      if (!built.has(id)) {
        built.add(id);
        host.append(buildFilter(id, w, h, band));
      }
      node.style.setProperty('--lg-filter', `url(#${id})`);
    };

    // The rim element is ::before, which cannot be measured or targeted from
    // script, so the variable is set on the panel and inherited by it.
    const panels = Array.from(document.querySelectorAll<HTMLElement>('.glass'));
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) apply(entry.target as HTMLElement);
    });
    for (const p of panels) observer.observe(p);

    return () => {
      observer.disconnect();
      host?.replaceChildren();
    };
  }, []);

  return null;
}
