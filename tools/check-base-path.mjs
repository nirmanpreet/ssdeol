// Report every root-absolute URL in the built HTML, so base-path problems are
// obvious at a glance. Used while setting SITE_BASE_PATH and in QA.
import { readFileSync } from 'node:fs';

const BASE = process.env.SITE_BASE_PATH ?? '/ssdeol/';
const pages = [
  '_site/index.html',
  '_site/contact/index.html',
  '_site/services/epoxy-floor-coatings/index.html',
];

let wrong = 0;
for (const p of pages) {
  let h;
  try { h = readFileSync(p, 'utf8'); } catch { console.log(`  [SKIP] ${p} (not built)`); continue; }

  const urls = [...h.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => u.startsWith('/') && !u.startsWith('//'));
  const unique = [...new Set(urls)].sort();
  const bad = unique.filter((u) => !u.startsWith(BASE));

  console.log(`\n${p}`);
  console.log(`  ${unique.length} root-absolute URL(s)`);
  unique.slice(0, 8).forEach((u) => console.log(`    ${u.startsWith(BASE) ? 'OK  ' : 'BAD '} ${u}`));
  if (unique.length > 8) console.log(`    … ${unique.length - 8} more`);

  bad.forEach((u) => {
    console.log(`    BAD  ${u}   ← missing the "${BASE}" prefix`);
    wrong++;
  });
}

console.log(`\n${wrong === 0 ? 'All URLs correctly prefixed with ' + BASE : wrong + ' URL(s) missing the ' + BASE + ' prefix'}`);
process.exit(wrong === 0 ? 0 : 1);