// Diagnostic: find unbalanced Nunjucks comments ({# ... #}) across the templates.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const base = '_content';
const files = [];

(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (!entry.startsWith('_')) continue;
      walk(p);
    } else if (/\.(njk|md|html)$/.test(entry)) {
      files.push(p);
    }
  }
})(base);

let bad = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const opens  = [...src.matchAll(/\{#/g)].map((m) => m.index);
  const closes = [...src.matchAll(/#\}/g)].map((m) => m.index);

  // Walk the file so nesting and ordering are both checked, not just counts.
  let depth = 0;
  let ok = true;
  for (let i = 0; i < src.length - 1; i++) {
    if (src[i] === '{' && src[i + 1] === '#') depth++;
    else if (src[i] === '#' && src[i + 1] === '}') { depth--; if (depth < 0) { ok = false; break; } }
  }
  if (depth !== 0) ok = false;

  console.log((ok ? 'OK   ' : 'BAD  ') + relative('.', f));
  if (!ok) {
    bad++;
    console.log('     {# positions: ' + opens.join(', '));
    console.log('     #} positions: ' + closes.join(', '));
    const line = src.slice(0, opens[0] ?? 0).split('\n').length;
    console.log('     first {# is around line ' + line);
  }
}

console.log(bad ? `\n${bad} file(s) with unbalanced comments` : '\nall comments balanced');