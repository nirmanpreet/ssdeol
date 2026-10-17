/**
 * JAVASCRIPT BUILD
 * ---------------------------------------------------------------------------
 * Compiles src/js/*.ts -> assets/js/main.js using esbuild.
 *
 * Why bother when the old code was plain JavaScript?
 *   The site now has a quote calculator, a form handler, filters, a lightbox,
 *   a comparison slider and scroll animations — around 30 KB of real logic.
 *   TypeScript catches mistakes at build time that would otherwise only show
 *   up as a silent broken button on a customer's phone.
 *
 *   esbuild is used rather than a heavier toolchain because it is ~1000x
 *   faster and produces readable, unminified-by-default output that is easy to
 *   debug in the browser.
 *
 *   minify is OFF on purpose. Keeping the shipped file readable means the
 *   maintenance guide can tell someone "open this file in your browser
 *   developer tools and you can read it", and the saving is under 3 KB.
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [resolve(ROOT, 'src/js/main.ts')],
  outfile: resolve(ROOT, 'assets/js/main.js'),
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome90', 'firefox90', 'safari15'],
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
  metafile: true,
};

if (watch) {
  const { context } = await import('esbuild');
  const ctx = await context(options);
  await ctx.watch();
  console.log('  watching src/js for changes… (Ctrl+C to stop)');
} else {
  const result = await build(options);
  const out = result.metafile.outputs['../assets/js/main.js'] ?? Object.values(result.metafile.outputs)[0];
  if (out) console.log(`  assets/js/main.js — ${(out.bytes / 1024).toFixed(1)} KB`);
}