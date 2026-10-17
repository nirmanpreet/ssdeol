# SS Deol — commercial & industrial painting, Victoria

Static website for **SS Deol Enterprises Pty Ltd** (ABN 99 639 811 564).

- **Stack:** Eleventy 3 · TypeScript · esbuild · vanilla CSS → GitHub Pages
- **Cost:** $0 hosting (domain only)
- **Contact form:** Web3Forms (250 submissions/month free)
- **Lead tool:** instant quote calculator with an honesty guard
- **First load:** ~180 KB uncompressed, ~134 KB gzipped

> 👤 **Not a developer?** Read **[MAINTENANCE.md](MAINTENANCE.md)** first.
> Everything you need to know is in there.
> ⚠️ **Before going live**, work through
> **[TO-FILL-IN-BEFORE-LAUNCH.md](TO-FILL-IN-BEFORE-LAUNCH.md)**.

---

## Why not Next.js / React?

Considered and rejected on measurement, not taste.

Adding React DOM to this site costs **~45 KB gzipped** — roughly a third of the
current page weight — to render markup that is already static. Next.js and Nuxt
additionally ship SSR and server machinery this site has no use for, on a
project whose whole premise is free static hosting.

Eleventy already emits plain HTML with no framework runtime, and the TypeScript
build step buys the same safety a modern stack would, for about 4 KB. Measured
outcome: **faster than 11 of the 12 Victorian competitors** benchmarked during
planning, whose page weights ranged from 45 KB to 1,091 KB.

---

## Quick start

```bash
npm install
npm start        # dev server at http://localhost:8080
npm run build    # writes the site to _site/
npm run check    # validates the built site — run this before every publish
```

Requires Node 18+ (developed on Node 24).

---

## Repository layout

```
_content/                   Everything the site owner edits
├── _data/
│   ├── site.yml            phone, email, address, hours, form key, SEO
│   ├── services.yml        9 services + 10 industries
│   ├── credentials.yml     credentials, trust bar numbers, 3 pillars
│   └── nav.yml             menu, service areas, 7-step process
├── _includes/
│   ├── layouts/            base.njk, service.njk
│   └── partials/           header, footer, CTA, call bar, breadcrumbs, schema
├── *.njk                   home, about, projects, contact, service-areas,
│                           privacy, 404, services/index  — pure HTML
├── services/*.md           one file per service page (9) — Markdown prose
├── projects/*.md           one file per project — Markdown + own page
├── sitemap.njk             robots.txt lives at the repo root

assets/
├── css/main.css            single stylesheet, design tokens at the top
├── js/main.js              nav, form, filters, lightbox, before/after slider
├── fonts/                  self-hosted Barlow Condensed + Inter (woff2)
└── img/brand/              generated logo pack
└── img/projects/           ← your job photos go here

tools/                      one-off + QA scripts (never needed by the owner)
.github/workflows/deploy.yml
```

### Why some pages are `.njk` and some are `.md`

Layout-heavy pages (home, contact, projects…) are `.njk` — pure HTML, rendered
by Nunjucks only. Prose pages (the nine service pages, each project) are `.md`,
so the owner writes in ordinary Markdown.

This split is deliberate and it fixed a whole class of bugs: in a `.md` file a
**blank line between two block-level HTML elements** ends the raw-HTML block as
far as `markdown-it` is concerned, and it then wraps each element in a `<p>`.
That produced invalid HTML and visibly broken grids. `.njk` files are never
processed by markdown, so the problem cannot occur.

`tools/check-markdown-mangling.mjs` guards against regression.

---

## Design decisions worth knowing

**Eleventy over plain HTML.** The requirement was that a non-technical person
can add a project by dropping in photos and editing one small file. Eleventy
outputs plain HTML with **no framework runtime**, which is the fastest possible
starting point for Lighthouse.

**YAML, not JSON, for settings.** JSON cannot carry comments, and these files
are edited by someone who does not write code. Every setting file explains
itself in place.

**No CSS framework.** Tailwind or Bootstrap would add 30–100 KB and make the
stylesheet harder to read. One plain CSS file, tokens at the top.

**No build step for the owner.** They never install anything. GitHub Actions
runs the build.

**GitHub Actions, not the legacy `github-pages` gem.** GitHub's docs state
Actions is now the recommended approach, and a custom Actions workflow is
exempt from the 10-builds-per-hour soft limit.

### Traps hit during the build (documented so they are not reintroduced)

| Trap | What happens | Fix in this repo |
|---|---|---|
| Eleventy 3 does **not** read `.yml` data files by default | Every `{{ site.* }}` renders blank, silently, no error | `addDataExtension('yaml,yml', …)` in `.eleventy.js` |
| `dir.data` / `dir.includes` resolve **relative to `dir.input`** | Setting them to `_content/_data` looks in `_content/_content/_data` | Leave both at their defaults |
| Nunjucks comments close with `#}`, not `--}` | An unclosed comment swallows the whole file | `tools/check-comments.mjs` |
| Unquoted YAML with `": "` becomes a **mapping** | Renders as `[object Object]` on the live page | Quote the scalar; caught by `npm run check` |
| Nunjucks shortcodes are **not** injected into nested layouts | `icon()` undefined inside `layouts/service.njk` | Registered via `amendLibrary('njk', addGlobal)` |
| A blank line between block HTML in a `.md` page | markdown-it wraps elements in `<p>`; grids break | Layout pages converted to `.njk`; `npm run qa:markdown` guards it |
| A Nunjucks tag on its own line leaves a blank line | same markdown-mangling bug | Whitespace control `{%- … -%}`; `npm run fix:layout` |
| `date` is a reserved Eleventy key | Build fails on a placeholder date | Project files use `completed:` |
| Nunjucks has no `or` operator, and no `map(attribute=…)` | Build fails | Custom filters in `.eleventy.js` |
| White card inside a dark section | heading rendered white-on-white | `.pillar h3 { color: var(--ink) }`; caught by the invisible-text check in `npm run qa:visual` |

---

## Brand assets

The logo was processed by `npm run build:logo` (`tools/build-logo.mjs`):

| Output | Size | Purpose |
|---|---|---|
| `logo.avif` | **37 KB** | Modern browsers (from a 914 KB original) |
| `logo.webp` | 93 KB | Mid-range fallback |
| `logo.png` | 135 KB | Legacy fallback |
| `favicon.svg` / `.png` | <3 KB | Browser tab |
| `logo-mark.svg` | 0.7 KB | Simplified shield for very small sizes |
| `icon-192/512.png`, `apple-touch-icon.png` | 6–19 KB | Home-screen / search tile |

**On vectorising:** the crest was deliberately **not** auto-traced. A potrace of
the eagle measured **332 KB across 2,087 paths** — heavier than the optimised
raster it would replace, because the feathers and roller detail shatter into
thousands of subpaths. Raster wins for this artwork. If a designer later supplies
a true vector original, drop it in as `logo.svg` and add a `<source>` to the
`<picture>` in `_includes/partials/header.njk`.

**Colours** are sampled from `logo.png` and defined once in `main.css`:

| Token | Hex | Source |
|---|---|---|
| `--green` | `#046A32` | shield + eagle |
| `--gold` | `#EDB924` | borders + "PAINTING" |
| `--ink` | `#0A0A0A` | outlines + "SS DEOL" |

All text/background pairings meet **WCAG 2.1 AA** (white on green = 6.7:1;
ink on gold = 10.9:1). Gold is never used for text on white — it only reaches
1.8:1.

---

## SEO

- `PaintingService` schema (a `LocalBusiness` subtype, more specific than most
  competitors use), `BreadcrumbList`, and `Service` on every service page
- Auto-generated `sitemap.xml` from `collections.all` — never needs editing
- Open Graph + Twitter cards, canonical URLs, unique title/description per page
- `lang="en-AU"`, `geo.region AU-VIC`
- **Deliberately no `AggregateRating`/`Review` schema** — review markup is only
  legal if every rating is genuine
- **Deliberately no thin suburb pages.** One strong `/service-areas/` page plus
  `areaServed` schema. A page per Melbourne suburb would be ~300 thin/duplicate
  pages, which is a ranking liability, not a strategy

---

## Contact form

`Web3Forms`, POSTed via `fetch()` with:

- hidden honeypot (`botcheck`) + **free** hCaptcha (Google reCAPTCHA and
  Cloudflare Turnstile are paid extras on their plans)
- inline accessible validation, `role="alert"`, `aria-describedby` error wiring
- the access key is safe to expose in client-side code — Web3Forms documents it
  as an alias to your inbox, not a secret
- **the destination email is changed in the Web3Forms dashboard, with no code
  change** — the reason this provider was chosen over the free alternatives
- phone, email and a `mailto:` link always visible beside the form, so a lead
  still converts if submission fails

`Forminit` is the documented fallback if photo upload on the quote form becomes
necessary (100 submissions/month, 100 MB free — the only free provider verified
to support uploads).

---

## QA

```bash
npm run build && npm run check && npm run qa:markdown && npm run qa:visual
```

**`npm run check`** validates the built output:

1. leftover `[PLACEHOLDER]` text, listed per page
2. unrendered `{{ }}` tags and unresolved data values
3. every internal link and asset reference resolves
4. asset weight budget
5. unique `<title>` per page; meta description present and length
6. canonical + Open Graph present; schema blocks parse as valid JSON
7. `alt` on every image, `<label for>` on every input, `lang="en-AU"`
8. `sitemap.xml`, `robots.txt`, privacy policy and 404 page exist

Exits non-zero on failure. Wired into the deploy workflow as a non-blocking
report.

**`npm run qa:markdown`** — catches `<p>` tags wrapping block-level elements,
the signature of the markdown/HTML interference described above.

**`npm run qa:visual`** — drives a real Chromium browser against the built site
(requires `npx playwright install chromium`):

- screenshots every page, plus mobile and mobile-menu
- one `<h1>` per page, no skipped heading levels
- `alt` on every image; `width`/`height` on every image (layout shift)
- a `<label for>` on every form control
- tap targets ≥ 32 px in navs and bars
- **invisible text**: any leaf text under 2:1 contrast against its effective
  background — this is what caught the white-on-white pillar headings
- the sticky call bar exists, is ≥ 44 px tall, and dials a real `tel:` link
- no horizontal scroll on mobile
- empty and invalid form submissions are blocked, with `role="alert"` and
  `aria-invalid` + `aria-describedby` wiring

---

## Scripts

| Command | Does |
|---|---|
| `npm start` | Dev server with reload |
| `npm run build` | Build to `_site/` |
| `npm run check` | Validate the built site |
| `npm run qa:markdown` | Guard against markdown/HTML interference |
| `npm run qa:visual` | Browser-driven visual + accessibility QA |
| `npm run fix:layout` | Repair blank lines / Nunjucks whitespace in pages |
| `npm run build:logo` | Re-run the logo pipeline from `logo.png` |
| `npm run build:fonts` | Re-download and subset the webfonts |
| `node tools/check-comments.mjs` | Lint Nunjucks comment balance |

---

## Licence & credits

- Typefaces: **Barlow Condensed** and **Inter**, SIL Open Font License 1.1
- Icons: hand-authored inline SVG (`tools/icons.js`) — no third-party icon set
- Logo: supplied by the client
- Stack: Eleventy (MIT), Nunjucks (BSD), sharp (Apache-2.0)

No tracking cookies. No advertising pixels. No Google Analytics.