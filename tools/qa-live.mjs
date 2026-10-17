/**
 * Checks any deployed or local build in a real browser.
 *
 *   node tools/qa-live.mjs                                    → production
 *   node tools/qa-live.mjs http://localhost:8080/ssdeol       → dev server
 *   SITE_URL=... node tools/qa-live.mjs                       → env var
 *
 * Run against production after every deploy: it asserts the stylesheet
 * applied, the JavaScript ran, nothing 404s, no content is stuck invisible,
 * the calculator is still honestly disabled, and no internal notes leaked.
 *
 * It loads the page rather than reading the HTML because the outage this guards
 * against produced perfectly correct HTML that referenced assets which 404'd —
 * only a browser notices.
 */
import { chromium } from 'playwright';

const DEFAULT_PRODUCTION = 'https://nirmanpreet.github.io/ssdeol';
const arg = process.argv.find((a) => a.startsWith('http'));
const BASE = (arg ?? process.env.SITE_URL ?? DEFAULT_PRODUCTION).replace(/\/$/, '');
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

let failures = 0;
const fail = (m) => { failures++; console.log(`  [FAIL] ${m}`); };
const ok = (m) => console.log(`  [ OK ] ${m}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
const bad = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  const t = m.text();
  // Web3Forms refuses to run its captcha on localhost by design, and logs it as
  // a console error. That is expected locally and is a real failure in
  // production, so it is only ignored for local targets.
  if (IS_LOCAL && /localhost detected/i.test(t)) return;
  if (m.type() === 'error') errors.push(t);
});
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) bad.push(`${r.status()} ${r.url()}`);
});

console.log(`\nSITE QA   ${BASE}\n`);

await page.goto(BASE + '/', { waitUntil: 'networkidle' });

// 1. Did the stylesheet actually apply?
const css = await page.evaluate(() => {
  const sheet = [...document.styleSheets].find((s) => (s.href ?? '').includes('main.css'));
  let rules = 0;
  try { rules = sheet ? sheet.cssRules.length : 0; } catch { rules = -1; }
  return { rules, font: getComputedStyle(document.body).fontFamily };
});
if (css.rules > 50) ok(`stylesheet applied — ${css.rules} rules`);
else fail(`stylesheet did NOT apply (${css.rules} rules) — the site is unstyled`);
if (/Inter|Barlow/.test(css.font)) ok(`webfonts active — ${css.font.split(',')[0]}`);
else fail(`body is not using the loaded font: ${css.font}`);

// 2. Did main.js execute?
const nav = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await nav.goto(BASE + '/', { waitUntil: 'networkidle' });
await nav.click('[data-nav-toggle]');
await nav.waitForTimeout(400);
const expanded = await nav.getAttribute('[data-nav-toggle]', 'aria-expanded').catch(() => null);
if (expanded === 'true') ok('main.js executed — mobile menu opens');
else fail('mobile menu did not open — main.js is NOT running');
await nav.close();

// 3. Nothing 404'd.
if (bad.length) bad.forEach((b) => fail(`404: ${b}`));
else ok('every resource on the homepage loaded');

// 4. No page errors.
if (errors.length) errors.forEach((e) => fail(`JS error: ${e}`));
else ok('no JavaScript errors');

// 5. Scroll-reveal must not strand content invisible.
await page.evaluate(async () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  for (let y = 0; y <= max; y += Math.round(window.innerHeight * 0.7)) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 80));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await new Promise((r) => setTimeout(r, 400));
});
const stuck = await page.evaluate(() =>
  [...document.querySelectorAll('[data-reveal]')]
    .filter((el) => Number(getComputedStyle(el).opacity) < 0.9)
    .map((el) => el.className)
);
if (stuck.length) stuck.forEach((c) => fail(`content stuck invisible: ${c}`));
else ok('all sections visible after scrolling — nothing stranded at opacity 0');

// 6. The calculator must be present and honestly disabled.
await page.goto(BASE + '/contact/', { waitUntil: 'networkidle' });
const calc = await page.evaluate(() => ({
  configured: JSON.parse(document.querySelector('[data-calculator-config]')?.textContent ?? '{}').configured,
  formVisible: !!document.querySelector('[data-calc-form]') && getComputedStyle(document.querySelector('[data-calc-form]')).display !== 'none',
  figureCount: document.querySelectorAll('.calc__figure').length,
  web3forms: !!document.querySelector('script[src*="web3forms.com/client/script.js"]'),
}));
if (calc.formVisible === false && calc.figureCount === 0) ok('calculator is correctly OFF — no price invented');
else fail(`calculator is live with unconfigured placeholder rates (figures: ${calc.figureCount})`);
if (calc.web3forms) ok('Web3Forms spam script present');
else fail('Web3Forms spam script missing — the form has no spam protection');

// 7. Internal notes must never leak in production.
const LEAKS = [
  [/site owner/gi, 'internal note'],
  [/draft:\s*true/gi, 'draft note'],
  [/pricing\.yml/gi, 'config file reference'],
  [/_content\/|Eleventy/gi, 'stack jargon'],
];
const seen = new Set();
const placeholders = new Set();

for (const p of ['/', '/services/', '/about/', '/projects/', '/contact/', '/service-areas/', '/privacy/']) {
  const t = await (await fetch(BASE + p, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();

  if (IS_LOCAL) {
    // The dev server deliberately renders the "note for the site owner" block
    // (it is gated behind isLocal). That is correct behaviour here — confirm it
    // is present rather than treating it as a leak.
    continue;
  }

  for (const [re, label] of LEAKS) if (re.test(t)) seen.add(`${label} on ${p}`);
  for (const m of t.matchAll(/\[PLACEHOLDER[^:\]]*:?\s*([^\]]{0,40})/g)) {
    placeholders.add(m[1].trim().replace(/[",].*$/, ''));
  }
}

if (IS_LOCAL) {
  const projects = await (await fetch(BASE + '/projects/', { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const notesVisible = /site owner/i.test(projects);
  console.log('');
  console.log(`  Local dev server: the "note for the site owner" block on /projects/ is`);
  console.log(`  ${notesVisible ? 'visible' : 'NOT visible'}. That is intentional — it is gated behind`);
  console.log('  isLocal and never reaches the published site.');
} else {
  if (seen.size) [...seen].forEach((s) => fail(`leaked ${s}`));
  else ok('no internal notes, stack jargon or config references on any public page');

  if (placeholders.size) {
    console.log('');
    console.log('  OUTSTANDING (pre-launch, tracked in TO-FILL-IN-BEFORE-LAUNCH.md):');
    [...placeholders].forEach((p) => console.log(`    · ${p}`));
    console.log('    Every "Call now" button still dials a placeholder.');
  } else {
    ok('no placeholder contact details remain — ready to launch');
  }
}

await browser.close();

console.log('\n' + '='.repeat(58));
console.log(failures === 0 ? '  LIVE SITE PASSED' : `  ${failures} FAILURE(S)`);
console.log('='.repeat(58) + '\n');
process.exit(failures === 0 ? 0 : 1);