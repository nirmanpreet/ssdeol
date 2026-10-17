/**
 * PROJECT GALLERY: filters, lightbox and the before/after slider.
 */
import { $, $$, attr, ready, prefersReducedMotion } from '../util';

/* ---------------------------------------------------------------- filters */
export function initFilters(): void {
  const bar = $<HTMLElement>('[data-filters]');
  if (!bar) return;

  const buttons = $$<HTMLButtonElement>('[data-filter]', bar);
  const items = $$<HTMLElement>('[data-category]');
  const empty = $<HTMLElement>('[data-filter-empty]');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const want = button.getAttribute('data-filter') ?? 'all';
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      items.forEach((item) => {
        const tags = item.getAttribute('data-category') ?? '';
        item.hidden = !(want === 'all' || tags.split(' ').includes(want));
      });
      empty?.toggleAttribute('hidden', !items.every((i) => i.hidden));
    });
  });
}

/* --------------------------------------------------------------- lightbox */
export function initLightbox(): void {
  const links = $$<HTMLAnchorElement>('[data-lightbox]');
  if (!links.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo viewer');
  box.hidden = true;
  box.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Close">&times;</button>
    <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous photo">&#8249;</button>
    <figure class="lightbox__figure"><img alt=""><figcaption></figcaption></figure>
    <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next photo">&#8250;</button>`;
  document.body.appendChild(box);

  const img = $<HTMLImageElement>('.lightbox__figure img', box);
  const caption = $<HTMLElement>('.lightbox__figure figcaption', box);
  if (!img || !caption) return;

  let index = 0;
  let lastFocus: HTMLElement | null = null;

  const show = (i: number): void => {
    index = (i + links.length) % links.length;
    const link = links[index];
    if (!link) return;
    img.src = link.getAttribute('href') ?? '';
    img.alt = link.getAttribute('data-caption') ?? '';
    caption.textContent = link.getAttribute('data-caption') ?? '';
  };

  const open = (i: number): void => {
    lastFocus = document.activeElement as HTMLElement | null;
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    $<HTMLButtonElement>('.lightbox__close', box)?.focus();
  };

  const close = (): void => {
    box.hidden = true;
    document.body.style.removeProperty('overflow');
    lastFocus?.focus();
  };

  links.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      open(i);
    });
  });

  $<HTMLButtonElement>('.lightbox__close', box)?.addEventListener('click', close);
  $<HTMLButtonElement>('.lightbox__nav--prev', box)?.addEventListener('click', () => show(index - 1));
  $<HTMLButtonElement>('.lightbox__nav--next', box)?.addEventListener('click', () => show(index + 1));
  box.addEventListener('click', (e) => {
    if (e.target === box) close();
  });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);

    // Keep Tab inside the dialog while it is open.
    if (e.key === 'Tab') {
      const focusable = $$<HTMLButtonElement>('button', box);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* ------------------------------------------------------ before/after ---- */
export function initComparisons(): void {
  const blocks = $$<HTMLElement>('[data-compare]');
  if (!blocks.length) return;

  blocks.forEach((block) => {
    const range = $<HTMLInputElement>('input[type="range"]', block);
    const after = $<HTMLElement>('[data-compare-after]', block);
    const handle = $<HTMLElement>('[data-compare-handle]', block);
    if (!range || !after) return;

    const set = (percent: number): void => {
      const clamped = Math.max(0, Math.min(100, percent));
      after.style.setProperty('--split', `${clamped}%`);
      if (handle) handle.style.left = `${clamped}%`;
      range.setAttribute('aria-valuenow', String(Math.round(clamped)));
    };

    // Pointer drag. Works with touch, mouse and pen.
    block.addEventListener('pointerdown', (e) => {
      const rect = block.getBoundingClientRect();
      const move = (ev: PointerEvent): void =>
        set(((ev.clientX - rect.left) / rect.width) * 100);

      move(e);
      block.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent): void => move(ev);
      const onUp = (): void => {
        block.removeEventListener('pointermove', onMove);
        block.removeEventListener('pointerup', onUp);
        block.removeEventListener('pointercancel', onUp);
      };
      block.addEventListener('pointermove', onMove);
      block.addEventListener('pointerup', onUp);
      block.addEventListener('pointercancel', onUp);
    });

    // The range input is focusable and arrow-key operable for free.
    range.addEventListener('input', () => set(Number(range.value)));
    set(Number(range.value || 50));
  });
}

/* --------------------------------------------------------- scroll reveal -- */
/**
 * Fades sections in as they are scrolled past.
 *
 * SAFETY RULES — this animation is never allowed to hide real content:
 *   1. The pre-JS state is visible (CSS keys off `html.js`), so if the script
 *      fails to load nothing is ever hidden.
 *   2. A rAF-throttled scroll handler reveals anything that has reached the
 *      viewport, and the IntersectionObserver is only the optimisation that
 *      makes the fade start slightly early. A fast flick-scroll cannot leave
 *      copy stranded at opacity 0 — invisible words on a sales page.
 *   3. A one-shot failsafe covers the case where the page is resized, printed,
 *      or restored from bfcache without a scroll event.
 *   4. Everything is revealed before printing, because nobody wants a blank
 *      quote when they print the page to read it.
 */
export function initReveal(): void {
  const targets = $$<HTMLElement>('[data-reveal]');
  if (!targets.length) return;

  const showAll = (): void => targets.forEach((el) => el.classList.add('is-visible'));

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    showAll();
    return;
  }

  /** Reveals every target that has reached or passed the bottom of the viewport. */
  const revealReached = (): void => {
    const limit = window.innerHeight;
    for (const el of targets) {
      if (el.classList.contains('is-visible')) continue;
      if (el.getBoundingClientRect().top < limit) el.classList.add('is-visible');
    }
  };

  let queued = false;
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      revealReached();
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    },
    // A positive bottom margin starts the fade before the element is fully on
    // screen, so scrolling never reveals transparent text.
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );

  targets.forEach((el) => io.observe(el));

  // Rule 2 — the guarantee. Cheap, passive, and does not depend on the
  // observer firing at all.
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  revealReached();

  // Rule 3 — covers print, bfcache restore, and anything else that changes the
  // layout without a scroll.
  window.setTimeout(showAll, 3000);
  window.addEventListener('beforeprint', showAll);
}

/* --------------------------------------------------- animated hero paint -- */
export function initPaintStroke(): void {
  const stroke = attr<SVGPathElement>('[data-hero-stroke]', 'data-hero-stroke');
  if (!stroke) return;

  if (prefersReducedMotion()) {
    stroke.classList.add('is-drawn');
    return;
  }

  const length = stroke.getTotalLength?.() ?? 0;
  if (!length) return;

  stroke.style.strokeDasharray = String(length);
  stroke.style.strokeDashoffset = String(length);

  requestAnimationFrame(() => stroke.classList.add('is-drawn'));
}

ready(() => {
  initFilters();
  initLightbox();
  initComparisons();
  initReveal();
  initPaintStroke();
});