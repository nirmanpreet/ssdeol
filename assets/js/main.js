"use strict";
(() => {
  // src/js/util.ts
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }
  function $$(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }
  function attr(selector, name, scope = document) {
    return scope.querySelector(`${selector}[${name}]`);
  }
  var prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function money(value) {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
    return `$${Math.round(value).toLocaleString("en-AU")}`;
  }
  function esc(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // src/js/components/nav.ts
  function initNav() {
    const toggle = $("[data-nav-toggle]");
    const nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;
    const close = () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.removeAttribute("data-open");
      document.body.style.removeProperty("overflow");
    };
    const open = () => {
      toggle.setAttribute("aria-expanded", "true");
      nav.setAttribute("data-open", "");
      document.body.style.overflow = "hidden";
    };
    toggle.addEventListener("click", () => {
      if (toggle.getAttribute("aria-expanded") === "true") close();
      else open();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        close();
        toggle.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 900) close();
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) close();
    });
  }
  function initHeaderShadow() {
    const header = $("[data-header]");
    if (!header) return;
    const apply = () => {
      header.toggleAttribute("data-scrolled", window.scrollY > 8);
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
  }
  ready(() => {
    initNav();
    initHeaderShadow();
  });

  // src/js/components/form.ts
  function statusHtml(kind, html) {
    return `<p class="form__status-title">${kind === "ok" ? "Enquiry sent" : "We could not send that"}</p>${html}`;
  }
  function initForm() {
    const form = $("[data-quote-form]");
    if (!form) return;
    const cfg = {
      action: form.action,
      phone: form.getAttribute("data-phone") ?? "",
      email: form.getAttribute("data-email") ?? ""
    };
    const status = $("[data-form-status]", form);
    const submit = $("[data-form-submit]", form);
    const required = Array.from(form.querySelectorAll("[required]"));
    const telLink = cfg.phone ? `<a href="tel:${cfg.phone.replace(/[^\d+]/g, "")}">call us on ${cfg.phone}</a>` : "call us";
    const mailLink = cfg.email ? `<a href="mailto:${cfg.email}">email us</a>` : "email us";
    const slotFor = (field) => {
      const wrap = field.closest(".field");
      if (!wrap) return null;
      let slot = wrap.querySelector("[data-error-for]");
      if (!slot) {
        slot = document.createElement("p");
        slot.className = "field__error";
        slot.id = `${field.id || "field"}-error`;
        wrap.appendChild(slot);
      }
      return slot;
    };
    function messageFor(field) {
      const value = (field.value ?? "").trim();
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        return field.checked ? "" : "Please tick this box to continue.";
      }
      if (field instanceof HTMLInputElement && field.type === "email") {
        if (!value) return "Please enter your email address.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? "" : "That email address does not look right.";
      }
      return value ? "" : "Please fill this in.";
    }
    function validate(field) {
      const message = messageFor(field);
      const slot = slotFor(field);
      if (message) {
        field.setAttribute("aria-invalid", "true");
        if (slot) {
          slot.textContent = message;
          if (!field.hasAttribute("aria-describedby")) field.setAttribute("aria-describedby", slot.id);
        }
        return false;
      }
      field.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
      return true;
    }
    required.forEach((field) => {
      field.addEventListener("blur", () => {
        if ((field.value ?? "").trim()) validate(field);
      });
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validate(field);
      });
    });
    function announce(kind, html) {
      if (!status) return;
      status.className = `form__status form__status--${kind}`;
      status.innerHTML = html;
      status.focus();
      window.scrollTo({ top: Math.max(0, status.offsetTop - 160), behavior: "smooth" });
    }
    function busy(on) {
      if (!submit) return;
      submit.disabled = on;
      submit.toggleAttribute("aria-busy", on);
      submit.textContent = on ? "Sending\u2026" : "Send my quote request";
    }
    form.addEventListener("submit", (event) => {
      var _a;
      event.preventDefault();
      const bad = required.filter((f) => !validate(f));
      if (bad.length) {
        announce("fail", "<p>Please check the highlighted fields and try again.</p>");
        (_a = bad[0]) == null ? void 0 : _a.focus();
        return;
      }
      const honey = form.querySelector('[name="botcheck"]');
      if (honey == null ? void 0 : honey.checked) {
        form.reset();
        return;
      }
      busy(true);
      const payload = new FormData(form);
      payload.append("from_name", "SS Deol Website");
      fetch(cfg.action, {
        method: "POST",
        body: payload,
        headers: { Accept: "application/json" }
      }).then((res) => res.json().catch(() => ({ success: res.ok }))).then((data) => {
        if (data == null ? void 0 : data.success) {
          form.reset();
          announce(
            "ok",
            statusHtml(
              "ok",
              `<p>Your enquiry is on its way. We answer every enquiry within 48 hours.</p>
               <p>If it is urgent, ${telLink} or ${mailLink} instead.</p>`
            )
          );
        } else {
          announce("fail", statusHtml("fail", `<p>That usually means a temporary problem. Please try again, or ${telLink} / ${mailLink}.</p>`));
        }
      }).catch(() => {
        announce("fail", statusHtml("fail", `<p>You may be offline. Please try again, or ${telLink} / ${mailLink}.</p>`));
      }).finally(() => busy(false));
    });
  }
  ready(() => initForm());

  // src/js/components/gallery.ts
  function initFilters() {
    const bar = $("[data-filters]");
    if (!bar) return;
    const buttons = $$("[data-filter]", bar);
    const items = $$("[data-category]");
    const empty = $("[data-filter-empty]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const want = button.getAttribute("data-filter") ?? "all";
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        items.forEach((item) => {
          const tags = item.getAttribute("data-category") ?? "";
          item.hidden = !(want === "all" || tags.split(" ").includes(want));
        });
        empty == null ? void 0 : empty.toggleAttribute("hidden", !items.every((i) => i.hidden));
      });
    });
  }
  function initLightbox() {
    var _a, _b, _c;
    const links = $$("[data-lightbox]");
    if (!links.length) return;
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Photo viewer");
    box.hidden = true;
    box.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Close">&times;</button>
    <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous photo">&#8249;</button>
    <figure class="lightbox__figure"><img alt=""><figcaption></figcaption></figure>
    <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next photo">&#8250;</button>`;
    document.body.appendChild(box);
    const img = $(".lightbox__figure img", box);
    const caption = $(".lightbox__figure figcaption", box);
    if (!img || !caption) return;
    let index = 0;
    let lastFocus = null;
    const show = (i) => {
      index = (i + links.length) % links.length;
      const link = links[index];
      if (!link) return;
      img.src = link.getAttribute("href") ?? "";
      img.alt = link.getAttribute("data-caption") ?? "";
      caption.textContent = link.getAttribute("data-caption") ?? "";
    };
    const open = (i) => {
      var _a2;
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = "hidden";
      (_a2 = $(".lightbox__close", box)) == null ? void 0 : _a2.focus();
    };
    const close = () => {
      box.hidden = true;
      document.body.style.removeProperty("overflow");
      lastFocus == null ? void 0 : lastFocus.focus();
    };
    links.forEach((link, i) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        open(i);
      });
    });
    (_a = $(".lightbox__close", box)) == null ? void 0 : _a.addEventListener("click", close);
    (_b = $(".lightbox__nav--prev", box)) == null ? void 0 : _b.addEventListener("click", () => show(index - 1));
    (_c = $(".lightbox__nav--next", box)) == null ? void 0 : _c.addEventListener("click", () => show(index + 1));
    box.addEventListener("click", (e) => {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "Tab") {
        const focusable = $$("button", box);
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
  function initComparisons() {
    const blocks = $$("[data-compare]");
    if (!blocks.length) return;
    blocks.forEach((block) => {
      const range = $('input[type="range"]', block);
      const after = $("[data-compare-after]", block);
      const handle = $("[data-compare-handle]", block);
      if (!range || !after) return;
      const set = (percent) => {
        const clamped = Math.max(0, Math.min(100, percent));
        after.style.setProperty("--split", `${clamped}%`);
        if (handle) handle.style.left = `${clamped}%`;
        range.setAttribute("aria-valuenow", String(Math.round(clamped)));
      };
      block.addEventListener("pointerdown", (e) => {
        const rect = block.getBoundingClientRect();
        const move = (ev) => set((ev.clientX - rect.left) / rect.width * 100);
        move(e);
        block.setPointerCapture(e.pointerId);
        const onMove = (ev) => move(ev);
        const onUp = () => {
          block.removeEventListener("pointermove", onMove);
          block.removeEventListener("pointerup", onUp);
          block.removeEventListener("pointercancel", onUp);
        };
        block.addEventListener("pointermove", onMove);
        block.addEventListener("pointerup", onUp);
        block.addEventListener("pointercancel", onUp);
      });
      range.addEventListener("input", () => set(Number(range.value)));
      set(Number(range.value || 50));
    });
  }
  function initReveal() {
    const targets = $$("[data-reveal]");
    if (!targets.length) return;
    const showAll = () => targets.forEach((el) => el.classList.add("is-visible"));
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      showAll();
      return;
    }
    const revealReached = () => {
      const limit = window.innerHeight;
      for (const el of targets) {
        if (el.classList.contains("is-visible")) continue;
        if (el.getBoundingClientRect().top < limit) el.classList.add("is-visible");
      }
    };
    let queued = false;
    const onScroll = () => {
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
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      // A positive bottom margin starts the fade before the element is fully on
      // screen, so scrolling never reveals transparent text.
      { rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );
    targets.forEach((el) => io.observe(el));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    revealReached();
    window.setTimeout(showAll, 3e3);
    window.addEventListener("beforeprint", showAll);
  }
  function initPaintStroke() {
    var _a;
    const stroke = attr("[data-hero-stroke]", "data-hero-stroke");
    if (!stroke) return;
    if (prefersReducedMotion()) {
      stroke.classList.add("is-drawn");
      return;
    }
    const length = ((_a = stroke.getTotalLength) == null ? void 0 : _a.call(stroke)) ?? 0;
    if (!length) return;
    stroke.style.strokeDasharray = String(length);
    stroke.style.strokeDashoffset = String(length);
    requestAnimationFrame(() => stroke.classList.add("is-drawn"));
  }
  ready(() => {
    initFilters();
    initLightbox();
    initComparisons();
    initReveal();
    initPaintStroke();
  });

  // src/js/components/calculator.ts
  function readConfig() {
    const el = $("[data-calculator-config]");
    if (!el) return null;
    try {
      return JSON.parse(el.textContent ?? "{}");
    } catch {
      console.error("[calculator] could not parse its configuration");
      return null;
    }
  }
  function serviceTitle(slug) {
    var _a;
    const opt = $(`[data-calc="service"] option[value="${CSS.escape(slug)}"]`);
    return ((_a = opt == null ? void 0 : opt.textContent) == null ? void 0 : _a.trim()) ?? slug;
  }
  function initCalculator() {
    var _a, _b, _c;
    const root = $("[data-calculator]");
    if (!root) return;
    const form = $("[data-calc-form]", root);
    const output = $("[data-calc-output]", root);
    if (!form || !output) return;
    const cfg = readConfig();
    if (!cfg || !cfg.configured || cfg.rates.length === 0) {
      (_a = $("[data-calc-unconfigured]", root)) == null ? void 0 : _a.removeAttribute("hidden");
      form.setAttribute("hidden", "");
      output.setAttribute("hidden", "");
      (_b = $("[data-calc-details]", root)) == null ? void 0 : _b.setAttribute("hidden", "");
      return;
    }
    (_c = $("[data-calc-unconfigured]", root)) == null ? void 0 : _c.setAttribute("hidden", "");
    form.removeAttribute("hidden");
    const rateFor = (slug) => cfg.rates.find((r) => r.slug === slug);
    const serviceField = $('[data-calc="service"]', form);
    const propertyField = $('[data-calc="property"]', form);
    const sizeField = $('[data-calc="size"]', form);
    const timingField = $('[data-calc="timing"]', form);
    const areaField = $('[data-calc="area"]', form);
    const sizeNote = $("[data-calc-sizenote]", root);
    function updateSizeNote() {
      if (!sizeNote || !sizeField || !cfg) return;
      sizeNote.textContent = cfg.sizeNotes[sizeField.value] ?? "";
    }
    const calculate = () => {
      var _a2, _b2, _c2, _d;
      if (!cfg || !serviceField || !propertyField || !sizeField || !timingField || !output) return;
      const rate = rateFor(serviceField.value);
      if (!rate) return;
      const bandArea = Number(sizeField.value);
      const exactArea = areaField ? Number(areaField.value) : 0;
      const area = exactArea > 0 ? exactArea : bandArea;
      const propertyFactor = cfg.propertyFactors[propertyField.value] ?? 1;
      const outOfHours = timingField.value === "out-of-hours" ? rate.outOfHours ?? 1.25 : 1;
      const baseLow = area * rate.low * propertyFactor * outOfHours;
      const baseHigh = area * rate.high * propertyFactor * outOfHours;
      const floor = (rate.minimum ?? 0) * propertyFactor * outOfHours;
      const low = Math.max(baseLow, floor);
      const high = Math.max(baseHigh, floor * 1.3);
      const service = serviceTitle(serviceField.value);
      const areaLabel = exactArea > 0 ? `${exactArea.toLocaleString("en-AU")} m\xB2` : ((_b2 = (_a2 = sizeField.options[sizeField.selectedIndex]) == null ? void 0 : _a2.text) == null ? void 0 : _b2.trim()) ?? "";
      output.innerHTML = `
      <p class="calc__eyebrow">Indicative range</p>
      <p class="calc__figure">${esc(money(low))} <span aria-hidden="true">\u2013</span> ${esc(money(high))}</p>
      <p class="calc__basis">
        ${esc(service)} &middot; ${esc(areaLabel)}
        ${outOfHours > 1 ? "&middot; <strong>after-hours</strong>" : ""}
      </p>
      <ul class="calc__caveats">
        ${cfg.disclaimers.map((d) => `<li>${esc(d)}</li>`).join("")}
      </ul>
    `;
      output.removeAttribute("hidden");
      (_c2 = $("[data-calc-summary]", form)) == null ? void 0 : _c2.setAttribute(
        "value",
        `${service} \u2014 approx ${money(low)}\u2013${money(high)} (${areaLabel})`
      );
      (_d = $("[data-calc-area-value]", form)) == null ? void 0 : _d.setAttribute("value", String(area));
    };
    form.addEventListener("submit", (e) => {
      var _a2;
      e.preventDefault();
      calculate();
      const details = $("[data-calc-details]", root);
      details == null ? void 0 : details.scrollIntoView({ block: "start", behavior: "smooth" });
      (_a2 = $('[data-calc="name"]', form)) == null ? void 0 : _a2.focus();
    });
    form.addEventListener("change", (e) => {
      const t = e.target;
      if (t.matches('[data-calc="size"]')) updateSizeNote();
    });
    [serviceField, propertyField, sizeField, timingField].forEach((el) => {
      el == null ? void 0 : el.addEventListener("change", () => {
        if (areaField) areaField.placeholder = "or type your own m\xB2";
        calculate();
      });
    });
    if (areaField) areaField.addEventListener("input", calculate);
    updateSizeNote();
    calculate();
  }
  ready(() => {
    initCalculator();
    $$("[data-calc-details]").forEach((el) => {
      if (!el.closest("[data-calculator]")) return;
      el.hidden = false;
    });
  });
})();
