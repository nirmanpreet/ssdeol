// Capture the dev server so you can see what it renders.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = (process.argv[2] ?? 'http://localhost:8080/ssdeol') + '/contact/';
await mkdir('.qa-screenshots', { recursive: true });

const browser = await chromium.launch();

// Desktop
const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await desktop.goto(url, { waitUntil: 'networkidle' });
await desktop.evaluate(async () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  for (let y = 0; y <= max; y += Math.round(window.innerHeight * 0.7)) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 70));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await new Promise((r) => setTimeout(r, 400));
});
await desktop.screenshot({ path: '.qa-screenshots/dev-contact.png', fullPage: true });

// Mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mobile.goto(url, { waitUntil: 'networkidle' });
await mobile.screenshot({ path: '.qa-screenshots/dev-contact-mobile.png', fullPage: true });

await browser.close();
console.log('  captured -> .qa-screenshots/dev-contact.png');
console.log('               .qa-screenshots/dev-contact-mobile.png');