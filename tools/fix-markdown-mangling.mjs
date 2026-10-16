/**
 * ONE-OFF FIX + PERMANENT GUARD
 *
 * Bug: in a .md file with markdownTemplateEngine: "njk", a BLANK LINE between
 * two sibling block-level HTML elements ends the raw-HTML block as far as
 * markdown-it is concerned. It then treats each element as a Markdown
 * paragraph and wraps it in <p>:
 *
 *     </div>
 *                      <-- this blank line breaks the HTML block
 *     <div class="hero__panel">
 *
 *     becomes
 *
 *     </div>
 *     <p><div class="hero__panel"> … </div></p>
 *
 * which is invalid HTML and visibly breaks grids and layouts.
 *
 * Fix: remove a blank line when the nearest non-blank line above ends with ">"
 * AND the nearest non-blank line below opens a BLOCK-LEVEL html tag.
 *
 * Inline tags (<p>, <span>, <a>, <em>…) are deliberately excluded — removing a
 * blank line between those would merge real paragraphs of prose.
 *
 * Run:  node tools/fix-markdown-mangling.mjs   (safe to re-run; a no-op when clean)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const BLOCK_OPEN = /^<(div|section|ul|ol|table|thead|tbody|form|aside|nav|article|header|footer|main|figure|dl)\b[^>]*>/i;
const ENDS_IN_TAG = />\s*$/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.md')) out.push(p);   // only markdown — .njk is never processed by markdown
  }
  return out;
}

let filesChanged = 0;
let blanksRemoved = 0;

for (const file of walk('_content')) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const drop = new Set();
  const mark = (n) => { drop.add(n); blanksRemoved++; };

  for (let i = 1; i < lines.length - 1; i++) {
    if (lines[i].trim() !== '') continue;

    let up = i - 1;
    while (up >= 0 && lines[up].trim() === '') up--;
    let down = i + 1;
    while (down < lines.length && lines[down].trim() === '') down++;

    const above = up >= 0 ? lines[up] : '';
    const below = down < lines.length ? lines[down] : '';

    if (!ENDS_IN_TAG.test(above)) continue;
    if (!BLOCK_OPEN.test(below.trim())) continue;

    // Drop this blank line AND any further consecutive blanks up to `below`.
    for (let k = i; k < down; k++) mark(k);
  }

  if (drop.size) {
    writeFileSync(file, lines.filter((_, i) => !drop.has(i)).join('\n'));
    filesChanged++;
    console.log('  fixed ' + relative('.', file) + `  (${drop.size} blank line(s))`);
  }
}

console.log(`\n  ${blanksRemoved} blank line(s) removed across ${filesChanged} file(s)`);