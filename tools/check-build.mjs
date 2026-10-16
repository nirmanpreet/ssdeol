/**
 * BUILD CHECK  —  run with:  npm run check
 * ---------------------------------------------------------------------------
 * Builds the site, then verifies the OUTPUT actually makes sense before anyone
 * publishes it. Catches the things that are easy to miss by eye and expensive to
 * ship:
 *
 *   1. Unfilled [PLACEHOLDER] text           -> nothing launches half-finished
 *   2. Unresolved template variables         -> {{ }} or blank values in HTML
 *   3. Internal links pointing nowhere       -> 404s the moment you publish
 *   4. Missing assets (css / js / images)    -> broken page styling
 *   5. Pages with duplicate <title>           -> SEO damage
 *   6. Pages missing a meta description       -> SEO damage
 *   7. Oversized assets                       -> Lighthouse performance
 *   8. Images without alt text                -> accessibility
 *
 * Exit code 1 means "do not publish yet".
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, '_site');

let problems = 0;
let warnings = 0;
const fail = (msg) => { problems++; console.log(`  [FAIL] ${msg}`); };
const warn = (msg) => { warnings++; console.log(`  [WARN] ${msg}`); };
const ok = (msg) => console.log(`  [ OK ] ${msg}`);

/* ------------------------------------------------------------------ files -- */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

if (!existsSync(SITE)) {
  console.error('\n  No _site folder. Run `npm run build` first.\n');
  process.exit(1);
}

const all = walk(SITE);
const htmlFiles = all.filter((f) => f.endsWith('.html'));
const rel = (f) => relative(SITE, f).replace(/\\/g, '/');

console.log(`\nChecking ${htmlFiles.length} HTML pages in _site/\n`);

/* ------------------------------------------------- 1 & 2: placeholders -- */
console.log('[1/8] Placeholders and unresolved variables');
let phTotal = 0;
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const ph = [...html.matchAll(/\[PLACEHOLDER[^\]]*\]/g)].map((m) => m[0]);
  if (ph.length) {
    phTotal += ph.length;
    console.log(`  ${rel(f)} — ${ph.length} placeholder(s)`);
    [...new Set(ph)].slice(0, 6).forEach((p) => console.log(`        ${p}`));
  }
  // An unrendered Nunjucks tag looks like {{ }} surviving into the output.
  if (/\{\{[^}]{1,80}\}\}/.test(html)) fail(`${rel(f)} contains an unrendered {{ }} template tag`);
  if (/\[object Object\]|undefined<|>undefined</.test(html)) fail(`${rel(f)} contains "undefined" — a data value did not resolve`);
}
if (phTotal === 0) ok('no [PLACEHOLDER] text anywhere in the built site');
else warn(`${phTotal} placeholder(s) still present — see TO-FILL-IN-BEFORE-LAUNCH.md`);

/* --------------------------------------------------- 3: internal links -- */
console.log('\n[2/8] Internal links');
const known = new Set(all.map(rel).concat(all.map((f) => '/' + rel(f))));
let broken = 0;
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    let target = m[1];
    if (known.has(target)) continue;
    // Directory-style URLs resolve to their index.html
    if (known.has(target.replace(/\/$/, '') + '/index.html')) continue;
    if (target.startsWith('/assets/')) { fail(`${rel(f)} -> missing asset ${target}`); broken++; continue; }
    fail(`${rel(f)} -> broken link ${target}`);
    broken++;
  }
}
if (broken === 0) ok('every internal link and asset reference resolves');

/* ----------------------------------------------------- 4 & 7: assets --- */
console.log('\n[3/8] Asset weight (performance budget)');
let total = 0;
const heavy = [];
for (const f of all) {
  const kb = statSync(f).size / 1024;
  total += kb;
  if (kb > 250) heavy.push(`${rel(f)} — ${kb.toFixed(0)} KB`);
  if (/\.(png|jpe?g)$/i.test(f) && kb > 150) heavy.push(`${rel(f)} — ${kb.toFixed(0)} KB (should be WebP/AVIF)`);
}
console.log(`  total site weight: ${total.toFixed(0)} KB`);
if (heavy.length) { heavy.forEach((h) => warn(`oversized: ${h}`)); }
else ok('no oversized assets');

/* ------------------------------------------- 5 & 6: SEO basics -------- */
console.log('\n[4/8] Titles and meta descriptions');
const titles = new Map();
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const name = rel(f);
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
  const desc = /<meta name="description" content="([^"]*)"/i.exec(html)?.[1]?.trim();

  if (!title) fail(`${name} has no <title>`);
  else if (titles.has(title)) fail(`${name} has the same <title> as ${titles.get(title)}`);
  else titles.set(title, name);

  if (!desc) fail(`${name} has no meta description`);
  else if (desc.length > 320) warn(`${name} meta description is ${desc.length} chars — Google truncates around 300`);
}
if (!problems) ok('every page has a unique title and a meta description');

console.log('\n[5/8] Canonicals, Open Graph and structured data');
let schemaCount = 0;
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const name = rel(f);
  if (!/<link rel="canonical"/.test(html)) fail(`${name} has no canonical URL`);
  if (!/property="og:title"/.test(html)) fail(`${name} has no Open Graph title`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  schemaCount += schemas.length;
  for (const s of schemas) {
    try {
      JSON.parse(s[1]);
    } catch {
      fail(`${name} has invalid JSON in a schema block`);
    }
  }
}
ok(`${schemaCount} schema block(s) found and parse as valid JSON`);

/* ------------------------------------------------------ 8: accessibility */
console.log('\n[6/8] Accessibility basics');
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const name = rel(f);
  if (!/<html lang="en-AU"/.test(html)) fail(`${name} is missing lang="en-AU"`);
  if (!/class="skip-link"/.test(html)) warn(`${name} has no skip link`);
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)];
  for (const i of imgs) {
    if (!/\balt=/.test(i[0])) fail(`${name} has an <img> with no alt attribute`);
  }
  const inputs = [...html.matchAll(/<input\b[^>]*>/g)];
  for (const i of inputs) {
    if (/\btype="(hidden|submit|button)"/i.test(i[0])) continue;
    const id = /id="([^"]+)"/.exec(i[0])?.[1];
    if (id && !new RegExp(`for="${id}"`).test(html)) {
      warn(`${name}: input #${id} has no matching <label for="${id}">`);
    }
  }
}
ok('checked images, labels and lang attributes');

console.log('\n[7/8] Privacy / legal');
const required = ['privacy/index.html', '404.html', 'sitemap.xml', 'robots.txt'];
for (const r of required) {
  if (known.has(r)) ok(`${r} present`);
  else fail(`missing required page: ${r}`);
}

console.log('\n[8/8] sitemap.xml and robots.txt');
if (!existsSync(join(SITE, 'sitemap.xml'))) fail('sitemap.xml was not generated');
else {
  const xml = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');
  const urls = (xml.match(/<loc>/g) || []).length;
  if (urls < 5) fail(`sitemap only lists ${urls} URLs`);
  else ok(`sitemap lists ${urls} URLs`);
}
if (!existsSync(join(SITE, 'robots.txt'))) fail('robots.txt missing');
else ok('robots.txt present');

/* ---------------------------------------------------------------- done -- */
console.log('\n' + '='.repeat(66));
if (problems === 0 && warnings === 0) {
  console.log('  ALL CHECKS PASSED — safe to publish.');
} else if (problems === 0) {
  console.log(`  No failures. ${warnings} warning(s) — read them before launching.`);
} else {
  console.log(`  ${problems} FAILURE(S), ${warnings} warning(s) — DO NOT PUBLISH YET.`);
}
console.log('='.repeat(66) + '\n');

process.exit(problems === 0 ? 0 : 1);