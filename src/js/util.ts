/** Small DOM and formatting helpers shared across the site modules. */

/** Runs `fn` once the DOM is ready, whether or not the script loaded late. */
export function ready(fn: () => void): void {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn, { once: true });
}

export function $<T extends Element = HTMLElement>(selector: string, scope: ParentNode = document): T | null {
  return scope.querySelector<T>(selector);
}

export function $$<T extends Element = HTMLElement>(selector: string, scope: ParentNode = document): T[] {
  return Array.from(scope.querySelectorAll<T>(selector));
}

/** Query by attribute, e.g. attr('[data-filters]', 'data-filter'). */
export function attr<T extends Element = HTMLElement>(selector: string, name: string, scope: ParentNode = document): T | null {
  return scope.querySelector<T>(`${selector}[${name}]`);
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smooth scroll unless the visitor has asked for reduced motion. */
export function scrollToY(y: number): void {
  window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/** Formats 12500 -> "12,500", 1250000 -> "1.25M". */
export function money(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  return `$${Math.round(value).toLocaleString('en-AU')}`;
}

/** Escapes text before it is interpolated into innerHTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}