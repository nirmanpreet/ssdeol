# HOW TO EDIT THIS WEBSITE

**For the person who maintains it. You do not need to know how websites work.**
You need a free GitHub account and about five minutes' practice.

---

## The whole idea in one paragraph

Your website is stored as **text files in a folder on GitHub**. You change a
file, save it, and GitHub rebuilds the website automatically within about a
minute. That is the entire workflow. Everything else on this page is detail.

---

## 📱 Edit from your browser or your phone

No software to install.

1. Open GitHub → open your repository → open the file you want
2. Tap the pencil ✏️
3. Change the text
4. Scroll down → tap the green **Commit changes** button

> 📌 **First time only:** when GitHub asks *where do you want to commit from?*,
> choose **"Commit directly to the main branch"**. If you ever see the words
> *create a new branch*, you clicked the wrong button.

---

## 📞 How to change the phone number or email

**This is the change you will make most often.** One edit updates the phone
number, every call button, the email links, the footer, the contact page and
the click-to-call bar — all at once.

1. Open `_content/_data/site.yml`
2. Click the pencil ✏️
3. Find:

   ```yaml
   phone: "[PLACEHOLDER: 0400 000 000]"
   phoneDisplay: "[PLACEHOLDER: 0400 000 000]"
   email: "[PLACEHOLDER: quotes@ssdeol.com.au]"
   ```

4. Type over the placeholders, **keeping the quotation marks**:

   ```yaml
   phone: "0412 345 678"
   phoneDisplay: "0412 345 678"
   email: "quotes@ssdeol.com.au"
   ```

5. Commit. Done.

> ⚠️ **Never delete the quotation marks.** Without them the site breaks.

Your address and opening hours are in the same file — look for
`addressLine1`, `suburb`, `postcode` and the `hours:` section.

---

## 📝 How to change the words on a page

| To change | Open this file | Type |
|---|---|---|
| Homepage | `_content/home.njk` | `.njk` |
| About / credentials | `_content/about.njk` | `.njk` |
| Projects gallery | `_content/projects.njk` | `.njk` |
| Areas we cover | `_content/service-areas.njk` | `.njk` |
| Contact page and form | `_content/contact.njk` | `.njk` |
| Privacy policy | `_content/privacy.njk` | `.njk` |
| All services list | `_content/services/index.njk` | `.njk` |
| **Any service page** | `_content/services/*.md` | `.md` |
| **Any project** | `_content/projects/*.md` | `.md` |

1. Open the file, click the pencil ✏️
2. Find the sentence you want to change
3. Delete it, type the new one
4. Commit

### ⚠️ The two file types are different — this matters

**`.njk` pages** (home, about, projects, contact, areas, privacy, services list)
are already written as normal HTML. The text you want to change sits between
tags like this:

```html
<h2>How to change the words on a page</h2>
<p>Every page is a normal text file.</p>
```

Just edit the words between the tags. Leave the tags alone.

**`.md` pages** (the nine service pages and your projects) use ordinary
**Markdown** formatting, which is what Word users already know:

| You type | You get |
|---|---|
| `# Big heading` | Biggest heading |
| `## Medium heading` | Smaller heading |
| `- a point` | A bullet point |
| `**bold**` | Bold text |

> 🚫 **On `.njk` pages, `#` and `-` will appear literally.** Those pages use
> real HTML tags.
>
> 🚫 **On `.md` pages, never put a blank line between two blocks of HTML.**
> Markdown stops treating the HTML as one block and wraps bits of it in `<p>`
> tags, which breaks the page layout. Keep it tight, like the existing files.

> 🚫 **If you see `{{` — leave that line alone.** Those are code. Typing over
> them can break the page.
>
> 🚫 **Leave `---` lines alone too.** They are invisible dividers.

---

## 🖼️ How to add a project with photos

This is the biggest upgrade you can make to the website.

### The rules

- **Only photos of real work you have done.** Never use photos from the
  internet. They belong to someone else, and showing another company's work as
  yours would undo the whole purpose of the site.
- **For a before/after pair, stand in exactly the same spot both times.**
- **Keep every photo under 1 MB.** Phone photos are usually 4–8 MB and make
  the site slow. On iPhone, AirDrop the photo to yourself via **Mail** or
  **WhatsApp** instead — they shrink it automatically.

### Step 1 — upload the photos

1. In the repository, open `assets/img/projects/`
2. **Add file → Upload files**
3. Choose your photos
4. **Name them before uploading**, e.g.
   `footscray-warehouse-before.jpg` and `footscray-warehouse-after.jpg`
5. Click the green **Commit changes** button

### Step 2 — create the project file

1. Open `_content/projects/example-project.md`
2. Click the pencil ✏️
3. Select all, copy
4. Go back to the `_content/projects/` folder
5. **Add file → Create new file**
6. Name it after the job, e.g. `footscray-warehouse.md`
   *(the web address comes from this file name — no spaces, use hyphens)*
7. Paste, then fill in every `[PLACEHOLDER]`
8. Point `hero`, `before` and `after` at the photo names from step 1
9. Find this line and **delete it**:

   ```yaml
   permalink: false
   ```

10. Find `draft: true` and change it to `draft: false`
11. Commit

**That's it.** The project appears in the gallery on the Projects page, its
filters switch on automatically, and it gets its own page.

> 💡 You can safely leave `draft: true` while you gather photos. Drafts never
> appear on the website.

### While you have no projects yet

The Projects page shows a polite "photographs coming soon" notice. It also
lists the **types** of work you do in detail, which is honest, ranks well in
Google, and does not need photographs.

---

## 🎨 How to change the colours

Open `assets/css/main.css` and find the `:root` block near the top:

```css
--green:  #046A32;   /* main brand green */
--gold:   #EDB924;   /* accent gold     */
--ink:    #0A0A0A;   /* headings        */
```

They were sampled from your logo. **If you get new artwork, change these three
values and the whole site follows.**

---

## ➕ How to add a new service page

1. In `_content/services/`, open `line-marking.md`
2. Copy the whole file
3. In the same folder choose **Add file → Create new file**
4. Name it `sandblasting.md`
5. Paste, then change the four lines near the top:

   ```yaml
   permalink: /services/sandblasting/index.html
   title: Sandblasting & Surface Preparation
   description: One or two sentences, used by Google.
   intro: >-
     The short paragraph under the heading.
   ```

6. Delete the existing body text and write your own
7. To show it in the menus, add it to `_content/_data/services.yml`:

   ```yaml
     - slug: sandblasting
       title: Sandblasting & Surface Preparation
       short: One short sentence for the card.
       icon: spray
   ```

**Icon names you can use:** `roller`, `floor`, `lines`, `spray`, `steel`,
`rope`, `build`, `repair`, `calendar`, `clock`, `crew`, `shutdown`, `shield`,
`phone`.

---

## 🗂️ The other settings files

| File | What it controls |
|---|---|
| `_content/_data/site.yml` | Phone, email, address, hours, form key, SEO |
| `_content/_data/services.yml` | The 9 services, the industries you cover |
| `_content/_data/credentials.yml` | Insurance, accreditations, the 4 big numbers, the 3 reasons |
| `_content/_data/nav.yml` | Menu, service areas, the 7-step process |

**To delete a service or an area:** delete its whole block — everything from the
line starting `-` to the line before the next `-`. Keep the indentation.

---

## 🧮 The quote calculator

The Contact page has a **cost checker**: pick the job and it shows an
indicative price range in about twenty seconds, then asks for details.

**It is switched off at the moment, on purpose.** Open
`_content/_data/pricing.yml` and you will find placeholder rates and:

```yaml
configured: false
```

While that says `false`, the site shows *"Not ready to publish prices yet"*
instead of a number. It will never publish a price you have not approved.

### Turning it on

1. Open `_content/_data/pricing.yml`
2. Work out your real rates — the top of that file explains how (use the
   **median of your last ten jobs**, not the average)
3. Replace every rate
4. Change `configured: false` to `configured: true`
5. Commit

> ⚠️ **Err wide.** Too low and you win work you cannot afford, then quote out of
> pocket when it turns out to need more preparation. Too tight and nobody
> bothers. When in doubt, widen the range.

---

## 🧩 Testimonials

There are no testimonials on the site yet, on purpose. Invented quotes from
invented clients would make the site look fake to exactly the people you need
to convince.

When you have a real one, ask a happy client something like:

> "Would you put in writing a sentence or two about how we did? I'd like to
> put it on our website with your name and company."

Nearly everyone says yes. Put the quote in a card like the others in
`_content/home.njk`, and use the customer's exact words.

---

## 📧 Changing where the quote form sends to

You do not need to touch any code.

1. Sign in at **https://web3forms.com**
2. Open your form's dashboard
3. Change the destination email
4. Save

The new address starts receiving enquiries straight away.

---

## 🚨 If something breaks

**An edit did not appear**
Wait two minutes and refresh. Builds take about a minute. On a phone, pull
down to refresh.

**The site shows raw text like `{{ site.name }}`**
You typed over some code. Press **Ctrl + Z** (or the undo arrow) repeatedly
until it comes back, then commit.

**The website is a big red error page**
Go to the **Actions** tab → click the most recent run → scroll to the bottom →
read the red lines. They name the file and the problem. Fix it on GitHub, or
press the **Revert** button on the file to undo the last change.

**The site is completely gone**
**Actions** tab → click the last green run → **Re-run all jobs**.

**Someone edited it and broke it**
Every change has history. Open the file → **History** → click the version from
before it broke → **Restore this version**.

---

## 🧭 Where everything is

```
_content/                          ← YOUR FILES. Everything you edit is here.
├── _data/
│   ├── site.yml                  phone, email, address, hours, form key
│   ├── services.yml              services and industries
│   ├── credentials.yml           insurance, accreditations, key numbers
│   └── nav.yml                   menu, areas, the 7-step process
├── _includes/                    ← TEMPLATES. Do not edit.
├── home.njk about.njk …          ← your main pages (HTML)
├── services/*.md                 ← service pages (Markdown)
├── projects/*.md                 ← one file per project (Markdown)
└── services/index.njk            ← the services list page

assets/                           photos, logo, stylesheet, script
.github/workflows/                automatic publishing

MAINTENANCE.md                    ← this file
TO-FILL-IN-BEFORE-LAUNCH.md       ← what to do before going live
```

---

**Small, regular updates beat rare big ones — and every real photo you add is
the single best thing you can do for this website.**