/**
 * MOBILE NAVIGATION
 * ---------------------------------------------------------------------------
 * Progressive enhancement: without JavaScript the nav is still a plain list of
 * links, so nothing is lost.
 */
import { $, ready } from '../util';

export function initNav(): void {
  const toggle = $<HTMLButtonElement>('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const close = (): void => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.removeAttribute('data-open');
    document.body.style.removeProperty('overflow');
  };

  const open = (): void => {
    toggle.setAttribute('aria-expanded', 'true');
    nav.setAttribute('data-open', '');
    // Lock the page behind the menu so scrolling it feels wrong.
    document.body.style.overflow = 'hidden';
  };

  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') close();
    else open();
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close();
      toggle.focus();
    }
  });

  // Back to desktop width — the menu is a horizontal bar there, so the mobile
  // panel state must not linger.
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) close();
  });

  // Following a link inside the menu should close it, obviously.
  nav.addEventListener('click', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) close();
  });
}

export function initHeaderShadow(): void {
  const header = $<HTMLElement>('[data-header]');
  if (!header) return;

  const apply = (): void => {
    header.toggleAttribute('data-scrolled', window.scrollY > 8);
  };
  apply();
  window.addEventListener('scroll', apply, { passive: true });
}

ready(() => {
  initNav();
  initHeaderShadow();
});