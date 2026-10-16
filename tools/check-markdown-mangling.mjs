// Verify the markdown-mangling bug is gone: markdown-it wraps block-level HTML
// in <p> when a blank line interrupts a raw HTML block. The signature is a <p>
// that OPENS around a block element, or a </p> that CLOSES after one.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

// A <p> that opens immediately before a block-level element, or closes right
// after one. Both mean markdown has wrapped block HTML in a paragraph.
const OPEN_BAD = /<p>\s*<(?:div|ul|ol|li|section|table|h[1-6]|article|figure|nav|aside)\b/;
const CLOSE_BAD = /<\/(?:div|ul|ol|li|section|table|h[1-6]|article|figure|nav|aside)>\s*<\/p>/;

let bad = 0;
const files = walk('_site');

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const issues = [];
  for (const [label, re] of [['<p><block>', OPEN_BAD], ['<block></p>', CLOSE_BAD]]) {
    const m = re.exec(html);
    if (m) {
      issues.push(`${label} near: ${JSON.stringify(html.slice(Math.max(0, m.index - 60), m.index + 60))}`);
    }
  }
  if (issues.length) {
    bad++;
    console.log(`\n${relative('_site', f)}`);
    issues.forEach((i) => console.log('   ' + i));
  }
}

console.log(bad ? `\n${bad} file(s) still affected` : `\nAll ${files.length} pages clean — no <p> wrapping block elements`);
process.exit(bad ? 1 : 0);