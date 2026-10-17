/**
 * Did the CSS and JavaScript actually LOAD and RUN?
 *
 * This check exists because of a real outage: the live site was serving
 * correctly-formed HTML that referenced /assets/css/main.css, but on
 * github.io/<repo>/ that URL 404s, so the page rendered completely unstyled
 * with no JavaScript — while every link-checking tool still passed, because the
 * HTML *referenced* the file correctly.
 *
 * Checking "the HTML mentions main.css" proves nothing. This loads the page in a
 * real browser and asserts the stylesheet actually applied and the script
 * actually ran.
 */
import { chromium } from 'playwright';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, BASE_PATH } from './qa-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (m) => { failures++; console.log(`  [FAIL] ${m}`); };
const ok = (m) => console.log(`  [ OK ] ${m}`);

const server = await serve(join(ROOT, '_site'), BASE_PATH);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const notFound = [];
page.on('response', (r) => {
  if (r.status() === 404 && !r.url().includes('favicon')) notFound.push(r.url());
});

console.log(`\nServing _site at ${server.url}  (base path ${BASE_PATH})\n`);

await page.goto(server.url, { waitUntil: 'networkidle' });

// 1. Did the stylesheet load AND apply?
const css = await page.evaluate(() => {
  const body = getComputedStyle(document.body);
  const sheet = [...document.styleSheets].find((s) => (s.href ?? '').includes('main.css'));
  return {
    rulesParsed: sheet ? (() => { try { return sheet.cssRules.length; } catch { return -1; } })() : 0,
    fontFamily: body.fontFamily,
    maxWidth: getComputedStyle(document.querySelector('.wrap') ?? document.body).maxWidth,
    background: body.backgroundColor,
  };
});
if (css.rulesParsed < 50) fail(`stylesheet did not apply (${css.rulesParsed} rules parsed)`);
else ok(`stylesheet applied — ${css.rulesParsed} rules`);

if (/Inter|Barlow/.test(css.fontFamily)) ok(`custom fonts active — ${css.fontFamily.split(',')[0]}`);
else fail(`body is not using the loaded font: ${css.fontFamily}`);

if (css.maxWidth !== 'none' && parseFloat(css.maxWidth) > 900) ok(`layout container constrained (${css.maxWidth})`);
else fail(`.wrap has no max-width — the stylesheet is not applying`);

// 2. Did the JavaScript load AND run?
const js = await page.evaluate(() => ({
  jsClass: document.documentElement.classList.contains('js'),
  calculatorWired: !!document.querySelector('[data-calculator-config]'),
  bundleRan: typeof window.matchMedia === 'function',
}));
if (js.jsClass) ok('inline bootstrap ran (html.js set)');
else fail('inline bootstrap script did not run');

// 3. Did the nav toggle get wired up? (proves main.js executed and attached)
const nav = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await nav.goto(server.url, { waitUntil: 'networkidle' });
await nav.click('[data-nav-toggle]');
await nav.waitForTimeout(300);
const expanded = await nav.getAttribute('[data-nav-toggle]', 'aria-expanded');
if (expanded === 'true') ok('main.js executed — mobile menu wired up and opens');
else fail('mobile menu did not open: main.js is not running');
await nav.close();

// 4. Fonts actually downloaded?
const fontsOk = await page.evaluate(async () => {
  await document.fonts.ready;
  return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
});
if (fontsOk.length) ok(`webfonts loaded — ${[...new Set(fontsOk)].join(', ')}`);
else fail('no webfonts loaded');

// 5. Nothing 404'd
if (notFound.length) notFound.forEach((u) => fail(`404: ${u}`));
else ok('every resource on the page loaded (no 404s)');

await browser.close();
await server.close();

console.log('\n' + '='.repeat(58));
console.log(failures === 0 ? '  ASSETS LOAD CORRECTLY' : `  ${failures} FAILURE(S)`);
console.log('='.repeat(58) + '\n');
process.exit(failures === 0 ? 0 : 1);