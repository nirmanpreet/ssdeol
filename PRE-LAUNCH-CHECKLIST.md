# PRE-LAUNCH QA CHECKLIST

Work through this once, from top to bottom, before the website goes live.
Everything in **Part 1** is automated — run it first and fix anything it finds.
**Parts 2–5** need a human with a phone.

---

## Part 1 — Automated (run these)

```bash
npm run build        # build the site
npm run check        # content, links, SEO, accessibility, schema
npm run qa:markdown  # verifies nothing is broken by the page template
npm run qa:visual    # real browser: screenshots + accessibility + mobile
```

**`npm run check` must end with "No failures".** It lists every remaining
`[PLACEHOLDER]` for you.

**`npm run qa:visual` must end with "VISUAL QA PASSED".** It also saves
screenshots to `.qa-screenshots/` — have a look at `home-desktop.png`,
`home-mobile.png` and `contact-mobile-form-errors.png`.

These same checks run automatically on GitHub every time you push, so if the
**Actions** tab shows a green tick, the code is fine.

---

## Part 2 — Content and honesty ⚠️ read this one twice

The site makes specific claims. A facility manager or builder **will** check
these, and a claim that turns out to be wrong destroys everything else on the
page.

- [ ] ABN **99 639 811 564** is correct — verify on <https://abr.business.gov.au>
- [ ] "Trading since **2015**" — and that the Pty Ltd (registered 17 March 2020)
      wording on the About page reads honestly to you
- [ ] **$10 million** public liability is the real figure and is current
- [ ] **Dulux Accredited Painter** accreditation is current
- [ ] **Taubmans** is still a supplier you use
- [ ] **All eight** operators hold a current Victorian White Card
- [ ] **WorkCover Victorian Employer** registration is current
- [ ] **SWMS on every job** is still your practice
- [ ] **5-year warranty** is what you actually offer, in writing
- [ ] Every service on the Services page is one you genuinely deliver
- [ ] Every industry listed is one you have real experience in
- [ ] Nothing claims a client, award, award win, or statistic that is not real

---

## Part 3 — Contact details

- [ ] `npm run check` reports **zero** `[PLACEHOLDER]` entries
- [ ] Tap **Call now** on a real phone — it dials the right number
- [ ] Tap every phone number in the header, hero, CTA band and footer
- [ ] The email link opens a message to the right address
- [ ] **Real form submission:** send one to yourself from `/contact/` on a
      phone using mobile data (not Wi-Fi). Confirm it arrives and the phone
      number is on it.
- [ ] **Spam test:** submit with the hidden "leave this field empty" box filled
      in. Nothing should be delivered.
- [ ] Send 3–4 submissions quickly. Only genuine ones should arrive.
- [ ] Confirm the on-screen "thank you" message appears, and that the phone
      number inside it works
- [ ] Opening hours shown match reality

---

## Part 4 — On a real phone

Most of your visitors are on a phone, standing on site or in a ute.

- [ ] Home page loads on mobile data, not just Wi-Fi
- [ ] The **Call now** bar is visible at the bottom of every page
- [ ] Tapping the whole gold/green bar works, not just the words
- [ ] The menu button opens and closes the menu
- [ ] No sideways scrolling on any page
- [ ] Text is readable without pinching to zoom
- [ ] The quote form can be filled in with one thumb
- [ ] You can send the form from a phone
- [ ] Check on both iPhone (Safari) and Android (Chrome) if you can

---

## Part 5 — Links, metadata and the technical bits

- [ ] Every menu link works
- [ ] Every "See how we do it" service link works
- [ ] Every "Other services we provide" link works
- [ ] Social links are either correct or hidden (they are hidden when blank)
- [ ] `https://ssdeol.com.au` shows a padlock and redirects from `http://`
- [ ] `www.ssdeol.com.au` either works or redirects cleanly
- [ ] Visit `ssdeol.com.au/nonsense-page` — you should get the styled 404 page
      with working links, **not** a GitHub error
- [ ] `ssdeol.com.au/sitemap.xml` opens and shows your pages
- [ ] `ssdeol.com.au/robots.txt` opens

---

## Part 6 — Lighthouse

Run on the **live** site, in an incognito window:

1. Open Chrome → <https://pagespeed.web.dev>
2. Enter your domain → **Analyse**
3. Do this for **Mobile** (the default) — this is the one that matters

Target: **90+** on all four — Performance, Accessibility, Best Practices, SEO.

The automated checks above should mean this passes comfortably. If Performance
is low, it is almost always because of **oversized photos** — see Part 7.

---

## Part 7 — Photos (important for speed)

- [ ] Every photo under **1 MB**
- [ ] Every photo is in **AVIF, WebP or PNG** — never JPEG at full camera size
- [ ] Every photo has a sensible filename
- [ ] You have permission to photograph every site shown
- [ ] No photo contains another company's signage, vehicle plates or staff

---

## Part 8 — Search engines

1. Go to <https://search.google.com/search-console>
2. **Add property** → **URL prefix** → `https://ssdeol.com.au`
3. Verify (Google gives you a file to upload or a DNS TXT record)
4. **Sitemaps** → submit `sitemap.xml`
5. **URL Inspection** → paste your homepage → **Request indexing**

Then create the Google Business Profile (see the separate launch guide) — for a
local service business it usually matters more than anything on the website.

---

## Part 9 — After launch

- [ ] Check the site again on day 2 and day 7 (deploys can take a minute)
- [ ] Ask 2–3 recent clients for a written testimonial
- [ ] Photograph your first completed job and add it as a project
- [ ] Set a reminder to add a project every 2–3 months
- [ ] Set a reminder to review credentials every 12 months
- [ ] Add analytics (optional — Umami, free, no cookies) once you are settled

---

## 🆘 Rollback

Something broken after launch?

1. Go to the repository → **History** on the affected file
2. Click the version from before it broke
3. Click **Restore this version**

Or, to roll the whole site back to a known-good state:

1. **Actions** tab → find the last **green** run
2. Click **Re-run all jobs**

Either way it is live again within about a minute.