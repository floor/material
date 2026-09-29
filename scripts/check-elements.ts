#!/usr/bin/env bun
// The elements in a real browser.
//
// Shadow roots, adopted stylesheets, form association, slots and accessible
// names need a browser: JSDOM has no layout, no ElementInternals and no
// accessibility tree. Each element is checked against the factory it wraps,
// rendered in light DOM with the full stylesheet, so a style that fails to
// cross into the shadow root shows as a difference.
//
//   bun run build && bun run scripts/check-elements.ts

import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

// Runs against the build: `bun run build` first, as CI does.
const bundle = await Bun.build({
  entrypoints: ["scripts/fixtures/elements.ts"],
  target: "browser",
  minify: false,
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/elements.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    if (path === "/away") return new Response("<!doctype html><p>away</p>", { headers: { "Content-Type": "text/html" } });
    if (path === "/restore") {
      // no-store keeps the page out of the back/forward cache, so going back
      // reloads it and the browser restores the form's state into it.
      return new Response(
        `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><form><m-switch id="r" name="r">Restored</m-switch>
<m-checkbox id="rc" name="rc">Restored checkbox</m-checkbox></form><a id="go" href="/away">away</a>
<script type="module" src="/elements.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
      );
    }
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;font-family:sans-serif}section{padding:8px}</style></head>
<body><main id="host"></main><script type="module" src="/elements.js"></script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

type Win = Window & Record<string, unknown>;
/** Icon markup for the icon-only elements, quoted with ' in attributes. */
const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';
const browser = await chromium.launch({ headless: true });
let checks = 0;
const check = (name: string): void => {
  checks++;
  console.log(`  ok ${name}`);
};

const fresh = async (page: Page, html: string): Promise<void> => {
  await page.evaluate((markup) => {
    const host = document.getElementById("host") as HTMLElement;
    host.innerHTML = markup;
  }, html);
  // connectedCallback runs synchronously; give observers and microtasks a turn
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
};

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as Win).ready === true);

  // ---------------------------------------------------------------- registration
  {
    const result = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: Record<string, (o?: object) => string> };
      const again = w.mtrl.defineSwitch();
      const custom = w.mtrl.defineSwitch({ prefix: "x" });
      return {
        again,
        custom,
        m: !!customElements.get("m-switch"),
        x: !!customElements.get("x-switch"),
        tab: !!customElements.get("m-tab"),
      };
    });
    assert.deepEqual(result, { again: "m-switch", custom: "x-switch", m: true, x: true, tab: true });
    check("define is idempotent and takes a prefix");
  }

  // ---------------------------------------------------------------- switch
  await fresh(
    page,
    `<form id="f"><m-switch id="s" name="wifi" value="yes">Wi-Fi</m-switch>
     <label for="s" id="outer">Outer label</label>
     <m-switch id="d" name="bt" checked>Bluetooth</m-switch></form>
     <section id="factory"></section>`
  );
  {
    const sw = page.getByRole("switch", { name: "Wi-Fi" });
    assert.equal(await sw.count(), 1, "the slotted text names the inner switch");
    check("switch: slotted label is the accessible name");

    await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      document.getElementById("s")?.addEventListener("change", (e) => {
        (w.events as unknown[]).push({ detail: (e as CustomEvent).detail, target: (e.target as Element).id });
      });
    });
    await sw.click();
    let state = await page.evaluate(() => {
      const w = window as unknown as Win;
      const s = document.getElementById("s") as HTMLElement & { checked: boolean };
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { events: w.events, checked: s.checked, wifi: form.get("wifi"), bt: form.get("bt") };
    });
    assert.deepEqual(state.events, [{ detail: { checked: true, value: "yes" }, target: "s" }]);
    assert.equal(state.checked, true);
    assert.equal(state.wifi, "yes");
    assert.equal(state.bt, "on");
    check("switch: a click dispatches one change from the host, and the form sees the value");

    state = await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      const s = document.getElementById("s") as HTMLElement & { checked: boolean };
      s.checked = false;
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { events: w.events, checked: s.checked, wifi: form.get("wifi"), bt: form.get("bt") };
    });
    assert.deepEqual(state.events, []);
    assert.equal(state.checked, false);
    assert.equal(state.wifi, null);
    check("switch: setting the property fires no event and updates the form value");

    await page.click("#outer");
    assert.equal(await page.evaluate(() => (document.getElementById("s") as HTMLElement & { checked: boolean }).checked), true);
    check("switch: an outer <label for> toggles it");

    const reset = await page.evaluate(() => {
      (document.getElementById("f") as HTMLFormElement).reset();
      const get = (id: string): boolean => (document.getElementById(id) as HTMLElement & { checked: boolean }).checked;
      return { s: get("s"), d: get("d") };
    });
    assert.deepEqual(reset, { s: false, d: true });
    check("switch: form.reset() restores the checked attribute");

    const validity = await page.evaluate(() => {
      const s = document.getElementById("s") as HTMLElement;
      s.setAttribute("required", "");
      const form = document.getElementById("f") as HTMLFormElement;
      const invalid = form.checkValidity();
      (s as HTMLElement & { checked: boolean }).checked = true;
      return { invalid, valid: form.checkValidity() };
    });
    assert.deepEqual(validity, { invalid: false, valid: true });
    check("switch: required reports validity to the form");

    const disabled = await page.evaluate(() => {
      const s = document.getElementById("s") as HTMLElement;
      s.setAttribute("disabled", "");
      return s.shadowRoot?.querySelector("input")?.disabled;
    });
    assert.equal(disabled, true);
    check("switch: the disabled attribute disables the inner input");

    // Same look as the factory in light DOM with the full stylesheet.
    const parity = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createSwitch: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createSwitch({ label: "Bluetooth", checked: true });
      document.getElementById("factory")?.append(factory.element);
      const element = (document.getElementById("d") as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
      const measure = (root: HTMLElement): Record<string, string | number> => {
        const track = root.querySelector('[class*="switch__track"]') as HTMLElement;
        const label = root.querySelector("label") as HTMLElement;
        const t = track.getBoundingClientRect();
        return {
          trackW: t.width, trackH: t.height,
          trackBg: getComputedStyle(track).backgroundColor,
          labelColor: getComputedStyle(label).color,
          labelFont: getComputedStyle(label).font,
        };
      };
      return { factory: measure(factory.element), element: measure(element) };
    });
    assert.deepEqual(parity.element, parity.factory);
    check("switch: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- button
  await fresh(
    page,
    `<form id="f" onsubmit="event.preventDefault(); window.submits = (window.submits || 0) + 1">
       <m-button id="b" type="submit" variant="filled">Save</m-button>
       <m-button id="plain">Cancel</m-button>
       <m-button id="attr" label="From attribute" variant="outlined"></m-button>
     </form><section id="factory"></section>`
  );
  {
    assert.equal(await page.getByRole("button", { name: "Save" }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "From attribute" }).count(), 1);
    check("button: slotted and attribute labels are accessible names");

    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    assert.equal(await page.evaluate(() => (window as unknown as Win).submits), 1);
    check("button: type=submit submits the host's form; a plain button does not");

    await page.evaluate(() => document.getElementById("b")?.setAttribute("disabled", ""));
    await page.getByRole("button", { name: "Save" }).click({ force: true });
    assert.equal(await page.evaluate(() => (window as unknown as Win).submits), 1);
    check("button: disabled does not submit");

    await page.evaluate(() => document.getElementById("attr")?.setAttribute("label", "Renamed"));
    assert.equal(await page.getByRole("button", { name: "Renamed" }).count(), 1);
    check("button: a label attribute change updates the name");

    const parity = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createButton: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createButton({ text: "Cancel" });
      document.getElementById("factory")?.append(factory.element);
      const element = (document.getElementById("plain") as HTMLElement).shadowRoot?.querySelector("button") as HTMLElement;
      const measure = (el: HTMLElement): Record<string, string | number> => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, color: s.color, radius: s.borderRadius, font: s.font };
      };
      return { factory: measure(factory.element), element: measure(element) };
    });
    assert.deepEqual(parity.element, parity.factory);
    check("button: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- icon button
  await fresh(
    page,
    `<form id="f" onsubmit="event.preventDefault(); window.submits = (window.submits || 0) + 1">
       <m-icon-button id="ib" aria-label="Favorite" toggle icon='${ICON}'></m-icon-button>
       <m-icon-button id="is" type="submit" aria-label="Send" icon='${ICON}'></m-icon-button>
       <m-icon-button id="ip" variant="filled" aria-label="Plain" icon='${ICON}'></m-icon-button>
       <m-icon-button id="iq" variant="filled" aria-label="Untouched" icon='${ICON}'></m-icon-button>
     </form><section id="factory"></section>`
  );
  {
    assert.equal(await page.getByRole("button", { name: "Favorite", pressed: false }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "Send" }).count(), 1);
    check("icon button: aria-label is the accessible name, toggle sets aria-pressed");

    await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      w.clicks = 0;
      const ib = document.getElementById("ib");
      ib?.addEventListener("toggle", (e) => (w.events as unknown[]).push((e as CustomEvent).detail));
      ib?.addEventListener("click", () => (w.clicks = (w.clicks as number) + 1));
    });
    await page.getByRole("button", { name: "Favorite" }).click();
    let state = await page.evaluate(() => {
      const w = window as unknown as Win;
      const ib = document.getElementById("ib") as HTMLElement & { selected: boolean };
      return { events: w.events, clicks: w.clicks, selected: ib.selected };
    });
    assert.deepEqual(state, { events: [{ selected: true }], clicks: 1, selected: true });
    assert.equal(await page.getByRole("button", { name: "Favorite", pressed: true }).count(), 1);
    check("icon button: a click dispatches one toggle from the host with the typed detail; click stays native");

    state = await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      const ib = document.getElementById("ib") as HTMLElement & { selected: boolean };
      ib.selected = false;
      return { events: w.events, clicks: w.clicks, selected: ib.selected };
    });
    assert.deepEqual(state, { events: [], clicks: 1, selected: false });
    assert.equal(await page.getByRole("button", { name: "Favorite", pressed: false }).count(), 1);
    check("icon button: setting selected fires no event");

    const updated = await page.evaluate(() => {
      const ib = document.getElementById("ib") as HTMLElement & { component: { element: HTMLElement } };
      const before = ib.component;
      ib.setAttribute("variant", "outlined");
      ib.setAttribute("aria-label", "Like");
      return { same: ib.component === before, outlined: ib.component.element.classList.contains("mtrl-icon-button--outlined") };
    });
    assert.deepEqual(updated, { same: true, outlined: true });
    assert.equal(await page.getByRole("button", { name: "Like" }).count(), 1);
    check("icon button: variant and aria-label attributes update the component in place");

    await page.evaluate(() => ((window as unknown as Win).submits = 0));
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByRole("button", { name: "Plain" }).click();
    assert.equal(await page.evaluate(() => (window as unknown as Win).submits), 1);
    check("icon button: type=submit submits the host's form; a plain one does not");

    const parity = await page.evaluate((icon) => {
      const w = window as unknown as Win & { mtrl: { createIconButton: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createIconButton({ icon, variant: "filled", ariaLabel: "Untouched" });
      document.getElementById("factory")?.append(factory.element);
      const element = (document.getElementById("iq") as HTMLElement).shadowRoot?.querySelector("button") as HTMLElement;
      const measure = (el: HTMLElement): Record<string, string | number> => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const svg = el.querySelector("svg") as SVGElement;
        return {
          w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, color: s.color, radius: s.borderRadius,
          iconW: Math.round(svg.getBoundingClientRect().width),
        };
      };
      return { factory: measure(factory.element), element: measure(element) };
    }, ICON);
    assert.deepEqual(parity.element, parity.factory);
    check("icon button: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- fab
  await fresh(
    page,
    `<form id="f" onsubmit="event.preventDefault(); window.submits = (window.submits || 0) + 1">
       <m-fab id="fb" aria-label="Compose" icon='${ICON}'></m-fab>
       <m-fab id="fs" type="submit" aria-label="Submit" icon='${ICON}'></m-fab>
       <m-fab id="fp" aria-label="Plain" icon='${ICON}'></m-fab>
     </form><section id="factory"></section>`
  );
  {
    assert.equal(await page.getByRole("button", { name: "Compose" }).count(), 1);
    check("fab: aria-label is the accessible name");

    const clicks = await page.evaluate(async () => {
      const fb = document.getElementById("fb") as HTMLElement;
      let count = 0;
      fb.addEventListener("click", () => count++);
      (fb.shadowRoot?.querySelector("button") as HTMLElement).click();
      return count;
    });
    assert.equal(clicks, 1);
    check("fab: a click reaches the host once, not re-dispatched");

    const updated = await page.evaluate(() => {
      const fb = document.getElementById("fb") as HTMLElement & { component: { element: HTMLButtonElement } };
      fb.setAttribute("variant", "tertiary");
      const tertiary = fb.component.element.classList.contains("mtrl-fab--tertiary");
      fb.setAttribute("disabled", "");
      return { tertiary, disabled: fb.component.element.disabled };
    });
    assert.deepEqual(updated, { tertiary: true, disabled: true });
    check("fab: a variant change recreates it, disabled disables the inner button");

    await page.evaluate(() => ((window as unknown as Win).submits = 0));
    await page.getByRole("button", { name: "Submit" }).click();
    assert.equal(await page.evaluate(() => (window as unknown as Win).submits), 1);
    check("fab: type=submit submits the host's form");

    const parity = await page.evaluate((icon) => {
      const w = window as unknown as Win & { mtrl: { createFab: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createFab({ icon, ariaLabel: "Plain" });
      document.getElementById("factory")?.append(factory.element);
      const element = (document.getElementById("fp") as HTMLElement).shadowRoot?.querySelector("button") as HTMLElement;
      const measure = (el: HTMLElement): Record<string, string | number> => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, color: s.color, radius: s.borderRadius, shadow: s.boxShadow };
      };
      return { factory: measure(factory.element), element: measure(element) };
    }, ICON);
    assert.deepEqual(parity.element, parity.factory);
    check("fab: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- extended fab
  await fresh(
    page,
    `<form id="f"><input id="txt" value="a">
       <m-extended-fab id="eb" icon='${ICON}'>Compose</m-extended-fab>
       <m-extended-fab id="ea" label="From attribute"></m-extended-fab>
       <m-extended-fab id="er" type="reset">Clear</m-extended-fab>
       <m-extended-fab id="ep">Untouched</m-extended-fab>
     </form><section id="factory"></section>`
  );
  {
    assert.equal(await page.getByRole("button", { name: "Compose" }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "From attribute" }).count(), 1);
    assert.equal(
      await page.evaluate(() => document.getElementById("eb")?.shadowRoot?.querySelector("button")?.hasAttribute("aria-label")),
      false
    );
    check("extended fab: slotted and attribute labels are accessible names");

    await page.evaluate(() => document.getElementById("ea")?.setAttribute("label", "Renamed"));
    assert.equal(await page.getByRole("button", { name: "Renamed" }).count(), 1);
    const size = await page.evaluate(() => {
      const eb = document.getElementById("eb") as HTMLElement & { component: { element: HTMLElement } };
      eb.setAttribute("size", "large");
      return eb.component.element.classList.contains("mtrl-extended-fab--large");
    });
    assert.equal(size, true);
    check("extended fab: label and size attribute changes update it");

    await page.fill("#txt", "b");
    await page.getByRole("button", { name: "Clear" }).click();
    assert.equal(await page.inputValue("#txt"), "a");
    check("extended fab: type=reset resets the host's form");

    const clicks = await page.evaluate(() => {
      const eb = document.getElementById("eb") as HTMLElement;
      let count = 0;
      eb.addEventListener("click", () => count++);
      (eb.shadowRoot?.querySelector("button") as HTMLElement).click();
      return count;
    });
    assert.equal(clicks, 1);
    check("extended fab: a click reaches the host once, not re-dispatched");

    const parity = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createExtendedFab: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createExtendedFab({ text: "Untouched" });
      document.getElementById("factory")?.append(factory.element);
      const element = (document.getElementById("ep") as HTMLElement).shadowRoot?.querySelector("button") as HTMLElement;
      const measure = (el: HTMLElement): Record<string, string | number> => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, color: s.color, radius: s.borderRadius, font: s.font };
      };
      return { factory: measure(factory.element), element: measure(element) };
    });
    assert.deepEqual(parity.element, parity.factory);
    check("extended fab: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- checkbox
  await fresh(
    page,
    `<form id="f"><m-checkbox id="c" name="agree" value="yes">Agree</m-checkbox>
     <label for="c" id="outer">Outer label</label>
     <m-checkbox id="d" name="news" checked>News</m-checkbox></form>
     <section id="factory"></section>`
  );
  {
    const box = page.getByRole("checkbox", { name: "Agree" });
    assert.equal(await box.count(), 1, "the slotted text names the inner checkbox");
    check("checkbox: slotted label is the accessible name");

    await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      document.getElementById("c")?.addEventListener("change", (e) => {
        (w.events as unknown[]).push({ detail: (e as CustomEvent).detail, target: (e.target as Element).id });
      });
    });
    await box.click();
    let state = await page.evaluate(() => {
      const w = window as unknown as Win;
      const c = document.getElementById("c") as HTMLElement & { checked: boolean };
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { events: w.events, checked: c.checked, agree: form.get("agree"), news: form.get("news") };
    });
    assert.deepEqual(state.events, [{ detail: { checked: true, value: "yes" }, target: "c" }]);
    assert.equal(state.checked, true);
    assert.equal(state.agree, "yes");
    assert.equal(state.news, "on");
    check("checkbox: a click dispatches one change from the host, and the form sees the value");

    state = await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      const c = document.getElementById("c") as HTMLElement & { checked: boolean };
      c.checked = false;
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { events: w.events, checked: c.checked, agree: form.get("agree"), news: form.get("news") };
    });
    assert.deepEqual(state.events, []);
    assert.equal(state.checked, false);
    assert.equal(state.agree, null);
    check("checkbox: setting the property fires no event and updates the form value");

    const mixed = await page.evaluate(() => {
      const w = window as unknown as Win;
      const c = document.getElementById("c") as HTMLElement & { indeterminate: boolean };
      c.indeterminate = true;
      const input = c.shadowRoot?.querySelector("input") as HTMLInputElement;
      return { events: w.events, indeterminate: c.indeterminate, input: input.indeterminate };
    });
    assert.deepEqual(mixed, { events: [], indeterminate: true, input: true });
    await box.click();
    const cleared = await page.evaluate(() => {
      const c = document.getElementById("c") as HTMLElement & { indeterminate: boolean; checked: boolean };
      return { indeterminate: c.indeterminate, checked: c.checked };
    });
    assert.deepEqual(cleared, { indeterminate: false, checked: true });
    check("checkbox: indeterminate is a live property, cleared by a click");

    await page.evaluate(() => ((document.getElementById("c") as HTMLElement & { checked: boolean }).checked = false));
    await page.click("#outer");
    assert.equal(await page.evaluate(() => (document.getElementById("c") as HTMLElement & { checked: boolean }).checked), true);
    check("checkbox: an outer <label for> toggles it");

    const reset = await page.evaluate(() => {
      (document.getElementById("f") as HTMLFormElement).reset();
      const get = (id: string): boolean => (document.getElementById(id) as HTMLElement & { checked: boolean }).checked;
      return { c: get("c"), d: get("d") };
    });
    assert.deepEqual(reset, { c: false, d: true });
    check("checkbox: form.reset() restores the checked attribute");

    const validity = await page.evaluate(() => {
      const c = document.getElementById("c") as HTMLElement;
      c.setAttribute("required", "");
      const form = document.getElementById("f") as HTMLFormElement;
      const invalid = form.checkValidity();
      (c as HTMLElement & { checked: boolean }).checked = true;
      return { invalid, valid: form.checkValidity() };
    });
    assert.deepEqual(validity, { invalid: false, valid: true });
    check("checkbox: required reports validity to the form");

    const attributes = await page.evaluate(() => {
      const c = document.getElementById("c") as HTMLElement;
      c.setAttribute("error", "");
      c.setAttribute("disabled", "");
      const input = c.shadowRoot?.querySelector("input") as HTMLInputElement;
      return { invalid: input.getAttribute("aria-invalid"), disabled: input.disabled };
    });
    assert.deepEqual(attributes, { invalid: "true", disabled: true });
    check("checkbox: error and disabled attributes reach the inner input");

    const parity = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createCheckbox: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createCheckbox({ label: "News", checked: true });
      document.getElementById("factory")?.append(factory.element);
      const element = (document.getElementById("d") as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
      const measure = (root: HTMLElement): Record<string, string | number> => {
        const input = root.querySelector("input") as HTMLElement;
        const icon = root.querySelector('[class*="checkbox__icon"]') as HTMLElement;
        const label = root.querySelector("label") as HTMLElement;
        const b = input.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        return {
          boxW: b.width, boxH: b.height, labelW: Math.round(l.width), labelH: Math.round(l.height),
          boxBg: getComputedStyle(input).backgroundColor,
          boxBorder: getComputedStyle(input).border,
          iconColor: getComputedStyle(icon).color,
          labelColor: getComputedStyle(label).color,
          labelFont: getComputedStyle(label).font,
        };
      };
      return { factory: measure(factory.element), element: measure(element) };
    });
    assert.deepEqual(parity.element, parity.factory);
    check("checkbox: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- tabs
  await fresh(
    page,
    `<m-tabs id="t" value="t2"><m-tab value="t1">Flights</m-tab><m-tab value="t2">Trips</m-tab>
     <m-tab value="t3" badge="3">Hotels</m-tab></m-tabs>`
  );
  {
    assert.equal(await page.getByRole("tab").count(), 3);
    assert.equal(await page.getByRole("tab", { name: "Trips", selected: true }).count(), 1);
    check("tabs: children declare the tabs, value selects one");

    await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      document.getElementById("t")?.addEventListener("change", (e) => (w.events as unknown[]).push((e as CustomEvent).detail));
    });
    await page.getByRole("tab", { name: "Flights" }).click();
    let state = await page.evaluate(() => ({
      events: (window as unknown as Win).events,
      value: (document.getElementById("t") as HTMLElement & { value: string }).value,
    }));
    assert.deepEqual(state, { events: [{ value: "t1" }], value: "t1" });
    check("tabs: a click dispatches change with the value");

    state = await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      const t = document.getElementById("t") as HTMLElement & { value: string };
      t.value = "t3";
      return { events: w.events, value: t.value };
    });
    assert.deepEqual(state, { events: [], value: "t3" });
    check("tabs: setting value fires no event");

    await page.evaluate(() => {
      const tab = document.createElement("m-tab");
      tab.setAttribute("value", "t4");
      tab.textContent = "Cars";
      document.getElementById("t")?.append(tab);
    });
    await page.waitForFunction(() => document.getElementById("t")?.shadowRoot?.querySelectorAll('[role="tab"]').length === 4);
    assert.equal(await page.getByRole("tab", { name: /Hotels/, selected: true }).count(), 1);
    check("tabs: a new child tab is added and the selection is kept");
  }

  // ---------------------------------------------------------------- sharing
  await fresh(page, `<section id="a"></section>`);
  {
    const shared = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: Record<string, (o?: object) => string> };
      const make = (): HTMLElement => {
        const el = document.createElement("m-switch");
        el.textContent = "Shared";
        document.getElementById("a")?.append(el);
        return el;
      };
      const a = make();
      // Framework adapters call define() on every mount.
      w.mtrl.defineSwitch();
      w.mtrl.defineSwitch();
      const b = make();
      const sheetsA = a.shadowRoot?.adoptedStyleSheets ?? [];
      const sheetsB = b.shadowRoot?.adoptedStyleSheets ?? [];
      return { count: sheetsA.length, same: sheetsA.length === sheetsB.length && sheetsA.every((sheet, i) => sheet === sheetsB[i]) };
    });
    assert.ok(shared.count > 0);
    assert.equal(shared.same, true, "every instance adopts the same stylesheet objects");
    check("styles: instances share one stylesheet per entry, however often define() runs");
  }

  // ---------------------------------------------------------------- tabs updates
  await fresh(
    page,
    `<m-tabs id="t" value="t1"><m-tab value="t1">Flights</m-tab><m-tab value="t2" badge="3">Trips</m-tab>
     <m-tab value="t3">Hotels</m-tab></m-tabs>`
  );
  {
    await page.getByRole("tab", { name: "Flights", exact: true }).focus();
    const settle = (): Promise<unknown> => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    const before = await page.evaluate(() => {
      const t = document.getElementById("t") as HTMLElement & { component: unknown };
      (window as unknown as Record<string, unknown>).__tabs = { component: t.component, focused: t.shadowRoot?.activeElement };
      return t.shadowRoot?.activeElement?.textContent?.trim();
    });
    assert.equal(before, "Flights");

    await page.evaluate(() => {
      const tabs = document.querySelectorAll("#t m-tab");
      tabs[1].setAttribute("badge", "4");
      tabs[2].textContent = "Stays";
      tabs[2].setAttribute("disabled", "");
    });
    await settle();
    const after = await page.evaluate(() => {
      const t = document.getElementById("t") as HTMLElement & {
        component: { getTabs: () => Array<{ getBadge: () => string }> };
      };
      const kept = (window as unknown as Record<string, { component: unknown; focused: unknown }>).__tabs;
      const buttons = [...(t.shadowRoot?.querySelectorAll('[role="tab"]') ?? [])] as HTMLElement[];
      return {
        sameComponent: t.component === kept.component,
        sameFocus: t.shadowRoot?.activeElement === kept.focused,
        labels: buttons.map((b) => b.textContent?.replace(/\s+/g, " ").trim()),
        badges: t.component.getTabs().map((tab) => tab.getBadge()),
        disabled: buttons.map((b) => b.hasAttribute("disabled") || b.getAttribute("aria-disabled") === "true"),
      };
    });
    assert.deepEqual(after.sameComponent, true, "a child update does not rebuild the tabs");
    assert.deepEqual(after.sameFocus, true, "the focused tab keeps focus");
    assert.equal(after.labels[1], "Trips");
    assert.equal(after.badges[1], "4");
    assert.equal(after.labels[2], "Stays");
    assert.deepEqual(after.disabled, [false, false, true]);
    check("tabs: badge, text and disabled changes update in place and keep focus");

    await page.evaluate(() => {
      const tab = document.createElement("m-tab");
      tab.setAttribute("value", "t9");
      tab.textContent = "Cars";
      const t = document.getElementById("t") as HTMLElement;
      t.insertBefore(tab, t.children[1]);
      t.children[3].remove();
    });
    await settle();
    const reordered = await page.evaluate(() => {
      const t = document.getElementById("t") as HTMLElement & { value: string };
      const buttons = [...(t.shadowRoot?.querySelectorAll('[role="tab"]') ?? [])] as HTMLElement[];
      return { labels: buttons.map((b) => b.textContent?.replace(/\s*\d+$/, "").trim()), value: t.value };
    });
    assert.deepEqual(reordered, { labels: ["Flights", "Cars", "Trips"], value: "t1" });
    check("tabs: an insertion in the middle and a removal keep order and selection");

    // Frameworks that set a custom element's props as properties (Solid does, always)
    // must reach the attributes <m-tabs> reads.
    const declared = await page.evaluate(async () => {
      const tab = document.createElement("m-tab") as HTMLElement & { value: string; disabled: boolean; badge: string };
      tab.value = "t7";
      tab.badge = "2";
      tab.disabled = true;
      tab.textContent = "Trains";
      document.getElementById("t")?.append(tab);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const t = document.getElementById("t") as HTMLElement & {
        component: { getTabs: () => Array<{ getValue: () => string; getBadge: () => string }> };
      };
      const last = t.component.getTabs().at(-1);
      return { attributes: [tab.getAttribute("value"), tab.getAttribute("badge"), tab.hasAttribute("disabled")], value: last?.getValue(), badge: last?.getBadge() };
    });
    assert.deepEqual(declared, { attributes: ["t7", "2", true], value: "t7", badge: "2" });
    check("tabs: <m-tab> properties write the attributes the tabs read");

    // A framework that renders before the elements are defined (Solid on the client
    // registers them on mount) sets properties on plain, not yet upgraded elements.
    const early = await page.evaluate(async () => {
      const w = window as unknown as { mtrl: { defineTabs: (o?: object) => string } };
      const tabs = document.createElement("late-tabs") as HTMLElement & { value?: string };
      for (const [value, label] of [["first", "First"], ["second", "Second"]]) {
        const tab = document.createElement("late-tab") as HTMLElement & { value?: string };
        tab.value = value;
        tab.textContent = label;
        tabs.append(tab);
      }
      document.getElementById("host")?.append(tabs);
      w.mtrl.defineTabs({ prefix: "late" });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const upgraded = tabs as HTMLElement & { component: { getTabs: () => Array<{ getValue: () => string }> } };
      return upgraded.component.getTabs().map((tab) => tab.getValue());
    });
    assert.deepEqual(early, ["first", "second"]);
    check("tabs: <m-tab> values set before the elements are defined are kept");
  }

  // ---------------------------------------------------------------- lifecycle
  await fresh(page, `<section id="a"><m-switch id="s" checked>Moved</m-switch></section><section id="b"></section>`);
  {
    const moved = await page.evaluate(async () => {
      const s = document.getElementById("s") as HTMLElement & { component: unknown; checked: boolean };
      const before = s.component;
      s.checked = false;
      document.getElementById("b")?.append(s);
      await Promise.resolve();
      await Promise.resolve();
      return { same: s.component === before, checked: s.checked };
    });
    assert.deepEqual(moved, { same: true, checked: false });
    check("lifecycle: a moved element keeps its component and state");

    const removed = await page.evaluate(async () => {
      const s = document.getElementById("s") as HTMLElement & { component: unknown };
      s.remove();
      await Promise.resolve();
      await Promise.resolve();
      const destroyed = s.component === null && s.shadowRoot?.childElementCount === 0;
      document.body.append(s);
      const back = s.component !== null;
      s.remove();
      return { destroyed, back };
    });
    assert.deepEqual(removed, { destroyed: true, back: true });
    check("lifecycle: removal destroys the component, and reconnection rebuilds it");

    const upgraded = await page.evaluate(() => {
      const el = document.createElement("m-late") as HTMLElement & { checked?: boolean };
      el.checked = true;
      document.getElementById("host")?.append(el);
      const w = window as unknown as Win & { mtrl: { switchElement: { element: CustomElementConstructor } } };
      customElements.define("m-late", class extends w.mtrl.switchElement.element {});
      return (el as HTMLElement & { checked: boolean }).checked;
    });
    assert.equal(upgraded, true);
    check("lifecycle: a property set before upgrade is kept");
  }

  // ---------------------------------------------------------------- form restore
  {
    const restorePage = await browser.newPage();
    await restorePage.goto(`http://127.0.0.1:${server.port}/restore`);
    await restorePage.waitForFunction(() => (window as unknown as Win).ready === true);
    await restorePage.getByRole("switch", { name: "Restored", exact: true }).click();
    await restorePage.getByRole("checkbox", { name: "Restored checkbox", exact: true }).click();
    await restorePage.click("#go");
    await restorePage.waitForURL(/\/away$/);
    await restorePage.goBack();
    await restorePage.waitForFunction(() => (window as unknown as Win).ready === true);
    const checked = (): Record<string, boolean> =>
      Object.fromEntries(["r", "rc"].map((id) => [id, (document.getElementById(id) as HTMLElement & { checked: boolean }).checked]));
    await restorePage.waitForFunction(() => ["r", "rc"].every((id) => (document.getElementById(id) as HTMLElement & { checked: boolean }).checked), undefined, { timeout: 5_000 })
      .catch(() => undefined);
    const restored = await restorePage.evaluate(checked);
    await restorePage.close();
    assert.equal(restored.r, true, "going back restores the switch the user turned on");
    check("forms: going back restores a switch's state");
    assert.equal(restored.rc, true, "going back restores the checkbox the user checked");
    check("forms: going back restores a checkbox's state");
  }

  // ---------------------------------------------------------------- theme
  await fresh(page, `<m-switch id="s" checked>Theme</m-switch><section id="factory"></section>`);
  {
    const colors = await page.evaluate(() => {
      const track = (): string => {
        const root = (document.getElementById("s") as HTMLElement).shadowRoot as ShadowRoot;
        // The token, not the painted colour, which is mid-transition right after the switch.
        return getComputedStyle(root.querySelector('[class*="switch__track"]') as HTMLElement)
          .getPropertyValue("--mtrl-sys-color-primary").trim();
      };
      const before = track();
      document.documentElement.dataset.theme = "ocean";
      const after = track();
      document.documentElement.dataset.theme = "baseline";
      return { before, after };
    });
    assert.notEqual(colors.before, colors.after);
    check("theme: a theme on the document reaches the shadow root");
  }

  assert.deepEqual(errors, [], "no page errors");
  check("no page errors");
} finally {
  await browser.close();
  server.stop(true);
}

console.log(`elements: ${checks} checks passed`);
