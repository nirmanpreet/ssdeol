/**
 * LOGO BUILD PIPELINE  —  run with:  npm run build:logo
 * ------------------------------------------------------------------
 * Takes the raw  logo.png  (1408x768, white background, ~914 KB) and produces
 * a web-ready brand pack. Nothing here runs at build time — it is a one-off.
 *
 * Outputs into  assets/img/brand/
 *   logo.png          optimised, transparent, 720px wide
 *   logo.webp         modern format, same art
 *   logo.svg          traced vector (full colour)
 *   logo-mark.svg     simplified vector mark (no fine detail)
 *   favicon.svg       32px-legible simplified mark
 *   favicon.png       32x32
 *   apple-touch-icon.png  180x180 (opaque white square, iOS requirement)
 *   icon-192.png / icon-512.png   PWA / Google result tile
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'logo.png');
const OUT = resolve(ROOT, 'assets/img/brand');
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('  ', ...a);

// White-ish -> transparent, and knock out the interior of the "PAINTING" banner
// so the crest reads cleanly on any background.
const WHITE_CUTOFF = 236;

async function loadTrimmed() {
  const src = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data } = src;
  const { width, height } = src.info;
  log(`source ${width}x${height}`);

  // --- find the bounding box of non-white pixels (so we can crop the padding)
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 16) continue;
      if (r > WHITE_CUTOFF && g > WHITE_CUTOFF && b > WHITE_CUTOFF) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const pad = 8;
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  const w = Math.min(width - left, maxX - minX + pad * 2);
  const h = Math.min(height - top, maxY - minY + pad * 2);
  log(`content box x${left} y${top} ${w}x${h}  (was ${width}x${height})`);

  // --- crop, then knock the white out to alpha
  const cropped = await sharp(SRC)
    .ensureAlpha()
    .extract({ left, top, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cd = cropped.data;
  for (let i = 0; i < cd.length; i += 4) {
    const r = cd[i], g = cd[i + 1], b = cd[i + 2];
    // anti-aliased edges of white need a soft ramp, otherwise you get a grey halo
    const lum = Math.min(r, g, b);
    if (lum >= WHITE_CUTOFF) {
      cd[i + 3] = 0;
    } else if (lum > WHITE_CUTOFF - 26) {
      cd[i + 3] = Math.round(((WHITE_CUTOFF - lum) / 26) * 255);
    }
  }
  return { data: cd, width: w, height: h };
}

/** Simplified hand-drawn shield, used wherever the full crest becomes illegible. */
async function main() {
  console.log('\n[1/5] loading + trimming');
  const raw = await loadTrimmed();

  console.log('\n[2/5] rasters (avif -> webp -> png ladder)');
  const pipe = (b) => sharp(b, { raw: { width: raw.width, height: raw.height, channels: 4 } })
    .resize({ width: 640, withoutEnlargement: true });

  const avif = await pipe(raw.data).avif({ quality: 45, effort: 6 }).toBuffer();
  writeFileSync(resolve(OUT, 'logo.avif'), avif);
  log(`logo.avif     ${(avif.length / 1024).toFixed(0)} KB   <- modern browsers`);

  const webp = await pipe(raw.data).webp({ quality: 84, alphaQuality: 95 }).toBuffer();
  writeFileSync(resolve(OUT, 'logo.webp'), webp);
  log(`logo.webp     ${(webp.length / 1024).toFixed(0)} KB   <- middle fallback`);

  const png = await pipe(raw.data).png({ compressionLevel: 9, palette: true, quality: 82, effort: 10 }).toBuffer();
  writeFileSync(resolve(OUT, 'logo.png'), png);
  log(`logo.png      ${(png.length / 1024).toFixed(0)} KB   <- legacy fallback  (was 914 KB)`);

  // NOTE: this crest was deliberately NOT shipped as an auto-traced vector.
  // A traced version measured 332 KB / 2,087 paths — heavier than the optimised
  // raster it was meant to replace, because the eagle's feathers and the roller
  // detail shatter into thousands of subpaths. Raster wins here. If a designer
  // ever supplies the true vector original, drop it in as logo.svg and delete
  // this note.
  console.log('\n[3/5] vector: skipping auto-trace (see note in build-logo.mjs)');

  console.log('\n[4/5] simplified mark + favicon');
  // The full crest is illegible below ~48px (feathers become a smudge), so the
  // small sizes get a purpose-drawn shield instead. Colours are sampled from logo.png.
  const GREEN = '#046A32', GOLD = '#EDB924', BLACK = '#0A0A0A';
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="SS Deol">
  <defs><clipPath id="shield"><path d="M256 16 448 72v188c0 110-78 190-192 236C142 450 64 370 64 260V72z"/></clipPath></defs>
  <path d="M256 16 448 72v188c0 110-78 190-192 236C142 450 64 370 64 260V72z" fill="${GREEN}" stroke="${GOLD}" stroke-width="18"/>
  <g clip-path="url(#shield)" opacity=".22" fill="${GOLD}"><path d="M256 16 448 72v188c0 110-78 190-192 236z"/></g>
  <text x="256" y="316" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif" font-weight="800" font-size="240" letter-spacing="-8" text-anchor="middle" fill="#fff">SS</text>
  <rect x="112" y="344" width="288" height="26" rx="4" fill="${GOLD}"/>
</svg>`;
  writeFileSync(resolve(OUT, 'logo-mark.svg'), mark);
  log('logo-mark.svg hand-drawn shield');

  writeFileSync(resolve(OUT, 'favicon.svg'), mark);
  const fav = await sharp(Buffer.from(mark)).resize(64, 64).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(resolve(OUT, 'favicon.png'), fav);
  log(`favicon       ${(fav.length / 1024).toFixed(1)} KB`);

  console.log('\n[5/5] raster icons');
  // iOS ignores transparency on apple-touch-icon — flatten onto white.
  const opaque = await sharp(Buffer.from(mark)).flatten({ background: '#ffffff' });
  const touch = await opaque.resize(180, 180).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(resolve(OUT, 'apple-touch-icon.png'), touch);
  log(`apple-touch   ${(touch.length / 1024).toFixed(1)} KB`);

  for (const size of [192, 512]) {
    const buf = await opaque.resize(size, size).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(resolve(OUT, `icon-${size}.png`), buf);
    log(`icon-${size}      ${(buf.length / 1024).toFixed(1)} KB`);
  }

  console.log('\n  done ->', OUT, '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });