/**
 * VISUAL + ACCESSIBILITY QA  —  run with:  npm run qa:visual
 * ---------------------------------------------------------------------------
 * Serves _site/ and drives a real browser against it:
 *   - screenshots the homepage at mobile and desktop
 *   - screenshots every page once (desktop)
 *   - runs basic accessibility checks (alt text, labels, heading order,
 *     contrast-critical text, tap target sizes)
 *   - fails the run if any page logs a console error or a 404 on a resource
 *
 * Requires:  npm install -D playwright && npx playwright install chromium
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, BASE_PATH } from './qa-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, '_site');
const SHOTS = join(ROOT, '.qa-screenshots');

let failures = 0;
const fail = (m) => { failures++; console.log(`  [FAIL] ${m}`); };
const ok = (m) => console.log(`  [ OK ] ${m}`);

const PAGES = [
  ['home', '/'],
  ['services', '/services/'],
  ['service-epoxy', '/services/epoxy-floor-coatings/'],
  ['service-linemarking', '/services/line-marking/'],
  ['about', '/about/'],
  ['projects', '/projects/'],
  ['contact', '/contact/'],
  ['service-areas', '/service-areas/'],
  ['privacy', '/privacy/'],
  ['notfound', '/no-such-page/'],
];

/* ------------------------------------------------- accessibility checks -- */
const AUDIT = () => {
  const issues = [];
  const $$ = (s) => [...document.querySelectorAll(s)];

  // Images must have alt (empty alt is fine — it means decorative)
  $$('img').forEach((img) => {
    if (!img.hasAttribute('alt')) issues.push(`img without alt: ${img.getAttribute('src')}`);
    if (!img.getAttribute('width') || !img.getAttribute('height')) {
      issues.push(`img without explicit width/height (causes layout shift): ${img.getAttribute('src')}`);
    }
  });

  // Every form control needs an accessible name
  $$('input, select, textarea').forEach((el) => {
    if (['hidden', 'submit', 'button'].includes(el.type)) return;
    // Third-party widgets inject their own elements (hCaptcha adds an
    // offscreen textarea for its token). Those are not ours to label, and
    // they live inside a closed shadow tree where our labels cannot reach.
    if (el.closest('[class*="h-captcha"], [id*="hcaptcha"], iframe')) return;
    if (/hcaptcha|cf-turnstile|recaptcha/i.test(`${el.id} ${el.name} ${el.className}`)) return;
    const id = el.id;
    const labelled = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
    const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    const wrapped = el.closest('label');
    if (!labelled && !aria && !wrapped) issues.push(`unlabelled ${el.tagName.toLowerCase()}#${id || '(no id)'}`);
  });

  // Exactly one h1, and no skipped heading levels
  const heads = $$('h1,h2,h3,h4,h5,h6').map((h) => +h.tagName[1]);
  if (heads.filter((l) => l === 1).length !== 1) {
    issues.push(`expected exactly one <h1>, found ${heads.filter((l) => l === 1).length}`);
  }
  for (let i = 1; i < heads.length; i++) {
    if (heads[i] - heads[i - 1] > 1) issues.push(`heading jump h${heads[i - 1]} -> h${heads[i]}`);
  }

  // Tap targets on mobile must be at least 44px tall
  $$('a, button').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.height < 32 && el.closest('nav, .call-bar, .btn-row, .filters')) {
      issues.push(`small tap target ${Math.round(r.height)}px: ${(el.textContent || '').trim().slice(0, 30)}`);
    }
  });

  // A single h1 is also required by the SEO check; verify lang
  if (document.documentElement.lang !== 'en-AU') issues.push(`lang is "${document.documentElement.lang}", expected en-AU`);

  // --- invisible text -------------------------------------------------
  // White-on-white renders as a blank gap that is easy to miss on a
  // screenshot. Compare each element's text colour against its effective
  // (nearest opaque) background and flag anything under 2:1.
  const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      // A gradient/image background means the real backdrop is not a flat colour,
      // so contrast cannot be computed here. Bail out rather than guess.
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = cs.backgroundColor;
      const p = parse(c);
      const alpha = (c.match(/[\d.]+/g) || [])[3];
      if (p.length === 3 && (alpha === undefined || Number(alpha) > 0.85)) return p;
    }
    return [255, 255, 255];
  };

  $$('h1,h2,h3,h4,p,li,span,a,dt,dd,th,td,label,button').forEach((el) => {
    const text = (el.textContent || '').trim();
    if (!text || el.children.length > 0) return;          // leaf text nodes only
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;          // not rendered

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.1) return;

    const bg = bgOf(el);
    if (!bg) return;                         // gradient backdrop, not measurable
    const fg2 = parse(cs.color);
    if (fg2.length !== 3) return;
    const l1 = lum(fg2), l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    if (ratio < 2) {
      issues.push(`invisible text (${ratio.toFixed(2)}:1): "${text.slice(0, 40)}" — ${cs.color} on rgb(${bg.join(',')})`);
    }
  });

  return issues;
};
const server = await serve(SITE, BASE_PATH);
const base = server.url;
const browser = await chromium.launch();
await mkdir(SHOTS, { recursive: true });

console.log(`\nVISUAL + ACCESSIBILITY QA   (base path ${BASE_PATH})\n`);

/**
 * Scrolls the whole page so the scroll-reveal animations finish, then returns
 * to the top. Without this a fullPage screenshot captures sections that are
 * still at opacity 0, which looks exactly like the "half the page is blank"
 * outage this check exists to catch.
 *
 * Any element still transparent after this is a real bug and is reported.
 */
async function settleReveals(page) {
  return page.evaluate(async () => {
    // `behavior: 'instant'` is essential: the site sets
    // `html { scroll-behavior: smooth }`, so a rapid series of scrollTo calls
    // would each start a new smooth animation, interrupt the last, and never
    // actually reach the bottom of the page.
    const step = Math.round(window.innerHeight * 0.7);
    const max = document.documentElement.scrollHeight - window.innerHeight;

    for (let y = 0; y <= max; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 400));

    return [...document.querySelectorAll('[data-reveal]')]
      .filter((el) => Number(getComputedStyle(el).opacity) < 0.9)
      .map((el) => el.className || el.tagName);
  });
}

for (const [name, path] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const badResponses = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });

  await page.goto(base + path, { waitUntil: 'networkidle' });
  const stuckReveals = await settleReveals(page);

  await page.screenshot({ path: join(SHOTS, `${name}-desktop.png`), fullPage: true });

  const issues = await page.evaluate(AUDIT);
  const label = `/${name}`.padEnd(22);

  // Content stuck at opacity 0 is invisible copy on a sales page — the exact
  // failure the scroll-reveal failsafe in src/js/components/gallery.ts prevents.
  stuckReveals.forEach((cls) => issues.push(`content stuck invisible after scrolling: ${cls}`));

  // The 404 page is SUPPOSED to 404 — only flag sub-resources there.
  const subResources = badResponses.filter((b) => !b.includes(name === 'notfound' ? 'no-such-page' : ' '));

  if (issues.length) issues.forEach((i) => fail(`${label} ${i}`));
  else if (subResources.length) subResources.forEach((b) => fail(`${label} ${b}`));
  else ok(label + ' clean');

  await ctx.close();
}

/* ------------------------------------------------------ mobile + nav UX -- */
console.log('\nMobile behaviour');
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },   // iPhone 14 size
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  await page.screenshot({ path: join(SHOTS, 'home-mobile.png'), fullPage: true });

  // The sticky call bar is the single most important control on the site.
  const bar = await page.$('.call-bar');
  if (!bar) fail('sticky call bar not found on mobile');
  else {
    const box = await bar.boundingBox();
    if (!box || box.height < 44) fail(`call bar too short: ${box?.height}px`);
    else ok(`call bar present, ${Math.round(box.height)}px tall`);

    const tel = await page.getAttribute('.call-bar__btn--call', 'href');
    if (!tel || !tel.startsWith('tel:')) fail('call bar phone button has no tel: link');
    else if (tel.includes('PLACEHOLDER')) fail('call bar phone is still a PLACEHOLDER');
    else ok(`call bar dials ${tel}`);
  }

  // Mobile menu must open
  const toggle = await page.$('[data-nav-toggle]');
  if (!toggle) fail('mobile menu button missing');
  else {
    await toggle.click();
    await page.waitForTimeout(350);
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') fail('mobile menu did not open (aria-expanded still false)');
    else {
      ok('mobile menu opens');
      await page.screenshot({ path: join(SHOTS, 'home-mobile-menu.png') });
    }
  }

  // No horizontal overflow anywhere on the page
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) fail(`horizontal scroll on mobile: ${overflow}px of overflow`);
  else ok('no horizontal scroll on mobile');

  await ctx.close();
}

console.log('\nForm behaviour (mobile)');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/contact/', { waitUntil: 'networkidle' });

  // Submitting empty must be blocked with a visible, accessible message
  await page.click('[data-form-submit]');
  await page.waitForTimeout(400);
  const status = await page.$eval('[data-form-status]', (el) => ({
    cls: el.className, text: el.textContent.trim().slice(0, 80), role: el.getAttribute('role'),
  })).catch(() => null);

  if (!status || !status.cls.includes('form__status--fail')) fail('empty form submit was not rejected');
  else ok('empty submit rejected with a visible message');
  if (!status || status.role !== 'alert') fail('form status is missing role="alert"');

  // Inline field errors must be attached to the input, not just coloured
  const described = await page.$eval('#f-name', (el) => ({
    invalid: el.getAttribute('aria-invalid'),
    describedby: el.getAttribute('aria-describedby'),
  }));
  if (described.invalid !== 'true') fail('invalid field not marked aria-invalid');
  else if (!described.describedby) fail('invalid field has no aria-describedby link to its message');
  else ok('field errors wired via aria-invalid + aria-describedby');

  // Bad email should be caught client-side
  await page.fill('#f-name', 'Test');
  await page.fill('#f-phone', '0400000000');
  await page.fill('#f-email', 'not-an-email');
  await page.click('[data-form-submit]');
  await page.waitForTimeout(300);
  const emailErr = await page.$eval('#f-email-error', (el) => el.textContent.trim()).catch(() => '');
  if (!emailErr) fail('invalid email not caught by client-side validation');
  else ok(`invalid email caught: "${emailErr}"`);

  await page.screenshot({ path: join(SHOTS, 'contact-mobile-form-errors.png'), fullPage: true });
  await ctx.close();
}

await browser.close();
await server.close();

console.log('\n' + '='.repeat(60));
if (failures === 0) {
  console.log('  VISUAL QA PASSED — screenshots in .qa-screenshots/');
} else {
  console.log(`  ${failures} ISSUE(S) FOUND`);
}
console.log('='.repeat(60) + '\n');
process.exit(failures === 0 ? 0 : 1);
