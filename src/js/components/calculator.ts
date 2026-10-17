/**
 * INSTANT QUOTE CALCULATOR
 * ---------------------------------------------------------------------------
 * The single highest-value thing on this site. A facility manager has no idea
 * what a repaint costs and will not enquire until they have a number. This
 * gives them one in about twenty seconds, then captures their details.
 *
 * HONESTY RULES BUILT INTO THIS, ON PURPOSE:
 *   1. Every rate lives in _data/pricing.yml, not here, so the owner can
 *      correct them without touching code.
 *   2. Ranges are labelled INDICATIVE and always say a site visit is needed.
 *   3. If the rate table has not been filled in, the calculator refuses to
 *      invent numbers — it shows the enquiry form instead. This is checked via
 *      the `configured` flag in pricing.yml.
 *
 * Nothing here is a quote. It is a range to help someone decide whether to
 * pick up the phone.
 */
import { $, $$, ready, money, esc } from '../util';

interface ServiceRate {
  slug: string;
  /** Indicative rate per m², low and high. */
  low: number;
  high: number;
  /** Optional fixed minimum charge for a small job. */
  minimum?: number;
  /** After-hours / shutdown premium, as a multiplier. */
  outOfHours?: number;
}

interface CalculatorConfig {
  configured: boolean;
  /** Property-type multiplier, e.g. a warehouse is cheaper per m² than a lab. */
  propertyFactors: Record<string, number>;
  /** Size bands in m², matched with a note about how much they scale. */
  sizeNotes: Record<string, string>;
  rates: ServiceRate[];
  disclaimers: string[];
}

function readConfig(): CalculatorConfig | null {
  // NB: the wrapper and the JSON block both used data-calculator, so this
  // selector matched the <section> and read its text instead of the JSON.
  const el = $<HTMLElement>('[data-calculator-config]');
  if (!el) return null;
  try {
    return JSON.parse(el.textContent ?? '{}') as CalculatorConfig;
  } catch {
    // A malformed data blob must never take the page down with it.
    console.error('[calculator] could not parse its configuration');
    return null;
  }
}

function serviceTitle(slug: string): string {
  const opt = $<HTMLOptionElement>(`[data-calc="service"] option[value="${CSS.escape(slug)}"]`);
  return opt?.textContent?.trim() ?? slug;
}

export function initCalculator(): void {
  const root = $<HTMLElement>('[data-calculator]');
  if (!root) return;

  const form = $<HTMLFormElement>('[data-calc-form]', root);
  const output = $<HTMLElement>('[data-calc-output]', root);
  if (!form || !output) return;

  const cfg = readConfig();

  // Not configured yet -> do not make numbers up. Show the enquiry form only.
  if (!cfg || !cfg.configured || cfg.rates.length === 0) {
    $<HTMLElement>('[data-calc-unconfigured]', root)?.removeAttribute('hidden');
    form.setAttribute('hidden', '');
    output.setAttribute('hidden', '');
    $<HTMLElement>('[data-calc-details]', root)?.setAttribute('hidden', '');
    return;
  }

  // Configured: reveal the controls. The template ships them hidden so that a
  // visitor with JavaScript disabled, or a page where the config failed to
  // parse, never sees a dead calculator.
  $<HTMLElement>('[data-calc-unconfigured]', root)?.setAttribute('hidden', '');
  form.removeAttribute('hidden');

  const rateFor = (slug: string): ServiceRate | undefined =>
    cfg.rates.find((r) => r.slug === slug);

  const serviceField = $<HTMLSelectElement>('[data-calc="service"]', form);
  const propertyField = $<HTMLSelectElement>('[data-calc="property"]', form);
  const sizeField = $<HTMLSelectElement>('[data-calc="size"]', form);
  const timingField = $<HTMLSelectElement>('[data-calc="timing"]', form);
  const areaField = $<HTMLInputElement>('[data-calc="area"]', form);
  const sizeNote = $<HTMLElement>('[data-calc-sizenote]', root);

  function updateSizeNote(): void {
    if (!sizeNote || !sizeField || !cfg) return;
    sizeNote.textContent = cfg.sizeNotes[sizeField.value] ?? '';
  }

  // An arrow const, not a hoisted `function` — TypeScript only carries the
  // null-guard narrowing above into closures that are assigned, which keeps
  // every `form` reference below correctly typed as non-null.
  const calculate = (): void => {
    if (!cfg || !serviceField || !propertyField || !sizeField || !timingField || !output) return;

    const rate = rateFor(serviceField.value);
    if (!rate) return;

    // Both a size band and an exact m² are supported; the band is a fallback.
    const bandArea = Number(sizeField.value);
    const exactArea = areaField ? Number(areaField.value) : 0;
    const area = exactArea > 0 ? exactArea : bandArea;

    const propertyFactor = cfg.propertyFactors[propertyField.value] ?? 1;
    const outOfHours = timingField.value === 'out-of-hours' ? (rate.outOfHours ?? 1.25) : 1;

    const baseLow = area * rate.low * propertyFactor * outOfHours;
    const baseHigh = area * rate.high * propertyFactor * outOfHours;

    // Small jobs still cost a mobilisation, so never quote a silly figure.
    const floor = (rate.minimum ?? 0) * propertyFactor * outOfHours;
    const low = Math.max(baseLow, floor);
    const high = Math.max(baseHigh, floor * 1.3);

    const service = serviceTitle(serviceField.value);
    const areaLabel = exactArea > 0
      ? `${exactArea.toLocaleString('en-AU')} m²`
      : sizeField.options[sizeField.selectedIndex]?.text?.trim() ?? '';

    output.innerHTML = `
      <p class="calc__eyebrow">Indicative range</p>
      <p class="calc__figure">${esc(money(low))} <span aria-hidden="true">–</span> ${esc(money(high))}</p>
      <p class="calc__basis">
        ${esc(service)} &middot; ${esc(areaLabel)}
        ${outOfHours > 1 ? '&middot; <strong>after-hours</strong>' : ''}
      </p>
      <ul class="calc__caveats">
        ${cfg.disclaimers.map((d) => `<li>${esc(d)}</li>`).join('')}
      </ul>
    `;
    output.removeAttribute('hidden');

    // Pre-fill the hidden field the form will actually send, so the office
    // knows what the visitor was quoted without having to guess.
    $<HTMLInputElement>('[data-calc-summary]', form)?.setAttribute(
      'value',
      `${service} — approx ${money(low)}–${money(high)} (${areaLabel})`,
    );
    $<HTMLInputElement>('[data-calc-area-value]', form)?.setAttribute('value', String(area));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();

    // Move straight to the details step so the visitor is already invested.
    const details = $<HTMLElement>('[data-calc-details]', root);
    details?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    $<HTMLInputElement>('[data-calc="name"]', form)?.focus();
  });

  form.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches('[data-calc="size"]')) updateSizeNote();
  });

  [serviceField, propertyField, sizeField, timingField].forEach((el) => {
    el?.addEventListener('change', () => {
      if (areaField) areaField.placeholder = 'or type your own m²';
      calculate();
    });
  });

  // Live estimate as they change their mind, without a page reload.
  if (areaField) areaField.addEventListener('input', calculate);

  updateSizeNote();
  calculate();
}

ready(() => {
  initCalculator();
  // Hide the hard-coded details block if the calculator is not in use.
  $$<HTMLElement>('[data-calc-details]').forEach((el) => {
    if (!el.closest('[data-calculator]')) return;
    el.hidden = false;
  });
});