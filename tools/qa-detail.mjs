// Section-by-section screenshots at readable resolution, for design review.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, '_site');
const OUT = join(ROOT, '.qa-screenshots/detail');
const PORT = 8124;

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = join(SITE, url);
  if (existsSync(file) && (await stat(file)).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(PORT, r));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

// Report the actual computed grid columns so layout problems are measurable,
// not guessed at from a screenshot.
const layout = await page.evaluate(() => {
  const out = {};
  const probe = (label, sel) => {
    const el = document.querySelector(sel);
    if (!el) return (out[label] = 'NOT FOUND');
    const cs = getComputedStyle(el);
    out[label] = {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      children: el.children.length,
      width: Math.round(el.getBoundingClientRect().width),
    };
  };
  probe('services grid', '.card-grid');
  probe('pillars', '.pillars');
  probe('trust strip', '.trust-strip__list');
  probe('cards', '.service-card');
  return out;
});
console.log(JSON.stringify(layout, null, 2));

// Scroll through in viewport-sized frames.
const shots = ['hero', 'services', 'pillars', 'noshutdown', 'industries', 'steps', 'credentials', 'cta', 'footer'];
for (const name of shots) {
  const found = await page.evaluate((n) => {
    const map = {
      hero: 'section.hero', services: '.card-grid', pillars: '.pillars',
      noshutdown: '.checks', industries: '.chips', steps: '.steps',
      credentials: '.cred-table, .plain-card', cta: '.cta-band', footer: '.site-footer',
    };
    const el = document.querySelector(map[n]);
    if (!el) return false;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy(0, -90);
    return true;
  }, name);
  if (!found) continue;
  await page.waitForTimeout(220);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

await browser.close();
server.close();
console.log('\nDetail shots ->', OUT);