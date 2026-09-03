# klucode.de — the website

The KluCode website. Next.js 15 (App Router) exported to static files: no
server, no database, no runtime dependencies. The browser downloads no
JavaScript it does not need, and the homepage's services section is the one
place that asks for any. Where the browser can make a WebGL context and the
window is wide enough for the panel to stand beside the picture, the section
is a real-time three.js scene on the KluCode K, with the camera flying the
letter as the reader scrolls. The renderer, its addons and the four glTF
bodies are all behind one dynamic import and fetched only where that world
mounts. Everywhere else, a phone, a narrow window, a browser with no WebGL,
the section falls back to five pre-rendered Blender stills of the same place,
which are `<img>` tags with nothing to boot.

`npm run check:bundle` holds four budgets over that: the eager script weight
on its recorded baseline (three.js never appears in a chunk the page
references directly), the deferred scene code under 260 kB gzipped, the
scene's assets under 1.5 MB at 1x, and the stills under 800 kB. What the
scene's frame rate actually is cannot be measured headless, because headless
Chromium draws WebGL on the processor, so the timing test is opted into with
`CROSSROADS_GPU=1 npm run test:e2e -- --project=gpu`, which opens a real
window on a real graphics card. A plain `npm run test:e2e` stays headless and
runs everything else.

```bash
# from this directory (web/) — or from the repo root, whose package.json
# forwards dev/build/start here
npm install
npm run dev          # http://localhost:3000  (dev-only redirect to /de)
npm run build        # → out/   (static, deployable anywhere)
npm run start        # serve the built out/ directory
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

2. **The portrait is `public/founder.webp`**, on /ueber-mich. Replace the
   file to replace the face.
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
5. **Decide who moves `availableFrom`.** It is a bare year („Freie
   Kapazität ab 2027") or a year and month („ab September"). A month is a
   promise in August and a site nobody maintains in November, which is why
   the field is a year for now. `npm run check:profile` refuses a production
   build whose year or month has passed, so a stale line can never ship, but
   it does not roll forward: somebody has to bump `profile.availableFrom`
   before each upload, and the check is the reminder rather than the fix.

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
  check-spacing.mjs        off-scale spacing utilities produce no CSS, silently
  check-meta.mjs           title / description uniqueness and length budget
  check-copy.mjs           copy that has to fit a narrow slot still fits it
  check-profile.mjs        the go-live gate: no «placeholders» left in out/
  check-bundle.mjs         the four budgets: eager on its baseline, scene code deferred and under 260 kB gzipped, assets under 1.5 MB, stills under 800 kB
  check-scene-palette.mjs  crossroads objects draw only from the token palette, never a literal colour
tests/
  unit/                    the pure suite (test:unit): no browser, no build, fast enough to run on every save
  e2e/                     the browser suite (test:e2e), driven against the built export rather than a dev server
                           crossroads-flight.spec.ts is the frame-time measurement, headed, and exists only under CROSSROADS_GPU=1
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

Two deploys, two behaviours, one variable. `profile.formEndpoint` is
`/contact.php` when `NEXT_PUBLIC_SITE_URL` is unset or names `klucode.de`, and
empty everywhere else. Read `src/content/profile.ts` before touching either.

**Production (the Plesk upload, a plain `npm run build`)** posts the form to
`deploy/contact.php`, a first-party handler on the same server. This is what
makes the form a real second contact channel: there is no phone number on the
site (owner's decision, recorded in `profile.phone`), § 5 DDG wants a second
route alongside email, and the ECJ accepted an electronic enquiry form for
exactly that in C-298/07, but only a form that actually transmits. Upload
`contact.php` to the document root with the rest of `out/`, confirm `mail()`
sends and that `website@klucode.de` passes SPF/DMARC, then send one message
from the live site before relying on it.

**Previews (GitHub Pages, where the variable is set)** cannot run PHP, so the
form hands off to the visitor's own mail client with the message prepared, and
the note under the form says so. A device with no mail client reaches a dead
end there, which is why the address sits above the form. Do not share the
preview with a client as if it were the site: on the preview the form is the
email channel wearing a second hat.

The form carries an optional phone field for a call back. The site publishes
no number, so this is how the 30 minute call it offers everywhere can actually
be arranged by a reader who would rather talk than write. Two more channels
are wired and switched off: `profile.whatsapp` (a wa.me link, digits only) and
`profile.booking` (a slot picker URL). Both render nothing while null. Setting
`booking` adds a third party the privacy policy currently says the site has
none of, so amend `privacy.sections` in the same change.

The privacy policy's § 5 describes the production path, which is the one
visitors are subject to. `tests/e2e/contact.spec.ts` asserts that the form
posts to the same origin, that the honeypot is unreachable, and that the note
under the form matches the path the build actually takes.

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
