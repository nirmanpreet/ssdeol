# ⚠️ THINGS TO DO BEFORE THE WEBSITE GOES LIVE

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
| 6 | **Landline** *(optional — leave blank if none)* | `landline` | blank |
| 7 | **Opening hours** | `hours.weekdays` | `[PLACEHOLDER: Mon–Fri 7:00am – 5:00pm]` |
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
3. It emails you an **Access Key** — a long string of letters and numbers
4. Open `_content/_data/site.yml` and find this line:

   ```
   accessKey: "[PLACEHOLDER: paste your Web3Forms access key here]"
   ```

5. Paste your key in, keeping the quotation marks:

   ```
   accessKey: "abc12345-6789-xxxx-xxxx-abcdef123456"
   ```

6. Save. **That is it — no other code changes are needed.**

### Test the form before you launch

Go to the live Contact page and:

- ✅ Send a **real** message to yourself. Confirm it arrives.
- ✅ Confirm the phone number appears in the message.
- ✅ Confirm a **spam** submission is blocked (try submitting with the hidden
  "leave this field empty" box filled in, or simply send five test messages and
  see which arrive).
- ✅ Confirm the "thank you" message appears on screen.

> **To change the destination email later:** do it in the Web3Forms dashboard.
> You do **not** need to touch any code.

---

## 3. Google map coordinates *(optional but recommended)*

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

## 4. Privacy policy date

Open `_content/privacy.md` and replace:

```
[PLACEHOLDER: add the month and year you publish this]
```

with something like `October 2026`.

---

## 5. Credentials — confirm every one is still true

The website states these publicly. **Check them before launch.** If any has
lapsed, remove it from `_content/_data/credentials.yml` until it is renewed.

- [ ] Public liability insurance — **$10 million** still current?
- [ ] **Dulux Accredited Painter** accreditation still current?
- [ ] **Taubmans** — still a supplier you use?
- [ ] **All 8 operators** still hold current Victorian White Cards?
- [ ] **WorkCover Victorian Employer** still registered?
- [ ] **SWMS on every job** — still your practice?
- [ ] **5-year warranty** — still what you offer?
- [ ] **Trading since 2015** — accurate?

> **The Dulux and Taubmans names are used as words only. We do not display
> their logos** because brand logos usually come with their own licence rules.
> Check your Dulux accreditation paperwork — if it grants you logo use, we can
> add the official badge instead.

---

## 6. Things that are deliberately empty

These are empty **on purpose**. Fill them in when you have the material.

- [ ] **Project photographs** — see the Projects page. Add photos, then delete
      the yellow "coming soon" notice.
- [ ] **Testimonials** — ask two or three past clients for a sentence or two.
      The component is built and waiting.
- [ ] **Social media links** — currently blank, which means hidden. Add them in
      `site.social` in `_content/_data/site.yml` if you want them shown.

---

## 7. Final checks

- [ ] Website works on your **phone**, using mobile data (not Wi-Fi)
- [ ] Every "Call now" and "Call" button dials the right number
- [ ] The form sends and you receive it
- [ ] ABN **99 639 811 564** is correct and still active
- [ ] You have **registered ssdeol.com.au** and pointed it at GitHub
- [ ] Website shows **https://** with a padlock
- [ ] The address in the footer is right

---

## How to check you have not missed anything

There is an automated check that lists every remaining placeholder:

1. Go to the **Actions** tab on your GitHub repository
2. Click the most recent run
3. Look for **"PLACEHOLDER"** in the output

It also checks for broken links, missing image descriptions and pages without
titles. If it says **"ALL CHECKS PASSED"**, you are clear to launch.

---

**Last updated: see the top of this file.**