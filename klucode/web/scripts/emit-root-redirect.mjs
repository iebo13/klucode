/**
 * Static export has no middleware, so `/` would 404. This writes an out/index.html
 * that picks a language from the browser and forwards to it.
 *
 * A server-level redirect is better and should win where it exists (see
 * deploy/htaccess.txt for the Plesk/Apache version). This file is the floor:
 * it guarantees `/` works on any host, even one you cannot configure.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'out');

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KluCode</title>
    <link rel="canonical" href="https://klucode.de/de/" />
    <link rel="alternate" hreflang="de" href="https://klucode.de/de/" />
    <link rel="alternate" hreflang="en" href="https://klucode.de/en/" />
    <link rel="alternate" hreflang="x-default" href="https://klucode.de/de/" />
    <meta http-equiv="refresh" content="0; url=/de/" />
    <script>
      (function () {
        var lang = (navigator.language || 'de').toLowerCase();
        location.replace(lang.indexOf('de') === 0 ? '/de/' : '/en/');
      })();
    </script>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f2f4f1;
        color: #0c1a15;
        font: 500 17px/1.6 ui-sans-serif, system-ui, sans-serif;
      }
      a {
        color: #2b564a;
      }
    </style>
  </head>
  <body>
    <p>
      <a href="/de/">Weiter zu KluCode</a> · <a href="/en/">Continue in English</a>
    </p>
  </body>
</html>
`;

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'index.html'), html, 'utf8');
console.log('emitted out/index.html (root language redirect)');
