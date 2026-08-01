# klucode.de

The KluCode website. Next.js 15 (App Router) exported to static files —
no server, no database, no runtime dependencies.

```bash
npm install
npm run dev          # http://localhost:3000  (redirects to /de)
npm run build        # → out/   (static, deployable anywhere)
npm run lint && npm run typecheck
```

---

## Before it goes live

1. **Fill in `src/content/profile.ts`.** Every personal and legal detail lives
   there and nowhere else. Anything still wrapped in `todo()` renders as `«…»`
   and puts a loud warning banner at the top of the Impressum. That banner is a
   feature: in Germany an incomplete Impressum under § 5 DDG is grounds for a
   costly _Abmahnung_.
2. **Add a portrait** as `public/portrait.jpg` and swap the placeholder block in
   `src/components/page-sections.tsx` (`AboutPage`). A one-person brand with no
   face is asking for trust it has not offered.
3. **Have the Impressum and Datenschutzerklärung reviewed once.** They are
   written carefully and are a solid starting point, but they are not legal
   advice and only you know your final setup.
4. Work through the launch checklist in `../brand/04-launch-playbook.md` §3.3.

---

## Why static export

Three reasons, in order of how much they matter here:

1. **It deploys to the Plesk server you already run.** Upload the contents of
   `out/`. No Node process to keep alive, no runtime to patch, nothing that can
   fall over at 3am.
2. **Nothing executes per request**, so there is no application-level logging of
   visitor data to disclose or justify under the DSGVO. The privacy policy can
   make a strong claim because the architecture actually backs it.
3. It is genuinely fast, which is the kind of proof a developer's own site
   should be offering.

The trade-off is real and worth stating: there is no server to receive a contact
form. See below.

---

## Architecture

```
src/
  app/
    [lang]/              root layout — <html lang> is per-language, which is
      layout.tsx         why the language sits in the route rather than a cookie
      page.tsx           home
      [page]/page.tsx    every other page, both languages, one file
      not-found.tsx
    sitemap.ts           generated at build, both languages, with hreflang
    robots.ts
    globals.css
    tokens.css           GENERATED — see ../brand/tokens/build_css.py
  components/
  content/
    profile.ts           ← the only file you must edit
    de.ts / en.ts        all copy, both `satisfies Content`
    types.ts
  lib/routes.ts          localised slugs and the language switch
```

### Localised slugs

`/de/leistungen` and `/en/services` are the same page. `lib/routes.ts` maps a
`PageKey` to a slug per language; `[page]/page.tsx` resolves the slug back and
renders the matching section. German search traffic is the point of the German
side, so German URLs are not optional.

Adding a page means: a key in `PAGE_KEYS`, a slug pair in `slugs`, a section in
both `de.ts` and `en.ts`, and a case in the `views` map.

### The two languages cannot drift

`de.ts` and `en.ts` are both declared `satisfies Content`. Add a section to one
and forget the other and the build fails — rather than a client finding a
half-translated page.

### Tokens are not copied

`tailwind.config.ts` imports `../brand/tokens/tokens.json` directly. There is
exactly one place a brand colour is written down. `src/app/tokens.css` is
generated from the same file by `brand/tokens/build_css.py`; do not hand-edit
it.

---

## The contact form

There is no server, so the form does **not** silently post to a third-party
service. It opens the visitor's own mail client with the message prepared —
they see exactly what is sent and to whom, and the privacy policy stays true.

To switch to a real endpoint (Formspree, Basin, your own handler): set
`profile.formEndpoint`. **Update `privacy.sections` §5 in `de.ts` and `en.ts` at
the same time** — you will have added a processor, and the policy currently says
you have not.

---

## Deployment

**Plesk / Apache** — build, upload the contents of `out/` to the document root,
then rename `deploy/htaccess.txt` to `.htaccess` beside it. That adds a
server-side language redirect from `/`, a strict CSP, and sane caching.

**Netlify / Vercel / any static host** — point it at this directory, build
command `npm run build`, publish directory `out`.

`/` works on any host regardless: the build emits an `out/index.html` that
detects the browser language and forwards. A server-side 301 is better where you
can configure one, and the `.htaccess` takes precedence when present.

---

## Things that are deliberate

- **No cookie banner**, because no cookies. Verify with a cold cache before
  launch rather than trusting this sentence.
- **Fonts are self-hosted.** `next/font` downloads Space Grotesk, Inter and
  JetBrains Mono at build time and serves them from your domain. Never replace
  this with a `fonts.googleapis.com` link — that transmits visitor IPs to
  Google, which is what LG München I awarded damages over (Az. 3 O 17493/20).
- **Legal pages are `noindex`.** They carry no marketing value and should not
  compete with real pages in search.
- **Viridian `500` (#5EA472) is never a text or button colour.** It measures
  2.79:1 on the off-white background. Buttons and green text use `viridian-700`.
  See `../brand/03-visual-identity.md` §5.
- **Light and dark are two designed themes, not one inverted.** Dark raises
  surfaces to signal elevation, uses off-white text, and moves the accent up the
  scale. Colour lives in `../brand/tokens/tokens.json`, generated in OKLCH.
- **The skip link is the first tab stop**, and focus styles are never removed.
