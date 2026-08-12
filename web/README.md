# klucode.de — the website

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

   Two ways to be empty, and they are not the same. `todo('…')` means _required
   and not supplied yet_ — it keeps the banner up. `null` means _deliberately
   absent_: no USt-IdNr. because of § 19 UStG, no public GitHub, no professional
   indemnity policy to disclose. A `null` field renders nothing, drops the
   Impressum section that would have shown it, and never reaches the banner.
   Without that distinction a Kleinunternehmer could never clear the warning.

   ```bash
   npm run build && npm run check:profile   # the hard gate
   ```

   `check:profile` fails on any remaining `«…»` anywhere in `out/` and on the
   presence of the Impressum alert box. It is deliberately **not** in CI — CI
   has to stay green while the placeholders are legitimately still there.

2. **Add a portrait** as `public/portrait.jpg` and swap the placeholder block in
   `src/components/page-sections.tsx` (`AboutPage`). A one-person brand with no
   face is asking for trust it has not offered.
3. **Have the Impressum and Datenschutzerklärung reviewed once.** They are
   written carefully and are a solid starting point, but they are not legal
   advice and only you know your final setup. Two things are already handled:
   the Impressum carries no reference to the EU ODR platform (shut down
   20 July 2025 — a link to it is now itself chargeable), and the VAT section
   switches between § 27a and the § 19 Kleinunternehmer statement depending on
   `profile.vatId`. If you hold professional indemnity insurance, fill in
   `profile.insurance`: § 2 no. 11 DL-InfoV wants insurer, address and
   territorial scope, and a partial disclosure is worse than none.
4. Work through the launch checklist in `../brand/04-launch-playbook.md` §3.3.

### Going live on the real domain

`profile.siteUrl` is `metadataBase`; every canonical, hreflang, OG URL, sitemap
entry and JSON-LD `@id` derives from it. Getting the domain right is therefore
one variable, and verifying it is one grep.

```bash
npm run build            # NEXT_PUBLIC_SITE_URL unset -> https://klucode.de
npm run check:profile
grep -o 'https://[^"]*' out/de/index.html | sort -u | head   # nothing but the apex
```

Then, on the host:

- [ ] DNS for `klucode.de`, and `www` decided — the `.htaccess` assumes
      `www` → apex; flip both rules if you want it the other way.
- [ ] TLS certificate installed, **then** un-comment section 0 of
      `deploy/htaccess.txt` (HTTPS and apex redirects). Not before — enabling
      the HTTPS redirect without a certificate locks you out.
- [ ] `deploy/htaccess.txt` renamed to `.htaccess` in the document root.
- [ ] `curl -I https://klucode.de/de/` shows the CSP, HSTS, nosniff and
      referrer-policy headers. Plesk does not apply them from
      `next.config.mjs`; only the `.htaccess` does.
- [ ] `https://klucode.de/de/leistungen/` resolves with the trailing slash and
      without a rewrite rule — this is what `trailingSlash: true` is for.
- [ ] `robots.txt` and `sitemap.xml` show the production origin, and the
      sitemap lists the twelve indexable routes (the two legal pages are
      `noindex` and deliberately absent).

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
  lib/schema.ts          JSON-LD, generated from content/ — never hand-written
scripts/
  check-spacing.mjs      off-scale spacing utilities produce no CSS, silently
  check-meta.mjs         title / description uniqueness and length budget
  check-copy.mjs         copy that has to fit a narrow slot still fits it
  check-profile.mjs      the go-live gate: no «placeholders» left in out/
```

### Structured data

`src/lib/schema.ts` builds a `@graph` — `ProfessionalService` with an
`OfferCatalog`, `WebSite`, `Person` on the About and Contact pages,
`BreadcrumbList` on sub-pages, `FAQPage` on the home page — entirely from
`src/content`. Nothing is hand-written next to the copy it describes, because
that drifts within one edit.

Two things worth knowing before touching it:

- **URLs come from `profile.siteUrl`, never from `asset()`.** `siteUrl` already
  contains the base path on a subpath deploy, so `asset()` would apply it twice
  and poison every `@id`. Same trap as `alternates` vs `icons` — see
  `src/lib/base-path.ts`. CI builds with a base path and greps for it.
- **`FAQPage` is not an SEO lever any more.** Google deprecated FAQ structured
  data on 7 May 2026: the rich result is gone, Rich Results Test support ended
  that June and the Search Console report that August. It stays because the
  markup is still valid, costs nothing to generate from an array that already
  exists, and is still read by Bing and the retrieval crawlers. Do not hang an
  acceptance criterion on it, and do not use the Rich Results Test as the only
  validator — check the whole graph in the Schema.org validator too.

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

**Decided (issue #11): the mailto hand-off stays. No endpoint.**

There is no server, so the form does **not** silently post to a third-party
service. It opens the visitor's own mail client with the message prepared —
they see exactly what is sent and to whom, and the privacy policy stays true
because there is no additional processor to name.

The cost is real and is handled rather than hidden. A device with no configured
mail client reaches a dead end, and nothing is logged, so a lost enquiry is
silently lost. Three things follow from that:

- The form has a `handoff` state, not a `sent` state. Assigning
  `window.location.href` tells you nothing about whether a mail client opened,
  so the copy says what _should_ have happened and repeats the address in
  selectable text. It must never claim a message was sent — and the form stays
  rendered through the hand-off, so the typed message is never lost to a
  success screen.
- The address and phone number sit above the form in DOM order, so on a phone
  the guaranteed path is the one you meet first.
- `mailtoNote` says plainly what the form does and does not do.

To switch to a real endpoint: **`deploy/contact.php` is a ready-made
same-origin handler** for the Plesk server — the one option that adds no
processor at all: the host is already named under Art. 28 in §3 of the policy,
and the CSP already permits `form-action 'self'`. The header of that file lists
the enable steps (recipient, upload, `profile.formEndpoint: '/contact.php'`,
privacy §5 update). A hosted service (Formspree, Basin, …) also works via
`profile.formEndpoint` — but then **update `privacy.sections` §5 in `de.ts` and
`en.ts` in the same change**: you will have added a processor, and the policy
currently says you have not.

---

## Deployment

**Plesk / Apache** — build, upload the contents of `out/` to the document root,
then rename `deploy/htaccess.txt` to `.htaccess` beside it. That adds a
server-side language redirect from `/`, a strict CSP, and sane caching.

**Netlify / Vercel / any static host** — point it at this directory, build
command `npm run build`, publish directory `out`.

**GitHub Pages (preview)** — `.github/workflows/deploy-klucode.yml` builds and
publishes on every push to `main` that touches `web/` or `brand/`, and can be run by
hand from the Actions tab. It is a _preview_; the real site is the Plesk upload
above.

Pages serves a project repo from a **subpath** (`/<repo>/`), which is where
static exports usually break. Two environment variables handle it, both fed
from `actions/configure-pages` so a rename or a custom domain needs no edit:

| Variable                | Effect                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_PATH` | Next's `basePath`; also used by `src/lib/base-path.ts` and the root-redirect script |
| `NEXT_PUBLIC_SITE_URL`  | Absolute origin for canonical URLs, hreflang, sitemap and OG images                 |

Unset both and you get a domain-root build — which is what the Plesk deploy
wants, so nothing about that path changed.

⚠️ **The metadata API has two behaviours and they are easy to confuse.**
`alternates` and `openGraph.images` are resolved against `metadataBase`, which
already contains the subpath, so they take **plain** paths. `icons` are written
into the HTML **verbatim**, so they need `asset()`. Prefixing the first group
produces `/test/test/de/`; not prefixing the second produces 404 favicons.
Neither is visible until the site is actually served from a subpath — build
with `NEXT_PUBLIC_BASE_PATH=/x` and read `out/de/index.html` before trusting
any change here.

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
