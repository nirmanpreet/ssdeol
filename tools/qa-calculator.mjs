/**
 * QUOTE CALCULATOR — behaviour test in a real browser.
 *
 * Verifies both states the calculator can be in:
 *
 *   A. UNCONFIGURED (pricing.yml `configured: false`)
 *      The calculator must REFUSE to produce a number and fall back to the
 *      enquiry form. This is the test that matters: the site must never
 *      invent a price it cannot stand behind.
 *
 *   B. CONFIGURED
 *      It must produce a plausible range, respond to every input, get dearer
 *      for bigger / harder / out-of-hours jobs, and always show its caveats.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, BASE_PATH } from './qa-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, '_site');
// `npx` is not an executable on Windows and Eleventy exports neither its CLI
// entry nor its package.json, so resolve the command from node_modules directly.
const ELEVENTY_CMD = join(ROOT, 'node_modules/@11ty/eleventy/cmd.cjs');
const PRICING = join(ROOT, '_content/_data/pricing.yml');

let failures = 0;
const fail = (m) => { failures++; console.log(`  [FAIL] ${m}`); };
const ok = (m) => console.log(`  [ OK ] ${m}`);

// Same base path the real deployment uses — serving at the wrong base is what
// made the live site render unstyled, so the harness must mirror it.
const server = await serve(SITE, BASE_PATH);
const base = server.url;

const originalPricing = readFileSync(PRICING, 'utf8');
const browser = await chromium.launch();

function rebuild() {
  // Eleventy caches data files, so clear it or the page keeps the old value.
  rmSync(join(ROOT, '.cache'), { recursive: true, force: true });
  execFileSync(process.execPath, [ELEVENTY_CMD, '--quiet'], { cwd: ROOT, stdio: 'ignore' });
}

function setConfigured(on) {
  writeFileSync(PRICING, originalPricing.replace(/^configured:\s*\w+/m, `configured: ${on}`));
  rebuild();
  const built = readFileSync(join(SITE, 'contact/index.html'), 'utf8');
  const found = built.match(/"configured":(\w+)/)?.[1];
  if (found !== String(on)) throw new Error(`rebuild stale: wanted ${on}, built ${found}`);
}

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
      // Web3Forms refuses to run its captcha on localhost by design.
      const t = m.text();
      if (m.type() === 'error' && !/localhost detected/i.test(t)) errors.push(t);
    });
  return { page, errors };
}

/** Reads the figure out of the result panel; null when there is no figure. */
async function readFigure(page) {
  const loc = page.locator('.calc__figure').first();
  if ((await loc.count()) === 0) return null;
  const text = (await loc.textContent().catch(() => '')) ?? '';
  // Match each money amount separately — stripping all non-digits instead
  // would run "$19,800–$49,500" together into a single nonsense number.
  const amounts = [...text.matchAll(/\$([\d,.]+)/g)].map((m) => Number(m[1].replace(/[^\d.]/g, '')));
  if (!amounts.length) return null;
  return { low: amounts[0], high: amounts[1] ?? amounts[0], text: text.replace(/\s+/g, ' ').trim() };
}

const textOf = async (page, sel) => (await page.locator(sel).first().textContent().catch(() => '')) ?? '';

try {
  /* ==================================================== A: unconfigured == */
  console.log('\nA. UNCONFIGURED — the site must refuse to invent a price');
  setConfigured(false);
  {
    const { page, errors } = await newPage();
    await page.goto(`${base}contact/`, { waitUntil: 'networkidle' });

    if (await page.isVisible('[data-calc-form]')) fail('calculator visible with no rates configured');
    else ok('calculator is hidden');

    if (!(await page.isVisible('[data-calc-unconfigured]'))) fail('the honest "rates not ready" notice is missing');
    else ok('the honest "rates not ready" notice is shown instead');

    if (await page.locator('.calc__figure').count()) fail('a price figure rendered without configured rates');
    else ok('no price figure anywhere on the page');

    if ((await textOf(page, 'body')).match(/\$\d[\d,]*\s*[-–]\s*\$?\d/)) {
      fail('page shows something that looks like a price range');
    } else ok('no price range leaked into the copy');

    errors.forEach((e) => fail('JS error: ' + e));
    await page.close();
  }

  /* ==================================================== B: configured === */
  console.log('\nB. CONFIGURED — the calculator must work');
  setConfigured(true);
  {
    const { page, errors } = await newPage();
    await page.goto(`${base}contact/`, { waitUntil: 'networkidle' });

    if (!(await page.isVisible('[data-calc-form]'))) {
      fail('calculator did not appear after enabling rates');
      errors.forEach((e) => fail('JS error: ' + e));
      await page.close();
    } else {
      ok('calculator appeared');
      await page.selectOption('[data-calc="service"]', 'commercial-repainting');
      await page.selectOption('[data-calc="size"]', '1000');

      const small = await readFigure(page);
      if (!small) fail('no figure for a 1,000 m² repaint');
      else ok(`1,000 m² repaint → ${small.text}`);

      await page.selectOption('[data-calc="size"]', '15000');
      const large = await readFigure(page);
      if (!large) fail('no figure for the larger job');
      else if (large.low <= small.low) fail(`bigger job not dearer: ${large.low} <= ${small.low}`);
      else ok(`15,000 m² → ${large.text} (correctly dearer)`);

      await page.selectOption('[data-calc="size"]', '1000');
      await page.selectOption('[data-calc="service"]', 'epoxy-floor-coatings');
      const epoxy = await readFigure(page);
      if (!epoxy) fail('no figure for epoxy flooring');
      else if (epoxy.low === small.low) fail('epoxy priced identically to repainting');
      else ok(`epoxy, same size → ${epoxy.text} (service affects price)`);

      await page.selectOption('[data-calc="service"]', 'commercial-repainting');
      const day = await readFigure(page);
      await page.selectOption('[data-calc="timing"]', 'out-of-hours');
      const night = await readFigure(page);
      if (!day || !night) fail('missing figure for the timing comparison');
      else if (night.low <= day.low) fail(`after-hours not dearer: ${night.low} <= ${day.low}`);
      else ok(`after-hours → ${night.text} (premium applied)`);

      await page.selectOption('[data-calc="timing"]', 'normal');
      await page.fill('[data-calc="area"]', '3000');
      await page.dispatchEvent('[data-calc="area"]', 'input');
      const exact = await readFigure(page);
      const basis = await textOf(page, '.calc__basis');
      if (!exact) fail('no figure after typing an exact area');
      else if (!basis.includes('3,000')) fail(`exact area not reflected in "${basis}"`);
      else ok(`exact 3,000 m² → ${exact.text} (area override works)`);

      await page.fill('[data-calc="area"]', '');
      await page.dispatchEvent('[data-calc="area"]', 'input');
      await page.selectOption('[data-calc="property"]', 'warehouse');
      const wh = await readFigure(page);
      await page.selectOption('[data-calc="property"]', 'aged-care');
      const ac = await readFigure(page);
      if (!wh || !ac) fail('missing property comparison');
      else if (ac.low <= wh.low) fail(`aged care not dearer than warehouse: ${ac.low} <= ${wh.low}`);
      else ok(`property factors work (warehouse ${wh.low} vs aged care ${ac.low})`);

      const caveats = await page.locator('.calc__caveats li').count();
      if (caveats < 2) fail(`only ${caveats} disclaimer(s) shown with the price`);
      else ok(`${caveats} disclaimers shown alongside every figure`);

      const eyebrow = await textOf(page, '.calc__eyebrow');
      if (!/indicative/i.test(eyebrow)) fail(`figure not labelled indicative (got "${eyebrow}")`);
      else ok('figure is labelled INDICATIVE');

      await page.selectOption('[data-calc="property"]', 'office');
      await page.selectOption('[data-calc="size"]', '250');
      const tiny = await readFigure(page);
      if (!tiny || tiny.low < 500) fail(`a small job quotes an implausible ${tiny?.low}`);
      else ok(`small job respects the minimum charge (${tiny.low})`);

      // The estimate must be carried into the enquiry form, so the office knows
      // what the visitor was shown without having to guess.
      const summary = await page.getAttribute('[data-calc-summary]', 'value').catch(() => '');
      if (!summary) fail('the estimate is not passed through to the enquiry form');
      else ok(`estimate passed to the form: "${summary}"`);

      errors.forEach((e) => fail('JS error: ' + e));
      if (!errors.length) ok('no JavaScript errors during the whole run');
      await page.close();
    }
  }
} finally {
  writeFileSync(PRICING, originalPricing);
  rebuild();
  await browser.close();
  await server.close();
}

console.log('\n' + '='.repeat(58));
console.log(failures === 0 ? '  CALCULATOR PASSED' : `  ${failures} FAILURE(S)`);
console.log('='.repeat(58) + '\n');
process.exit(failures === 0 ? 0 : 1);