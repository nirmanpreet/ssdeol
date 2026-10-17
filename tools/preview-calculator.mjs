/**
 * Preview the calculator with rates switched on, without leaving any change
 * behind. pricing.yml is rewritten, the screenshot taken, then the original
 * file is restored in a `finally` block — so this cannot accidentally publish
 * placeholder prices.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PRICING = '_content/_data/pricing.yml';
const original = readFileSync(PRICING, 'utf8');
const URL = 'http://localhost:8080/ssdeol/contact/';

try {
  writeFileSync(PRICING, original.replace(/^configured:\s*\w+/m, 'configured: true'));
  console.log('  rates switched ON temporarily…');

  // Give the dev server's watcher a moment to rebuild.
  await new Promise((r) => setTimeout(r, 2500));

  mkdirSync('.qa-screenshots', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  await page.goto(URL, { waitUntil: 'networkidle' });

  const visible = await page.isVisible('[data-calc-form]');
  console.log(`  calculator visible: ${visible}`);

  if (visible) {
    await page.selectOption('[data-calc="service"]', 'commercial-repainting');
    await page.selectOption('[data-calc="property"]', 'warehouse');
    await page.selectOption('[data-calc="size"]', '5000');
    await page.selectOption('[data-calc="timing"]', 'out-of-hours');
    await page.waitForTimeout(300);

    const figure = await page.locator('.calc__figure').first().textContent();
    console.log(`  example figure    : ${figure.replace(/\s+/g, ' ').trim()}`);

    // Centre the calculator rather than scrolling it to the very top, so the
    // heading is not tucked under the sticky header in the capture.
    await page.locator('.calc').evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy({ top: r.top - 180, behavior: 'instant' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: '.qa-screenshots/dev-calculator-on.png' });
    console.log('  captured -> .qa-screenshots/dev-calculator-on.png');
  }

  await browser.close();
} finally {
  writeFileSync(PRICING, original);
  console.log('  pricing.yml restored — configured: false');
}