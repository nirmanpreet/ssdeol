/**
 * ICON SET
 * ---------------------------------------------------------------------------
 * All icons are inline SVG on a 24x24 grid with a 1.7px stroke. Inline means:
 *   - no icon font to download
 *   - no extra HTTP request
 *   - they inherit currentColor, so one CSS rule recolours them
 *
 * Registered once as a Nunjucks shortcode in .eleventy.js, so every template
 * can use  {{ icon("roller") }}  without including anything.
 *
 * To add an icon: add a case below, then use {{ icon("your-name") }}.
 */

const PATHS = {
  roller:
    '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M7 9v3a4 4 0 0 0 4 4h6M12 16v4"/><path d="M9 20h6"/>',
  floor:
    '<path d="M3 15h18M3 19h18"/><path d="M4 15V8l8-4 8 4v7"/><path d="M9 15v-4h6v4"/>',
  lines:
    '<path d="M3 8h18M3 16h18" stroke-dasharray="4 3"/><path d="M8 4v4M8 12v4M16 4v4M16 12v4"/>',
  spray:
    '<path d="M9 9h6v11H9z"/><path d="M10 9V4h4v5"/><path d="M17 4h1M19 6h1M17 8h1M19 10h1M12 2v1"/>',
  steel:
    '<path d="M3 8h18M3 12h18M3 16h18"/><path d="M6 8V5M12 8V5M18 8V5M9 12v4M15 12v4"/>',
  rope:
    '<path d="M12 3v14"/><circle cx="12" cy="20" r="3"/><path d="M8 7h8M9 11h6"/>',
  build:
    '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 21v-6h4v6"/>',
  repair:
    '<path d="M14 4a4 4 0 0 0-5.7 5.7L3 15l6 6 5.3-5.3A4 4 0 0 0 20 10l-3 3-3-3 3-3a4 4 0 0 0-3-3z"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  crew:
    '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2"/><path d="M15 15h2a4 4 0 0 1 4 4v2"/>',
  shutdown:
    '<path d="M5 12a7 7 0 1 1 14 0"/><path d="M12 12V3"/><path d="M3 18h18" stroke-dasharray="3 3"/>',
  shield:
    '<path d="M12 3 20 6v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',
  phone:
    '<path d="M6 10.5a15 15 0 0 0 7 7l2.2-2.3a1 1 0 0 1 1-.25c1.2.4 2.4.6 3.8.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.25 2.6.65 3.7a1 1 0 0 1-.25 1z"/>',
};

/** Return an inline <svg> string for the given icon name. */
export function iconSvg(name, cls = '') {
  const path = PATHS[name];
  if (!path) {
    // Fail loudly in development rather than silently rendering an empty box.
    console.warn(`[icons] Unknown icon "${name}". Add it to tools/icons.js`);
    return '';
  }
  return (
    `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
    `${path}</svg>`
  );
}

export const iconNames = Object.keys(PATHS);