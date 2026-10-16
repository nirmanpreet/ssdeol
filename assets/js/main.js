/* =============================================================================
   SS DEOL — main.js
   -----------------------------------------------------------------------------
   No framework, no jQuery, ~9 KB. Everything here is progressive enhancement:
   if JavaScript fails, the site still works (the form falls back to a normal
   post, the menu becomes a plain list, every photo is still visible).

   Sections:
     1. Mobile navigation
     2. Quote form  (client-side validation + AJAX submit to Web3Forms)
     3. Project filters
     4. Lightbox
     5. Before/after slider
   ============================================================================= */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------ 1. mobile nav --- */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    function close() {
      toggle.setAttribute('aria-expanded', 'false');
      nav.removeAttribute('data-open');
      document.body.style.removeProperty('overflow');
    }

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) {
        close();
      } else {
        toggle.setAttribute('aria-expanded', 'true');
        nav.setAttribute('data-open', '');
        document.body.style.overflow = 'hidden';
      }
    });

    // Close on Escape, and on resize back to desktop width.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        close();
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) close();
    });
  }

  /* ------------------------------------------------------ 2. quote form --- */
  function initForm() {
    var form = document.querySelector('[data-quote-form]');
    if (!form) return;

    var status  = form.querySelector('[data-form-status]');
    var submit  = form.querySelector('[data-form-submit]');
    var fields  = Array.prototype.slice.call(form.querySelectorAll('[required]'));
    var bar     = document.querySelector('[data-call-bar]');

    // Contact details come from data attributes on the <form> (written by
    // _content/contact.md from _data/site.yml), so there is only ever ONE place
    // in the whole site where the phone number and email need changing.
    var tel   = form.getAttribute('data-phone') || '';
    var mail  = form.getAttribute('data-email') || '';
    var callLink  = tel   ? '<a href="tel:' + tel.replace(/[^\d+]/g, '') + '">call us</a>'            : 'call us';
    var mailLink  = mail  ? '<a href="mailto:' + mail + '">email us</a>'                                : 'email us';
    var tail =
      '<p style="font-weight:400;margin-top:.5rem">' +
      'This is usually temporary. Please try again, or ' + callLink + ' / ' + mailLink + '.</p>';

    /* --- accessible inline validation ------------------------------------- */
    function errorFor(field) {
      var wrap = field.closest('.field');
      if (!wrap) return null;
      var slot = wrap.querySelector('[data-error-for]');
      if (!slot) {
        slot = document.createElement('p');
        slot.className = 'field__error';
        slot.id = field.id + '-error';
        wrap.appendChild(slot);
      }
      return slot;
    }

    function validateField(field) {
      var message = '';
      var value = (field.value || '').trim();

      if (field.type === 'checkbox') {
        if (!field.checked) message = 'Please tick this box to continue.';
      } else if (field.type === 'email') {
        if (!value) message = 'Please enter your email address.';
        // Deliberately permissive — the goal is to catch typos, not to enforce RFC 5322.
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) message = 'That email address does not look right.';
      } else if (!value) {
        message = 'Please fill this in.';
      }

      var slot = errorFor(field);
      if (message) {
        field.setAttribute('aria-invalid', 'true');
        if (slot) {
          slot.textContent = message;
          if (!field.hasAttribute('aria-describedby')) field.setAttribute('aria-describedby', slot.id);
        }
      } else {
        field.removeAttribute('aria-invalid');
        if (slot) slot.textContent = '';
      }
      return !message;
    }

    fields.forEach(function (field) {
      field.addEventListener('blur', function () { if (field.value) validateField(field); });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    /* --- submit ----------------------------------------------------------- */
    function say(kind, html) {
      if (!status) return;
      status.className = 'form__status form__status--' + kind;
      // aria-live means screen readers announce the result without moving focus.
      status.innerHTML = html;
      status.focus();
      // The sticky call bar hides the bottom of the page — pull it back up.
      if (bar) window.scrollTo({ top: Math.max(0, status.offsetTop - 140), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var bad = fields.filter(function (f) { return !validateField(f); });
      if (bad.length) {
        say('fail', 'Please check the highlighted fields and try again.');
        bad[0].focus();
        return;
      }

      // Honeypot: if a bot filled the hidden field, silently do nothing.
      // Showing it an error just teaches bots to try harder.
      var honey = form.querySelector('[name="botcheck"]');
      if (honey && honey.checked) { form.reset(); return; }

      if (submit) {
        submit.disabled = true;
        submit.setAttribute('aria-busy', 'true');
        submit.textContent = 'Sending…';
      }

      var payload = new FormData(form);
      payload.append('from_name', 'SS Deol Website');

      fetch(form.action, { method: 'POST', body: payload, headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return { success: res.ok }; }); })
        .then(function (data) {
          if (data && data.success) {
            form.reset();
            say('ok',
              '<p>Thank you — your enquiry is on its way.</p>' +
              '<p style="font-weight:400;margin-top:.5rem">' +
              'We answer every enquiry within 48 hours. If it is urgent, ' +
              callLink + ' or ' + mailLink + '.</p>');
          } else {
            say('fail',
              '<p>Sorry — your message did not send.</p>' + tail);
          }
        })
        .catch(function () {
          say('fail',
            '<p>Sorry — your message did not send. You may be offline.</p>' + tail);
        })
        .then(function () {
          if (submit) {
            submit.disabled = false;
            submit.removeAttribute('aria-busy');
            submit.textContent = 'Send my quote request';
          }
        });
    });
  }

  /* -------------------------------------------------- 3. project filters --- */
  function initFilters() {
    var bar = document.querySelector('[data-filters]');
    if (!bar) return;
    var buttons = Array.prototype.slice.call(bar.querySelectorAll('button[data-filter]'));
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-category]'));
    var empty = document.querySelector('[data-filter-empty]');

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var want = button.getAttribute('data-filter');

        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
        items.forEach(function (item) {
          var show = want === 'all' || item.getAttribute('data-category').indexOf(want) !== -1;
          item.hidden = !show;
        });

        if (empty) {
          empty.hidden = items.some(function (i) { return !i.hidden; });
        }
      });
    });
  }

  /* ------------------------------------------------------- 4. lightbox --- */
  function initLightbox() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    if (!links.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.hidden = true;
    box.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous photo">&#8249;</button>' +
      '<figure class="lightbox__figure"><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next photo">&#8250;</button>';
    document.body.appendChild(box);

    var img = box.querySelector('img');
    var cap = box.querySelector('figcaption');
    var current = 0;
    var lastFocus = null;

    function show(i) {
      current = (i + links.length) % links.length;
      img.src = links[current].getAttribute('href');
      img.alt = links[current].getAttribute('data-caption') || '';
      cap.textContent = links[current].getAttribute('data-caption') || '';
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      box.querySelector('.lightbox__close').focus();
    }
    function close() {
      box.hidden = true;
      document.body.style.removeProperty('overflow');
      if (lastFocus) lastFocus.focus();
    }

    links.forEach(function (link, i) { link.addEventListener('click', function (e) { e.preventDefault(); open(i); }); });
    box.querySelector('.lightbox__close').addEventListener('click', close);
    box.querySelector('.lightbox__nav--prev').addEventListener('click', function () { show(current - 1); });
    box.querySelector('.lightbox__nav--next').addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
      // Keep Tab inside the dialog.
      if (e.key === 'Tab') {
        var focusable = box.querySelectorAll('button');
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------- 5. before / after slider --- */
  function initComparisons() {
    var comparisons = Array.prototype.slice.call(document.querySelectorAll('[data-compare]'));
    comparisons.forEach(function (el) {
      var before = el.querySelector('[data-compare-before]');
      var after  = el.querySelector('[data-compare-after]');
      var handle = el.querySelector('[data-compare-handle]');
      var input  = el.querySelector('input[type="range"]');
      if (!before || !after || !input) return;

      function set(percent) {
        percent = Math.max(0, Math.min(100, percent));
        after.style.setProperty('--split', percent + '%');
        if (handle) handle.style.left = percent + '%';
        input.setAttribute('aria-valuenow', String(Math.round(percent)));
      }

      // Pointer drag
      el.addEventListener('pointerdown', function (e) {
        var rect = el.getBoundingClientRect();
        var update = function (ev) { set(((ev.clientX - rect.left) / rect.width) * 100); };
        update(e);
        el.setPointerCapture(e.pointerId);
        var move = function (ev) { update(ev); };
        var up = function () {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
      });

      // Keyboard — the range input is focusable and announced properly
      input.addEventListener('input', function () { set(Number(input.value)); });
      set(Number(input.value || 50));
    });
  }

  /* --------------------------------------------------------------- boot --- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initNav();
    initForm();
    initFilters();
    initLightbox();
    initComparisons();
  });
})();