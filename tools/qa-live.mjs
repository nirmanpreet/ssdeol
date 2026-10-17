/**
 * Final check against the REAL deployed site on GitHub Pages.
 *
 * Run after any deploy:  node tools/qa-live.mjs
 *
 * Loads the production URL in a browser rather than a local server, because
 * the failure this guards against only ever appears in production — a project
 * site served from /<repo>/ where root-absolute asset paths resolve to the
 * domain root and 404.
 */
import { chromium } from 'playwright';

const BASE = process.env.SITE_URL ?? 'https://nirmanpreet.github.io/ssdeol';

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
  // Web3Forms refuses to run its captcha on localhost by design; on production
  // it should be running, so this stays a real failure here.
  if (m.type() === 'error') errors.push(t);
});
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) bad.push(`${r.status()} ${r.url()}`);
});

console.log(`\nLIVE SITE QA   ${BASE}\n`);

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
if (calc.web3forms) ok('Web3Forms spam script loaded');
else fail('Web3Forms spam script missing — the form has no spam protection');

// 7. Internal notes must never leak. Genuine [PLACEHOLDER] tokens are a known
//    pre-launch blocker (the owner has not supplied contact details yet), so
//    they are reported separately rather than buried among real regressions.
const LEAKS = [
  [/site owner/gi, 'internal note'],
  [/draft:\s*true/gi, 'draft note'],
  [/pricing\.yml/gi, 'config file reference'],
  [/_content\/|Eleventy/gi, 'stack jargon'],
];
const seen = new Set();
const placeholders = new Set();
let pages = 0;

for (const p of ['/', '/services/', '/about/', '/projects/', '/contact/', '/service-areas/', '/privacy/']) {
  const t = await (await fetch(BASE + p, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  pages++;
  for (const [re, label] of LEAKS) if (re.test(t)) seen.add(`${label} on ${p}`);
  for (const m of t.matchAll(/\[PLACEHOLDER[^:\]]*:?\s*([^\]]{0,40})/g)) {
    placeholders.add(m[1].trim().replace(/[",].*$/, ''));
  }
}

if (seen.size) [...seen].forEach((s) => fail(`leaked ${s}`));
else ok('no internal notes, stack jargon or config references on any public page');

if (placeholders.size) {
  console.log('');
  console.log('  OUTSTANDING (pre-launch, tracked in TO-FILL-IN-BEFORE-LAUNCH.md):');
  [...placeholders].forEach((p) => console.log(`    · ${p}`));
  console.log(`    The site is LIVE but every "Call now" button still dials a placeholder.`);
} else {
  ok('no placeholder contact details remain — ready to launch');
}

await browser.close();

console.log('\n' + '='.repeat(58));
console.log(failures === 0 ? '  LIVE SITE PASSED' : `  ${failures} FAILURE(S)`);
console.log('='.repeat(58) + '\n');
process.exit(failures === 0 ? 0 : 1);