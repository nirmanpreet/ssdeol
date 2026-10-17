# âš ï¸ THINGS TO DO BEFORE THE WEBSITE GOES LIVE

Print this out or bookmark it. **The website works right now, but these items
must be completed before you publish it.** Anything left showing as
`[PLACEHOLDER: ...]` is highlighted in yellow on the website so it is impossible
to miss.

---

## 1. Contact details — the website does not work without these

All of these live in **one file**: `_content/_data/site.yml`

| # | What | Where | Current value |
|---|---|---|---|
| 1 | **Mobile phone number** | `phone` | `[PLACEHOLDER: 0400 000 000]` |
| 2 | **Phone number as people read it** | `phoneDisplay` | `[PLACEHOLDER: 0400 000 000]` |
| 3 | **Email address for enquiries** | `email` | `[PLACEHOLDER: quotes@ssdeol.com.au]` |
| 4 | **Street address** | `addressLine1` | `[PLACEHOLDER: Street address]` |
| 5 | **Suburb** | `suburb` | `[PLACEHOLDER: Suburb]` |
| 6 | **Landline** *(optional â€” leave blank if none)* | `landline` | blank |
| 7 | **Opening hours** | `hours.weekdays` | `[PLACEHOLDER: Monâ€“Fri 7:00am â€“ 5:00pm]` |
| 8 | **Weekend hours** | `hours.weekends` | `[PLACEHOLDER: Saturdays by arrangement]` |
| 9 | **Emergency hours** | `hours.emergency` | `[PLACEHOLDER: 24/7 emergency callouts]` |

> **If the phone number is not filled in, the "Call now" button on every page
> will do nothing.** This is the single most important item on this list.

---

## 2. Make the quote form work

GitHub Pages is a static host and cannot receive form submissions by itself, so
the form uses a free third-party service.

1. Go to **https://web3forms.com**
2. Sign up using your enquiry email address
3. It emails you an **Access Key** â€” a long string of letters and numbers
4. Open `_content/_data/site.yml` and find this line:

   ```
   accessKey: "[PLACEHOLDER: paste your Web3Forms access key here]"
   ```

5. Paste your key in, keeping the quotation marks:

   ```
   accessKey: "abc12345-6789-xxxx-xxxx-abcdef123456"
   ```

6. Save. **That is it â€” no other code changes are needed.**

### Test the form before you launch

Go to the live Contact page and:

- âœ… Send a **real** message to yourself. Confirm it arrives.
- âœ… Confirm the phone number appears in the message.
- âœ… Confirm a **spam** submission is blocked (try submitting with the hidden
  "leave this field empty" box filled in, or simply send five test messages and
  see which arrive).
- âœ… Confirm the "thank you" message appears on screen.

> **To change the destination email later:** do it in the Web3Forms dashboard.
> You do **not** need to touch any code.

---

## 3. Quote calculator — **must decide this one**

The site has an **instant quote calculator** that gives a visitor an indicative
price range in about twenty seconds. It is the main lead-capture tool.

**It is currently switched OFF on purpose.** Open `_content/_data/pricing.yml`
and you will see:

```yaml
configured: false
rates:
  - slug: commercial-repainting
    low: 22          # [PLACEHOLDER: your real $/mÂ²]
    high: 55
```

**The rates in that file are placeholders, not your prices.** While
`configured` is `false` the calculator shows an honest notice instead of a
number â€” it will never publish a price you have not approved.

**To turn it on:**

1. Work out your real rates (the file explains how â€” use the median of your last
   ten jobs, not the average)
2. Replace every rate
3. Set `configured: true`
4. Commit

**Two ways this could go wrong, so decide deliberately:**

| Option | What happens |
|---|---|
| **Turn it on with real rates** | Best lead-capture tool on the site. No competitor has one. |
| **Leave it off** | Visitors see "we do not publish a price range until we have set our own rates" plus the quote form. Still honest, still converts, slightly fewer leads. |

> âš ï¸ If you turn it on and the rates are too low you will win work you should
> not, and quote out of pocket on the ones that turn out to need much more
> preparation. If the ranges are too wide, nobody bothers. Err wide.

---

## 4. Google map coordinates *(optional but recommended)*

Open `_content/_includes/partials/schema.njk` and find:

```
"latitude": "[PLACEHOLDER: -37.7981]",
"longitude": "[PLACEHOLDER: 144.7414]"
```

To get your real coordinates:

1. Open **https://www.openstreetmap.org**
2. Search for your address
3. Click the marker
4. Copy the latitude and longitude numbers

Replace both values, keeping the quotation marks and the minus sign.

---

## 5. Privacy policy date

Open `_content/privacy.md` and replace:

```
[PLACEHOLDER: add the month and year you publish this]
```

with something like `October 2026`.

---

## 6. Credentials — confirm every one is still true

The website states these publicly. **Check them before launch.** If any has
lapsed, remove it from `_content/_data/credentials.yml` until it is renewed.

- [ ] Public liability insurance â€” **$10 million** still current?
- [ ] **Dulux Accredited Painter** accreditation still current?
- [ ] **Taubmans** â€” still a supplier you use?
- [ ] **All 8 operators** still hold current Victorian White Cards?
- [ ] **WorkCover Victorian Employer** still registered?
- [ ] **SWMS on every job** â€” still your practice?
- [ ] **5-year warranty** â€” still what you offer?
- [ ] **Trading since 2015** â€” accurate?

> **The Dulux and Taubmans names are used as words only. We do not display
> their logos** because brand logos usually come with their own licence rules.
> Check your Dulux accreditation paperwork â€” if it grants you logo use, we can
> add the official badge instead.

---

## 7. Things that are deliberately empty

These are empty **on purpose**. Fill them in when you have the material.

- [ ] **Project photographs** â€” see the Projects page. Add photos, then delete
      the yellow "coming soon" notice.
- [ ] **Testimonials** â€” ask two or three past clients for a sentence or two.
      The component is built and waiting.
- [ ] **Social media links** â€” currently blank, which means hidden. Add them in
      `site.social` in `_content/_data/site.yml` if you want them shown.

---

## 8. Final checks

- [ ] Website works on your **phone**, using mobile data (not Wi-Fi)
- [ ] Every "Call now" and "Call" button dials the right number
- [ ] The form sends and you receive it
- [ ] ABN **99 639 811 564** is correct and still active
- [ ] You have **registered ssdeol.com.au** and pointed it at GitHub
- [ ] Website shows **https://** with a padlock
- [ ] The address in the footer is right

---

## 9. How to check you have not missed anything

There is an automated check that lists every remaining placeholder:

1. Go to the **Actions** tab on your GitHub repository
2. Click the most recent run
3. Look for **"PLACEHOLDER"** in the output

It also checks for broken links, missing image descriptions and pages without
titles. If it says **"ALL CHECKS PASSED"**, you are clear to launch.

---

**Last updated: see the top of this file.**