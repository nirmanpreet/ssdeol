/**
 * ELEVENTY CONFIG
 * =============================================================================
 * You should never need to edit this file. It wires up the inline icon
 * shortcode, a few template helpers and the passthrough copy for
 * CSS / JS / images / fonts.
 *
 * If you are adding a normal page or a project, edit the Markdown files in
 * _content/ instead. See MAINTENANCE.md.
 */

import { iconSvg } from './tools/icons.js';
import nunjucks from 'nunjucks';
import { load as loadYaml } from 'js-yaml';

// SafeString is exported from nunjucks' runtime namespace, not the top level.
const { SafeString } = nunjucks.runtime;

/**
 * BASE PATH — the single most important setting in this file.
 *
 * GitHub Pages serves a *project* site from  https://<user>.github.io/<repo>/
 * so a root-absolute path like /assets/css/main.css resolves to the DOMAIN
 * root, not the repo folder, and returns 404. Every stylesheet, script, font
 * and image silently disappears and the site renders unstyled with no JS.
 *
 * So the base path is explicit and switchable:
 *
 *   SITE_BASE_PATH=/ssdeol/   →  testing at nirmanpreet.github.io/ssdeol/
 *   SITE_BASE_PATH=/          →  live at ssdeol.com.au (custom domain)
 *
 * The deploy workflow sets this. Everything below uses it, so switching to the
 * domain later is a one-line change and nothing else moves.
 */
const basePath = process.env.SITE_BASE_PATH ?? '/ssdeol/';

export default function (eleventyConfig) {
  // Every absolute URL in a template is prefixed with this.
  eleventyConfig.addGlobalData('basePath', basePath);

  // ---------------------------------------------------------------------
  // BASE PATH REWRITE — do not remove.
  //
  // GitHub Pages serves a project site from /<repo>/, so a root-absolute URL
  // like /assets/css/main.css resolves to the DOMAIN root and 404s. The site
  // then renders completely unstyled with no JavaScript, and nothing in the
  // build output complains.
  //
  // This rewrites every root-absolute href/src in the finished HTML so it
  // works at both github.io/<repo>/ and a custom domain. Verified by
  // `npm run qa:basepath`.
  // ---------------------------------------------------------------------
  eleventyConfig.addTransform('prefixAbsoluteUrls', function (content) {
    // Nothing to do when the site is served from the domain root.
    if (basePath === '/') return content;
    if (!content || !/<\/html>/.test(content)) return content;

    const toUrl = (value) => {
      if (!value.startsWith('/')) return value;      // relative, absolute URL, tel:, mailto:…
      if (value.startsWith('//')) return value;      // protocol-relative
      if (value === '/') return basePath;            // the homepage link
      if (value.startsWith(basePath)) return value;  // already done
      return basePath.replace(/\/$/, '') + value;
    };

    // Only href/src/srcset attribute values are touched. Template output
    // cannot contain an unescaped double quote inside an attribute, so a
    // targeted replace here is safe — and unlike a DOM pass it cannot fail to
    // import on a CommonJS/ESM boundary.
    const prefixAttribute = (value) => {
      const trimmed = value.trim();
      const prefixed = toUrl(trimmed);
      // Preserve whatever whitespace separated the leading value.
      return value.replace(trimmed, prefixed);
    };

    return content
      // srcset holds one or more "url [descriptor]" pairs separated by commas.
      .replace(/\bsrcset="([^"]*)"/g, (_m, value) =>
        `srcset="${value
          .split(',')
          .map((part) => prefixAttribute(part))
          .join(',')}"`
      )
      .replace(/\b(href|src)="([^"]*)"/g, (match, attr, value) => `${attr}="${prefixAttribute(value)}"`);
  });
  // ---------------------------------------------------------------------
  // YAML data files. IMPORTANT.
  //
  // Eleventy 3 only scans the _data directory for .json / .js / .mjs / .cjs
  // by default — .yml and .yaml are NOT included. Without this line every
  // _data/*.yml file is silently ignored and every {{ site.* }} in the site
  // renders blank, with no error and no warning. Verified the hard way.
  //
  // We use YAML rather than JSON because JSON cannot carry the explanatory
  // comments the site owner needs in order to edit these files safely.
  // ---------------------------------------------------------------------
  eleventyConfig.addDataExtension('yaml,yml', (contents) => loadYaml(contents));

  // Inline SVG icons, available everywhere as {{ icon("roller") }} — pages AND
  // layouts. Registered as a Nunjucks *global* rather than a shortcode because
  // Eleventy does not inject shortcodes into nested layouts, which is where
  // the shared service layout lives.
  eleventyConfig.amendLibrary('njk', (njk) => {
    njk.addGlobal('icon', (name, cls = '') => new SafeString(iconSvg(name, cls)));
  });

  // Copy everything in assets/ through to the site root untouched.
  eleventyConfig.addPassthroughCopy({ 'assets/css': 'assets/css' });
  eleventyConfig.addPassthroughCopy({ 'assets/js': 'assets/js' });
  eleventyConfig.addPassthroughCopy({ 'assets/fonts': 'assets/fonts' });
  eleventyConfig.addPassthroughCopy({ 'assets/img': 'assets/img' });
  eleventyConfig.addPassthroughCopy({ 'robots.txt': 'robots.txt' });

  // Pretty URLs: /services/epoxy-floor-coatings/ not .../index.html
  eleventyConfig.addFilter('slug', (str) =>
    String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  );

  // Turn a phone number into a tel: link. Australian numbers get spaces stripped.
  eleventyConfig.addFilter('tel', (num) => String(num).replace(/[^\d+]/g, ''));

  // Nunjucks has no built-in `in` operator that is pleasant to use, and no
  // way to check whether an array is non-empty. These two keep templates tidy.
  eleventyConfig.addFilter('isNonEmpty', (arr) => Array.isArray(arr) && arr.length > 0);
  eleventyConfig.addFilter('has', (str, needle) => String(str).includes(needle));

  // YAML block scalars (">-" in _data files) keep their newlines. This collapses
  // them to a single line so meta descriptions come out as one clean string.
  eleventyConfig.addFilter('strip_newlines', (str) => String(str ?? '').replace(/\s*\n\s*/g, ' ').trim());

  // Takes a YAML block scalar and returns a plain, paragraph-separated string
  // for body copy. Only used where an explicit line break is wanted.
  eleventyConfig.addFilter('paragraphs', (str) =>
    String(str ?? '').trim().split(/\n\s*\n/).map((p) => `<p>${p.trim()}</p>`).join('\n')
  );

  // Nunjucks has no `map(attribute=…)`. Used by the schema partial to turn
  // lists of objects into a comma-separated string for Schema.org fields.
  eleventyConfig.addFilter('names', (arr, key) => (Array.isArray(arr) ? arr : []).map((o) => o?.[key]).filter(Boolean).join(', '));

  // Look up one service record by its slug. Used by the service layout to render
  // "related services" cards without hard-coding titles in nine files.
  eleventyConfig.addFilter('serviceBySlug', (arr, slug) =>
    (Array.isArray(arr) ? arr : []).find((s) => s.slug === slug) || { title: slug, short: '', icon: 'roller' }
  );

  // ---------------------------------------------------------------------------
//  Project helpers. Nunjucks has none of Eleventy's array filters available in
//  layouts/pages, and these read more clearly in a template than a long chain
//  of conditionals would.
// ---------------------------------------------------------------------------
  const arr = (v) => (Array.isArray(v) ? v : []);

  // Ready to publish (draft is not true) and newest first.
  eleventyConfig.addFilter('published', (v) =>
    arr(v).filter((p) => p?.data?.draft !== true).sort((a, b) =>
      String(b?.data?.completed ?? '').localeCompare(String(a?.data?.completed ?? ''))
    )
  );

  eleventyConfig.addFilter('drafts', (v) => arr(v).filter((p) => p?.data?.draft === true));

  eleventyConfig.addFilter('withHero', (v) => arr(v).filter((p) => p?.data?.hero));
  eleventyConfig.addFilter('withBeforeAfter', (v) => arr(v).filter((p) => p?.data?.before && p?.data?.after));

  // Every distinct tag in use, so the filter buttons can never drift out of
  // sync with the projects that actually exist.
  eleventyConfig.addFilter('usedTags', (v) => {
    const out = [];
    for (const p of arr(v)) for (const t of p?.data?.tags ?? []) if (!out.includes(t)) out.push(t);
    return out;
  });

  // Template helpers that must never appear on the live site.
  eleventyConfig.addGlobalData('isLocal', process.env.ELEVENTY_RUN_MODE === 'serve' || !!process.env.LOCAL_BUILD);

  // Serialises a data file to JSON for a data-attribute / inline script.
  // Used by the quote calculator, which needs the rate table client-side.
  // `</script>` is escaped so the output can never terminate the script tag.
  eleventyConfig.addFilter('jsonify', (value) =>
    JSON.stringify(value ?? null).replace(/</g, '\\u003c')
  );

  // Project files live in _content/projects/*.md and become individual pages.
  // `tags: project` is what lets /projects/ collect them and render the gallery.
  eleventyConfig.addCollection('projects', (api) =>
    api.getFilteredByGlob('./_content/projects/*.md')
  );

  // Small helper so pages never hard-code the domain.
  eleventyConfig.addShortcode('siteUrl', (path = '/') => `${eleventyConfig.globalData.siteUrl ?? ''}${path}`);

  return {
    dir: {
      // Everything the site owner might edit lives inside _content/:
      //   _content/_data      — settings (phone number, services, copy blocks)
      //   _content/_includes  — templates (never needs editing)
      //   _content/*.md       — the pages themselves
      //
      // NOTE: dir.data and dir.includes are BOTH resolved relative to
      // dir.input, and their defaults ("_data", "_includes") are already
      // correct for that. Setting them explicitly to "_content/_data" makes
      // Eleventy look in _content/_content/_data and load nothing.
      input: '_content',
      output: '_site',
    },
    // Publishes under the repo subfolder on github.io; '/' once the custom
    // domain is attached. See SITE_BASE_PATH at the top of this file.
    pathPrefix: basePath,
    // Rewrites EVERY root-absolute URL in the built HTML — stylesheets, links,
    // scripts, fonts, images — to include the base path. This is the reliable
    // way to support both github.io/<repo>/ and a custom domain from one
    // source; doing it by hand in templates always misses something.
    htmlBaseUrl: basePath,
    templateFormats: ['md', 'njk', 'html'],
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}