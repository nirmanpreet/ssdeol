/**
 * QUOTE FORM
 * ---------------------------------------------------------------------------
 * Posts to Web3Forms over fetch() so the visitor stays on the page.
 *
 * Accessibility notes, because this is the single most important control on
 * the site:
 *   - errors are tied to their input with aria-describedby, not just coloured
 *   - the result region is role="alert" so it is announced
 *   - a failed submission ALWAYS shows the phone number and email address, so
 *     a lead is never lost to a broken third-party service
 *   - the honeypot is silently swallowed rather than errored, so bots are not
 *     taught to try harder
 */
import { $, ready } from '../util';

interface FormConfig {
  action: string;
  phone: string;
  email: string;
}

function statusHtml(kind: 'ok' | 'fail', html: string): string {
  return `<p class="form__status-title">${kind === 'ok' ? 'Enquiry sent' : 'We could not send that'}</p>${html}`;
}

export function initForm(): void {
  const form = $<HTMLFormElement>('[data-quote-form]');
  if (!form) return;

  const cfg: FormConfig = {
    action: form.action,
    phone: form.getAttribute('data-phone') ?? '',
    email: form.getAttribute('data-email') ?? '',
  };

  const status = $<HTMLElement>('[data-form-status]', form);
  const submit = $<HTMLButtonElement>('[data-form-submit]', form);
  const required = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[required]'));

  const telLink = cfg.phone
    ? `<a href="tel:${cfg.phone.replace(/[^\d+]/g, '')}">call us on ${cfg.phone}</a>`
    : 'call us';
  const mailLink = cfg.email ? `<a href="mailto:${cfg.email}">email us</a>` : 'email us';

  /* --- inline validation -------------------------------------------------- */

  const slotFor = (field: Element): HTMLElement | null => {
    const wrap = field.closest('.field');
    if (!wrap) return null;
    let slot = wrap.querySelector<HTMLElement>('[data-error-for]');
    if (!slot) {
      slot = document.createElement('p');
      slot.className = 'field__error';
      slot.id = `${field.id || 'field'}-error`;
      wrap.appendChild(slot);
    }
    return slot;
  };

  function messageFor(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
    const value = (field.value ?? '').trim();

    if (field instanceof HTMLInputElement && field.type === 'checkbox') {
      return field.checked ? '' : 'Please tick this box to continue.';
    }
    if (field instanceof HTMLInputElement && field.type === 'email') {
      if (!value) return 'Please enter your email address.';
      // Deliberately permissive — catch typos, do not enforce RFC 5322.
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
        ? ''
        : 'That email address does not look right.';
    }
    return value ? '' : 'Please fill this in.';
  }

  function validate(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
    const message = messageFor(field);
    const slot = slotFor(field);

    if (message) {
      field.setAttribute('aria-invalid', 'true');
      if (slot) {
        slot.textContent = message;
        if (!field.hasAttribute('aria-describedby')) field.setAttribute('aria-describedby', slot.id);
      }
      return false;
    }

    field.removeAttribute('aria-invalid');
    if (slot) slot.textContent = '';
    return true;
  }

  required.forEach((field) => {
    field.addEventListener('blur', () => {
      if ((field.value ?? '').trim()) validate(field);
    });
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
    });
  });

  /* --- submit -------------------------------------------------------------- */

  function announce(kind: 'ok' | 'fail', html: string): void {
    if (!status) return;
    status.className = `form__status form__status--${kind}`;
    status.innerHTML = html;
    status.focus();
    // The sticky call bar covers the bottom of the viewport — scroll the
    // result above it.
    window.scrollTo({ top: Math.max(0, status.offsetTop - 160), behavior: 'smooth' });
  }

  function busy(on: boolean): void {
    if (!submit) return;
    submit.disabled = on;
    submit.toggleAttribute('aria-busy', on);
    submit.textContent = on ? 'Sending…' : 'Send my quote request';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const bad = required.filter((f) => !validate(f));
    if (bad.length) {
      announce('fail', '<p>Please check the highlighted fields and try again.</p>');
      bad[0]?.focus();
      return;
    }

    // Honeypot filled in => bot. Say nothing, just reset.
    const honey = form.querySelector<HTMLInputElement>('[name="botcheck"]');
    if (honey?.checked) {
      form.reset();
      return;
    }

    busy(true);

    const payload = new FormData(form);
    payload.append('from_name', 'SS Deol Website');

    fetch(cfg.action, {
      method: 'POST',
      body: payload,
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json().catch(() => ({ success: res.ok })))
      .then((data: { success?: boolean }) => {
        if (data?.success) {
          form.reset();
          announce(
            'ok',
            statusHtml(
              'ok',
              `<p>Your enquiry is on its way. We answer every enquiry within 48 hours.</p>
               <p>If it is urgent, ${telLink} or ${mailLink} instead.</p>`,
            ),
          );
        } else {
          announce('fail', statusHtml('fail', `<p>That usually means a temporary problem. Please try again, or ${telLink} / ${mailLink}.</p>`));
        }
      })
      .catch(() => {
        announce('fail', statusHtml('fail', `<p>You may be offline. Please try again, or ${telLink} / ${mailLink}.</p>`));
      })
      .finally(() => busy(false));
  });
}

ready(() => initForm());