/**
 * ONE-OFF FIX (permanent safeguard, kept in the repo)
 *
 * Bug: a Nunjucks tag sitting on its own line, like
 *
 *     <ul class="card-grid">
 *       {% for s in services.services %}
 *       <li>…</li>
 *       {% endfor %}
 *     </ul>
 *
 * renders to
 *
 *     <ul class="card-grid">
 *       <BLANK LINE>
 *       <li>…</li>
 *       <BLANK LINE>
 *     </ul>
 *
 * because the tags themselves vanish but their newlines remain. In a .md file
 * (markdownTemplateEngine: njk) markdown-it then sees a blank line inside the
 * HTML block, decides the block ended, and wraps every <li> in a <p>. The
 * stray <p> elements become grid children and the layout falls apart.
 *
 * Fix: use Nunjucks whitespace control — `{%-` strips the newline BEFORE the
 * tag, which removes the blank line.
 *
 * Only tags that sit between two HTML lines are touched, so prose paragraphs
 * and Markdown lists are never affected.
 *
 * Run:  node tools/fix-loop-whitespace.mjs      (safe to re-run, it is a no-op
 *                                                once everything is fixed)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(md|njk)$/.test(p)) out.push(p);
  }
  return out;
}

const TAG = /^\s*\{%-?\s*(for|if|endif|endfor)\b[^%]*-?%\}\s*$/;
const HTML_LINE = /^\s*<[^/!].*>\s*$/;   // an opening tag on its own line

let filesChanged = 0;
let tagsFixed = 0;

for (const file of walk('_content')) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TAG);
    if (!m) continue;
    // Idempotent: skip anything that already has both whitespace markers.
    if (lines[i].includes('{%-') && lines[i].includes('-%}')) continue;

    // Find the nearest non-blank line above
    let up = i - 1;
    while (up >= 0 && lines[up].trim() === '') up--;
    const above = up >= 0 ? lines[up] : '';

    // Only touch tags sitting directly under an opening HTML tag — that is the
    // case that produces a blank line inside a raw HTML block.
    if (!HTML_LINE.test(above)) continue;

    lines[i] = lines[i]
      .replace(/\{%(?!!)/, '{%-')     // strip the newline BEFORE the tag
      .replace(/%\}$/, '-%}');        // strip the newline AFTER the tag
    tagsFixed++;
    changed = true;
  }

  if (changed) {
    writeFileSync(file, lines.join('\n'));
    filesChanged++;
    console.log('  fixed ' + relative('.', file));
  }
}

console.log(`\n  ${tagsFixed} Nunjucks tag(s) given whitespace control across ${filesChanged} file(s)`);