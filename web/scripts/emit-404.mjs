/**
 * Overwrite out/404.html with a branded, bilingual page.
 *
 * Next's exported 404 comes from the global /_not-found route, which this app
 * cannot brand: there is no root layout — src/app/[lang]/layout.tsx owns
 * <html lang> per language, and hoisting a root layout above it would nest
 * <html> inside <html>. So [lang]/not-found.tsx is unreachable on a static
 * export (it still serves `notFound()` calls in dev) and the exported
 * 404.html was Next's unstyled English default. Apache serves that file for
 * every typo URL (ErrorDocument in deploy/htaccess.txt), GitHub Pages by
 * convention — it is worth owning.
 *
 * Copy is fixed by brand/02-voice.md §7 (and mirrored in de.ts/en.ts
 * `notFound`): no jokes about bugs — it undermines the one thing the brand
 * sells. Colours are the token values from brand/tokens/tokens.json.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'out');

const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const BASE = raw === '/' ? '' : raw.replace(/\/$/, '');

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>404 · KluCode</title>
    <link rel="icon" href="${BASE}/favicon.svg" type="image/svg+xml" />
    <script>
      // Same pre-paint theme pick as the site (lib/theme.ts): stored choice
      // first, otherwise the OS. Inline and blocking on purpose.
      try {
        var t = localStorage.getItem('kc-theme');
        if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
      } catch (e) {}
    </script>
    <style>
      /* Token values from brand/tokens/tokens.json: paper/ink, viridian text-safe steps. */
      :root {
        color-scheme: light dark;
        --surface: #f5f8f6;
        --text: #1c201c;
        --muted: #5c605c;
        --link: #396c43;
        --line: #d7dbd8;
      }
      @media (prefers-color-scheme: dark) {
        :root:not([data-theme='light']) {
          color-scheme: dark;
          --surface: #1c201c;
          --text: #eaeeeb;
          --muted: #a8ada9;
          --link: #7dbd90;
          --line: #444844;
        }
      }
      :root[data-theme='dark'] {
        color-scheme: dark;
        --surface: #1c201c;
        --text: #eaeeeb;
        --muted: #a8ada9;
        --link: #7dbd90;
        --line: #444844;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: var(--surface);
        color: var(--text);
        font: 400 17px/1.65 ui-sans-serif, system-ui, sans-serif;
      }
      main {
        max-width: 34rem;
        padding: 3rem 1.5rem;
      }
      .brand {
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0 0 2rem;
      }
      h1 {
        font-size: 1.6rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0 0 0.5rem;
      }
      p {
        margin: 0 0 0.25rem;
        color: var(--muted);
      }
      .en {
        border-top: 1px solid var(--line);
        margin-top: 1.5rem;
        padding-top: 1.5rem;
      }
      .en h2 {
        font-size: 1.05rem;
        font-weight: 500;
        margin: 0 0 0.25rem;
        color: var(--text);
      }
      a {
        color: var(--link);
        text-underline-offset: 3px;
      }
      a:focus-visible {
        outline: 2px solid var(--link);
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="brand">KluCode</p>
      <h1>Diese Seite gibt es nicht.</h1>
      <p>Vielleicht hilft die <a href="${BASE}/de/">Startseite</a> weiter.</p>
      <section class="en" lang="en">
        <h2>This page does not exist.</h2>
        <p>The <a href="${BASE}/en/">homepage</a> is probably a better start.</p>
      </section>
    </main>
  </body>
</html>
`;

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, '404.html'), html, 'utf8');
console.log('emitted out/404.html (branded bilingual 404)');
