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
<m-checkbox id="rc" name="rc">Restored checkbox</m-checkbox>
<m-textfield id="rt" name="rt" label="Restored text"></m-textfield></form><a id="go" href="/away">away</a>
<script type="module" src="/elements.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
      );
    }
    if (path === "/restore-slider") {
      return new Response(
        `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><form><m-slider id="rs" name="rs" value="30" aria-label="Restored"></m-slider>
<m-slider id="rr" name="rr" range value="20" second-value="80" aria-label="Restored range"></m-slider></form>
<a id="go" href="/away">away</a><script type="module" src="/elements.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
      );
    }
    if (path === "/restore-radios") {
      return new Response(
        `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><form><m-radios id="rr" name="rr" value="a" aria-label="Restored radios">
<m-radio value="a">Alpha</m-radio><m-radio value="b">Beta</m-radio></m-radios></form><a id="go" href="/away">away</a>
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

  // ---------------------------------------------------------------- slider
  await fresh(
    page,
    `<form id="f"><m-slider id="s" name="volume" value="30" aria-label="Volume"></m-slider>
     <m-slider id="r" name="price" range value="20" second-value="80" aria-label="Price"></m-slider>
     <fieldset id="fs"><m-slider id="d" name="off" value="50" aria-label="Off"></m-slider></fieldset></form>
     <section id="factory"></section>`
  );
  {
    type Slider = HTMLElement & { value: number; secondValue: number | null };
    const volume = page.getByRole("slider", { name: "Volume", exact: true });
    assert.equal(await volume.count(), 1, "aria-label names the inner slider handle");
    assert.equal(await volume.getAttribute("aria-valuenow"), "30");
    check("slider: aria-label names the handle, which carries role and value");

    await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      for (const id of ["s", "r"]) {
        for (const type of ["input", "change"]) {
          document.getElementById(id)?.addEventListener(type, (e) => {
            (w.events as unknown[]).push({ type, detail: (e as CustomEvent).detail, target: (e.target as Element).id });
          });
        }
      }
    });
    const read = (): Promise<Record<string, unknown>> =>
      page.evaluate(() => {
        const w = window as unknown as Win;
        const s = document.getElementById("s") as Slider;
        const form = new FormData(document.getElementById("f") as HTMLFormElement);
        const events = w.events;
        w.events = [];
        return { events, value: s.value, attribute: s.getAttribute("value"), volume: form.get("volume") };
      });

    await volume.focus();
    await page.keyboard.press("ArrowRight");
    assert.deepEqual(await read(), {
      events: [
        { type: "input", detail: { value: 31 }, target: "s" },
        { type: "change", detail: { value: 31 }, target: "s" },
      ],
      value: 31,
      attribute: "30",
      volume: "31",
    });
    check("slider: a key dispatches input then change from the host; the form sees the value, the attribute stays");

    const box = await page.evaluate(() => {
      const root = (document.getElementById("s") as HTMLElement).shadowRoot as ShadowRoot;
      const r = (root.querySelector('[class*="slider__container"]') as HTMLElement).getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.move(box.x + box.w * 0.6, box.y + box.h / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w * 0.75, box.y + box.h / 2, { steps: 4 });
    await page.mouse.up();
    const dragged = await read();
    const events = dragged.events as Array<{ type: string; detail: { value: number } }>;
    assert.ok(events.length >= 3, "input on press and while moving, change on release");
    assert.ok(events.slice(0, -1).every((e) => e.type === "input"));
    const last = events[events.length - 1];
    assert.equal(last.type, "change");
    assert.equal(last.detail.value, dragged.value);
    assert.ok(Math.abs(Number(dragged.value) - 75) <= 2, `dragged to about 75, got ${dragged.value}`);
    assert.equal(dragged.volume, String(dragged.value));
    check("slider: a drag dispatches input while moving and change on release");

    await page.evaluate(() => ((document.getElementById("s") as Slider).value = 10));
    const set = await read();
    const now = await volume.getAttribute("aria-valuenow");
    assert.deepEqual({ ...set, now }, { events: [], value: 10, attribute: "30", volume: "10", now: "10" });
    check("slider: setting the value property fires no event and updates the handle and the form value");

    await page.evaluate(() => document.getElementById("s")?.setAttribute("max", "20"));
    assert.equal(await volume.getAttribute("aria-valuemax"), "20");
    await page.evaluate(() => document.getElementById("s")?.removeAttribute("max"));
    check("slider: min, max and step update in place");

    await page.evaluate(() => (document.getElementById("f") as HTMLFormElement).reset());
    assert.equal((await read()).value, 30);
    // The factory binds its handles a task after creation, and reset recreates it.
    await page.evaluate(() => new Promise((r) => setTimeout(r, 0)));
    check("slider: form.reset() restores the value attribute");

    // Range: two handles, both ends in the form under the host's name.
    const min = page.getByRole("slider", { name: "Price minimum", exact: true });
    const max = page.getByRole("slider", { name: "Price maximum", exact: true });
    assert.deepEqual([await min.count(), await max.count()], [1, 1]);
    const prices = (): Promise<FormDataEntryValue[]> =>
      page.evaluate(() => new FormData(document.getElementById("f") as HTMLFormElement).getAll("price"));
    assert.deepEqual(await prices(), ["20", "80"]);
    await page.evaluate(() => ((document.getElementById("r") as Slider).secondValue = 70));
    assert.deepEqual(await prices(), ["20", "70"]);
    await max.focus();
    await page.keyboard.press("ArrowLeft");
    const range = await page.evaluate(() => {
      const w = window as unknown as Win;
      const r = document.getElementById("r") as Slider;
      const events = w.events;
      w.events = [];
      return { events, value: r.value, second: r.secondValue };
    });
    assert.deepEqual(range, {
      events: [
        { type: "input", detail: { value: 20, secondValue: 69 }, target: "r" },
        { type: "change", detail: { value: 20, secondValue: 69 }, target: "r" },
      ],
      value: 20,
      second: 69,
    });
    assert.deepEqual(await prices(), ["20", "69"]);
    await page.evaluate(() => (document.getElementById("f") as HTMLFormElement).reset());
    assert.deepEqual(await prices(), ["20", "80"]);
    check("slider: range names both handles, submits both ends under its name, and resets both");

    const toggled = await page.evaluate(() => {
      const s = document.getElementById("s") as Slider;
      s.value = 40;
      s.setAttribute("range", "");
      s.setAttribute("second-value", "90");
      const handles = s.shadowRoot?.querySelectorAll('[role="slider"]').length;
      const result = { handles, value: s.value, second: s.secondValue };
      s.removeAttribute("range");
      s.removeAttribute("second-value");
      return result;
    });
    assert.deepEqual(toggled, { handles: 2, value: 40, second: 90 });
    check("slider: the range attribute recreates it with a second handle, keeping the value");

    const disabled = await page.evaluate(() => {
      const d = document.getElementById("d") as Slider;
      const handle = (): HTMLElement => d.shadowRoot?.querySelector('[role="slider"]') as HTMLElement;
      const inForm = (): boolean => new FormData(document.getElementById("f") as HTMLFormElement).has("off");
      const before = { aria: handle().getAttribute("aria-disabled"), tab: handle().tabIndex, inForm: inForm() };
      (document.getElementById("fs") as HTMLFieldSetElement).disabled = true;
      const fieldset = { aria: handle().getAttribute("aria-disabled"), tab: handle().tabIndex, inForm: inForm() };
      (document.getElementById("fs") as HTMLFieldSetElement).disabled = false;
      d.setAttribute("disabled", "");
      const attribute = { aria: handle().getAttribute("aria-disabled"), tab: handle().tabIndex, inForm: inForm() };
      return { before, fieldset, attribute };
    });
    assert.deepEqual(disabled, {
      before: { aria: "false", tab: 0, inForm: true },
      fieldset: { aria: "true", tab: -1, inForm: false },
      attribute: { aria: "true", tab: -1, inForm: false },
    });
    await page.getByRole("slider", { name: "Off", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => (document.getElementById("d") as Slider).value), 50);
    check("slider: disabled by attribute or fieldset, it leaves the form and ignores keys");

    const parity = await page.evaluate(async () => {
      const w = window as unknown as Win & { mtrl: { createSlider: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createSlider({ value: 30, ticks: true, step: 10, size: "M", color: "tertiary" });
      document.getElementById("factory")?.append(factory.element);
      const s = document.getElementById("s") as Slider;
      s.setAttribute("ticks", "");
      s.setAttribute("step", "10");
      s.setAttribute("size", "m");
      s.setAttribute("color", "tertiary");
      s.value = 30;
      // Same width as the factory's, which sits in a padded section.
      s.style.width = `${factory.element.getBoundingClientRect().width}px`;
      const element = s.shadowRoot?.firstElementChild as HTMLElement;
      // The factory draws its track a task after creation, and moves the handle with a transition.
      await new Promise((r) => setTimeout(r, 0));
      await Promise.all([factory.element, element].flatMap((root) => root.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => a))));
      const measure = (root: HTMLElement): Record<string, string | number> => {
        const handle = root.querySelector('[class*="slider__handle"]') as HTMLElement;
        const track = root.querySelector('[class*="slider__track"]') as HTMLElement;
        const active = root.querySelector('[class*="slider__segment--active"]') as HTMLElement;
        const origin = root.getBoundingClientRect();
        const h = handle.getBoundingClientRect();
        const a = active.getBoundingClientRect();
        return {
          rootW: origin.width, rootH: origin.height,
          handleX: h.x - origin.x, handleW: h.width, handleH: h.height,
          trackH: track.getBoundingClientRect().height, activeW: a.width,
          ticks: root.querySelectorAll('[class*="slider__tick"]').length,
          handleBg: getComputedStyle(handle, "::before").backgroundColor,
          activeBg: getComputedStyle(active).backgroundColor,
          trackRadius: getComputedStyle(track).borderRadius,
        };
      };
      return { factory: measure(factory.element), element: measure(element), host: s.getBoundingClientRect().height };
    });
    assert.deepEqual(parity.element, parity.factory);
    assert.equal(parity.host, parity.element.rootH, "the host is the slider's height");
    check("slider: renders as the factory does with the global stylesheet, after in-place attribute updates");

    const restorePage = await browser.newPage();
    await restorePage.goto(`http://127.0.0.1:${server.port}/restore-slider`);
    await restorePage.waitForFunction(() => (window as unknown as Win).ready === true);
    await restorePage.getByRole("slider", { name: "Restored", exact: true }).focus();
    await restorePage.keyboard.press("End");
    await restorePage.getByRole("slider", { name: "Restored range minimum", exact: true }).focus();
    await restorePage.keyboard.press("ArrowRight");
    await restorePage.click("#go");
    await restorePage.waitForURL(/\/away$/);
    await restorePage.goBack();
    await restorePage.waitForFunction(() => (window as unknown as Win).ready === true);
    const values = (): number[] =>
      ["rs", "rr"].flatMap((id) => {
        const s = document.getElementById(id) as HTMLElement & { value: number; secondValue: number | null };
        return s.secondValue === null ? [s.value] : [s.value, s.secondValue];
      });
    await restorePage.waitForFunction(() => {
      const s = document.getElementById("rs") as HTMLElement & { value: number };
      return s.value === 100;
    }, undefined, { timeout: 5_000 }).catch(() => undefined);
    const restored = await restorePage.evaluate(values);
    await restorePage.close();
    assert.deepEqual(restored, [100, 21, 80], "going back restores both sliders' values");
    check("slider: going back restores the value, and both ends of a range");
  }

  // ---------------------------------------------------------------- textfield
  await fresh(
    page,
    `<form id="f"><m-textfield id="t" name="email" label="Email" value="a@b.c" required></m-textfield>
     <label for="t" id="outer">Outer label</label>
     <m-textfield id="p" name="plain" label="Plain" value="first"></m-textfield>
     <m-textfield id="o" name="notes" label="Notes" variant="outlined" supporting-text="Optional"></m-textfield>
     <fieldset id="fs"><m-textfield id="in" name="inner" label="Inner"></m-textfield></fieldset></form>
     <section id="factory"></section>`
  );
  {
    const field = page.getByRole("textbox", { name: "Email", exact: true });
    assert.equal(await field.count(), 1, "the label attribute names the inner input");
    check("textfield: the label attribute is the accessible name");

    type TextHost = HTMLElement & { value: string; component: unknown };
    let state = await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      const t = document.getElementById("t") as HTMLElement & { value: string };
      for (const type of ["input", "change"]) {
        t.addEventListener(type, (e) => {
          (w.events as unknown[]).push({ type, custom: e instanceof CustomEvent, detail: (e as CustomEvent).detail });
        });
      }
      const before = t.value;
      t.value = "live@b.c";
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { before, value: t.value, attribute: t.getAttribute("value"), email: form.get("email"), events: w.events };
    });
    assert.deepEqual(state, { before: "a@b.c", value: "live@b.c", attribute: "a@b.c", email: "live@b.c", events: [] });
    check("textfield: the value attribute is the default, the value property the live value, set silently");

    await field.fill("");
    await page.evaluate(() => ((window as unknown as Win).events = []));
    await field.pressSequentially("hi");
    await field.press("Tab");
    state = await page.evaluate(() => {
      const w = window as unknown as Win;
      const t = document.getElementById("t") as HTMLElement & { value: string };
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { value: t.value, email: form.get("email"), events: w.events } as typeof state;
    });
    assert.deepEqual(state.events, [
      { type: "input", custom: true, detail: { value: "h" } },
      { type: "input", custom: true, detail: { value: "hi" } },
      { type: "change", custom: true, detail: { value: "hi" } },
    ]);
    assert.equal(state.email, "hi");
    check("textfield: typing dispatches one input per keystroke and change on commit, and the form sees the value");

    const defaults = await page.evaluate(() => {
      const t = document.getElementById("t") as HTMLElement & { value: string };
      const p = document.getElementById("p") as HTMLElement & { value: string };
      t.setAttribute("value", "new@b.c");
      p.setAttribute("value", "second");
      return { t: t.value, p: p.value };
    });
    assert.deepEqual(defaults, { t: "hi", p: "second" });
    check("textfield: a new value attribute moves the value until the field is edited, as natively");

    const reset = await page.evaluate(() => {
      (document.getElementById("f") as HTMLFormElement).reset();
      const get = (id: string): string => (document.getElementById(id) as HTMLElement & { value: string }).value;
      return { t: get("t"), p: get("p") };
    });
    assert.deepEqual(reset, { t: "new@b.c", p: "second" });
    check("textfield: form.reset() restores the value attribute");

    const validity = await page.evaluate(() => {
      const t = document.getElementById("t") as HTMLElement & { value: string };
      const form = document.getElementById("f") as HTMLFormElement;
      t.value = "";
      const missing = form.checkValidity();
      t.value = "x";
      const filled = form.checkValidity();
      t.removeAttribute("required");
      t.value = "";
      return { missing, filled, optional: form.checkValidity() };
    });
    assert.deepEqual(validity, { missing: false, filled: true, optional: true });
    await page.evaluate(() => document.getElementById("t")?.setAttribute("type", "email"));
    await field.fill("");
    await field.pressSequentially("nope");
    const typed = await page.evaluate(() => {
      const t = document.getElementById("t") as HTMLElement & { value: string };
      const form = document.getElementById("f") as HTMLFormElement;
      const invalid = form.checkValidity();
      const input = t.shadowRoot?.querySelector("input") as HTMLInputElement;
      return { invalid, type: input.type, value: t.value };
    });
    assert.deepEqual(typed, { invalid: false, type: "email", value: "nope" });
    check("textfield: required and type constraints report validity to the form, and type recreates keeping the value");

    await page.evaluate(() => ((document.getElementById("t") as HTMLElement & { value: string }).value = ""));
    await page.click("#outer");
    const focused = await page.evaluate(() => {
      const t = document.getElementById("t") as HTMLElement;
      return { host: document.activeElement === t, input: t.shadowRoot?.activeElement === t.shadowRoot?.querySelector("input") };
    });
    assert.deepEqual(focused, { host: true, input: true });
    await page.keyboard.type("ok");
    assert.equal(await page.evaluate(() => (document.getElementById("t") as HTMLElement & { value: string }).value), "ok");
    check("textfield: an outer <label for> focuses the input");

    const selected = await page.evaluate(() => {
      // Email inputs have no selection range: the plain field shows it.
      const p = document.getElementById("p") as HTMLElement & { select: () => void };
      p.select();
      const input = p.shadowRoot?.querySelector("input") as HTMLInputElement;
      return [input.selectionStart, input.selectionEnd];
    });
    assert.deepEqual(selected, [0, 6]);
    check("textfield: select() selects the text");

    await page.evaluate(() => {
      const p = document.getElementById("p") as HTMLElement;
      p.setAttribute("readonly", "");
      p.setAttribute("disabled", "");
    });
    const readonly = page.getByRole("textbox", { name: "Plain", exact: true });
    const disabled = await page.evaluate(() => {
      const p = document.getElementById("p") as HTMLElement;
      const input = p.shadowRoot?.querySelector("input") as HTMLInputElement;
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      const result = { disabled: input.disabled, readOnly: input.readOnly, submitted: form.has("plain") };
      p.removeAttribute("disabled");
      return result;
    });
    assert.deepEqual(disabled, { disabled: true, readOnly: true, submitted: false });
    await readonly.pressSequentially("zz");
    assert.equal(await page.evaluate(() => (document.getElementById("p") as HTMLElement & { value: string }).value), "second");
    const fieldset = await page.evaluate(() => {
      const fs = document.getElementById("fs") as HTMLFieldSetElement;
      const input = (document.getElementById("in") as HTMLElement).shadowRoot?.querySelector("input") as HTMLInputElement;
      fs.disabled = true;
      const off = input.disabled;
      fs.disabled = false;
      return { off, on: input.disabled };
    });
    assert.deepEqual(fieldset, { off: true, on: false });
    check("textfield: disabled, readonly and a disabled fieldset reach the inner input");

    const error = await page.evaluate(() => {
      const o = document.getElementById("o") as HTMLElement & { setError: (e: boolean, m?: string) => void };
      const root = o.shadowRoot?.firstElementChild as HTMLElement;
      const input = root.querySelector("input") as HTMLInputElement;
      const helper = (): string | null => root.querySelector('[class*="textfield__helper"]')?.className ?? null;
      o.setAttribute("error", "");
      const on = { invalid: input.getAttribute("aria-invalid"), root: root.className.includes("--error"), helper: helper() };
      o.setAttribute("supporting-text", "Required field");
      const text = { helper: helper(), content: root.querySelector('[class*="textfield__helper"]')?.textContent, root: root.className.includes("--error") };
      o.removeAttribute("supporting-text");
      const noText = { helper: helper(), root: root.className.includes("--error") };
      o.removeAttribute("error");
      const off = { invalid: input.getAttribute("aria-invalid"), root: root.className.includes("--error") };
      o.setError(true, "Bad");
      const message = root.querySelector('[class*="textfield__helper"]')?.textContent;
      o.setError(false);
      return { on, text, noText, off, message };
    });
    assert.deepEqual(error, {
      on: { invalid: "true", root: true, helper: "mtrl-textfield__helper mtrl-textfield__helper--error" },
      text: { helper: "mtrl-textfield__helper mtrl-textfield__helper--error", content: "Required field", root: true },
      noText: { helper: null, root: true },
      off: { invalid: null, root: false },
      message: "Bad",
    });
    check("textfield: the error attribute and setError() show the error state");

    const inPlace = await page.evaluate(async () => {
      const o = document.getElementById("o") as TextHost;
      const before = o.component;
      o.setAttribute("variant", "filled");
      o.setAttribute("prefix-text", "$");
      o.setAttribute("leading-icon", "<svg viewBox='0 0 24 24'></svg>");
      o.setAttribute("placeholder", "Write");
      o.setAttribute("maxlength", "5");
      const root = o.shadowRoot?.firstElementChild as HTMLElement;
      const input = root.querySelector("input") as HTMLInputElement;
      const updated = {
        kept: o.component === before,
        filled: root.className.includes("textfield--filled"),
        prefix: root.querySelector('[class*="textfield__prefix"]')?.textContent,
        icon: !!root.querySelector('[class*="textfield__leading-icon"] svg'),
        placeholder: input.placeholder,
        maxLength: input.maxLength,
      };
      o.value = "typed";
      o.setAttribute("label", "Remarks");
      return { ...updated, recreated: o.component !== before, value: o.value };
    });
    assert.deepEqual(inPlace, {
      kept: true, filled: true, prefix: "$", icon: true, placeholder: "Write", maxLength: 5, recreated: true, value: "typed",
    });
    assert.equal(await page.getByRole("textbox", { name: "Remarks", exact: true }).count(), 1);
    check("textfield: attributes with a setter update in place; label recreates keeping the value");

    const multiline = await page.evaluate(async () => {
      const host = document.getElementById("factory") as HTMLElement;
      host.innerHTML = `<m-textfield id="m" type="multiline" label="Bio" value="Hello"></m-textfield>`;
      const m = document.getElementById("m") as HTMLElement & { value: string };
      const area = m.shadowRoot?.querySelector("textarea") as HTMLTextAreaElement;
      const result = { value: m.value, area: area.value };
      host.innerHTML = "";
      return result;
    });
    assert.deepEqual(multiline, { value: "Hello", area: "Hello" });
    check("textfield: type=multiline renders a textarea with the default value");

    const parity = await page.evaluate(async () => {
      const w = window as unknown as Win & { mtrl: { createTextfield: (c: object) => { element: HTMLElement } } };
      const host = document.getElementById("factory") as HTMLElement;
      host.innerHTML = `<m-textfield id="pf" label="Name" value="Ada" supporting-text="Help"></m-textfield>
        <m-textfield id="po" variant="outlined" label="Name" supporting-text="Help"></m-textfield>`;
      const filled = w.mtrl.createTextfield({ label: "Name", value: "Ada", supportingText: "Help" });
      const outlined = w.mtrl.createTextfield({ variant: "outlined", label: "Name", supportingText: "Help" });
      host.append(filled.element, outlined.element);
      await new Promise((r) => setTimeout(r, 50));
      const measure = (root: HTMLElement): Record<string, string | number> => {
        const input = root.querySelector("input") as HTMLElement;
        const label = root.querySelector("label") as HTMLElement;
        const helper = root.querySelector('[class*="textfield__helper"]') as HTMLElement;
        const r = root.getBoundingClientRect();
        const i = input.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        const style = getComputedStyle(input);
        return {
          w: Math.round(r.width), h: Math.round(r.height), inputH: Math.round(i.height),
          labelX: Math.round(l.left - r.left), labelY: Math.round(l.top - r.top),
          inputBg: style.backgroundColor, inputColor: style.color, inputFont: style.font, inputBorder: style.border,
          inputRadius: style.borderRadius, labelColor: getComputedStyle(label).color, labelFont: getComputedStyle(label).font,
          helperColor: getComputedStyle(helper).color, helperFont: getComputedStyle(helper).font,
        };
      };
      const shadow = (id: string): HTMLElement =>
        (document.getElementById(id) as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
      return {
        filled: { factory: measure(filled.element), element: measure(shadow("pf")) },
        outlined: { factory: measure(outlined.element), element: measure(shadow("po")) },
      };
    });
    assert.deepEqual(parity.filled.element, parity.filled.factory);
    assert.deepEqual(parity.outlined.element, parity.outlined.factory);
    check("textfield: renders as the factory does with the global stylesheet, filled and outlined");

    // #234: the outline leaves a notch for the floated label. The label used
    // to be painted with a background copied from the nearest ancestor, which
    // found document.body from inside a shadow root and covered any surface
    // that is not one flat colour.
    await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createTextfield: (c: object) => { element: HTMLElement } } };
      const host = document.getElementById("factory") as HTMLElement;
      host.innerHTML = `<div style="background: rgb(200, 230, 255); padding: 24px; display: grid; gap: 24px; width: 320px">
        <m-textfield id="na" variant="outlined" label="Element label" value="Ada"></m-textfield>
        <div id="nb"></div>
        <m-textfield id="nc" variant="outlined" label="Empty"></m-textfield>
        <div dir="rtl"><m-textfield id="nd" variant="outlined" label="Right to left" value="Ada"></m-textfield></div>
      </div>`;
      const factory = w.mtrl.createTextfield({ variant: "outlined", label: "Factory label", value: "Ada" });
      (document.getElementById("nb") as HTMLElement).append(factory.element);
    });
    // placement, the label's float and the border-colour transition
    await page.waitForTimeout(500);
    type Box = { left: number; right: number; top: number; bottom: number; width: number };
    const notches = await page.evaluate(() => {
      // A missing segment measures as nothing, so the label is judged first
      const box = (el: Element | null): Box => {
        const { left, right, top, bottom, width } = el?.getBoundingClientRect() ?? new DOMRect();
        return { left, right, top, bottom, width };
      };
      const measure = (root: HTMLElement) => {
        const label = root.querySelector("label") as HTMLElement;
        const part = (name: string): HTMLElement | null => root.querySelector(`[class*="textfield__outline-${name}"]`);
        const color = (el: HTMLElement | null, side: "Top" | "Bottom"): string =>
          el ? getComputedStyle(el)[`border${side}Color`] : "missing";
        const notch = part("notch");
        return {
          root: box(root), label: box(label), notch: box(notch),
          labelBackground: getComputedStyle(label).backgroundColor,
          notchTop: color(notch, "Top"),
          notchBottom: color(notch, "Bottom"),
          leadingTop: color(part("leading"), "Top"),
          trailingTop: color(part("trailing"), "Top"),
        };
      };
      const shadow = (id: string): HTMLElement =>
        (document.getElementById(id) as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
      const light = (document.getElementById("nb") as HTMLElement).firstElementChild as HTMLElement;
      return { element: measure(shadow("na")), factory: measure(light), empty: measure(shadow("nc")), rtl: measure(shadow("nd")) };
    });
    // Pixels on the top edge: in the notch's cutout padding, beside the
    // label, the card shows through; along the trailing segment the outline
    // is drawn.
    const png = (await page.screenshot()).toString("base64");
    const edge = (n: typeof notches.element, x: number): [number, number] => [x, Math.round(n.root.top)];
    const points = [
      edge(notches.element, notches.element.label.left - 2), edge(notches.element, notches.element.root.right - 30),
      edge(notches.factory, notches.factory.label.left - 2), edge(notches.factory, notches.factory.root.right - 30),
      edge(notches.rtl, notches.rtl.label.right + 2), edge(notches.rtl, notches.rtl.root.left + 30),
      edge(notches.empty, notches.empty.label.left),
    ];
    const pixels = await page.evaluate(async ({ png, points }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      context.drawImage(image, 0, 0);
      return points.map(([x, y]) => Array.from(context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data.slice(0, 3)).join(","));
    }, { png, points });
    const CARD = "200,230,255";
    const TRANSPARENT = "rgba(0, 0, 0, 0)";
    for (const [name, n] of [["element", notches.element], ["factory", notches.factory], ["rtl", notches.rtl]] as const) {
      assert.equal(n.labelBackground, TRANSPARENT, `${name}: nothing is painted behind the label`);
      assert.equal(n.notchTop, TRANSPARENT, `${name}: the notch is open`);
      assert.notEqual(n.leadingTop, TRANSPARENT, `${name}: the leading corner is drawn`);
      assert.notEqual(n.trailingTop, TRANSPARENT, `${name}: the trailing edge is drawn`);
      assert.notEqual(n.notchBottom, TRANSPARENT, `${name}: the bottom edge runs under the notch`);
      assert(n.notch.width >= n.label.width, `${name}: the notch (${n.notch.width}) is as wide as the label (${n.label.width})`);
      assert(n.notch.left <= n.label.left && n.notch.right >= n.label.right, `${name}: the notch spans the label`);
      assert(n.label.top < n.root.top && n.label.bottom > n.root.top, `${name}: the label sits on the top edge`);
    }
    // M3: the label starts 16dp in and the cutout adds 4dp on each side
    assert(Math.abs(notches.element.notch.left - notches.element.root.left - 12) < 0.5, "the notch starts 12dp in");
    assert(Math.abs(notches.element.label.left - notches.element.notch.left - 4) < 1, "4dp cutout before the label");
    assert(Math.abs(notches.element.notch.right - notches.element.label.right - 4) < 1, "4dp cutout after the label");
    assert(notches.rtl.label.left > notches.rtl.root.left + notches.rtl.root.width / 2, "rtl: the label is on the right");
    assert(Math.abs(notches.rtl.root.right - notches.rtl.notch.right - 12) < 0.5, "rtl: the notch starts 12dp from the right");
    assert.notEqual(notches.empty.notchTop, TRANSPARENT, "empty and unfocused: the notch is closed");
    assert.equal(notches.empty.notchTop, notches.empty.trailingTop, "empty and unfocused: the top edge is one colour");
    assert.deepEqual(pixels.slice(0, 6).map((p) => p === CARD), [true, false, true, false, true, false], `top-edge pixels ${pixels}`);
    assert.notEqual(pixels[6], CARD, "empty and unfocused: the top edge is drawn where the label would float");
    check("textfield: outlined leaves a notch for the floated label on a coloured card, in shadow DOM, light DOM and rtl, closed at rest");

    const focusNotch = await page.evaluate(async () => {
      const c = document.getElementById("nc") as HTMLElement;
      const root = c.shadowRoot?.firstElementChild as HTMLElement;
      const notch = root.querySelector('[class*="textfield__outline-notch"]') as HTMLElement;
      const label = root.querySelector("label") as HTMLElement;
      c.focus();
      await new Promise((r) => setTimeout(r, 400));
      const focused = { top: getComputedStyle(notch).borderTopColor, width: notch.getBoundingClientRect().width, label: label.getBoundingClientRect().width };
      c.blur();
      await new Promise((r) => setTimeout(r, 400));
      return { focused, blurred: getComputedStyle(notch).borderTopColor };
    });
    assert.equal(focusNotch.focused.top, TRANSPARENT, "focus opens the notch");
    assert(focusNotch.focused.width >= focusNotch.focused.label, "the notch fits the focused label");
    assert.notEqual(focusNotch.blurred, TRANSPARENT, "blur on an empty field closes it");
    await page.evaluate(() => ((document.getElementById("factory") as HTMLElement).innerHTML = ""));
    check("textfield: focus opens the notch of an empty outlined field and blur closes it");

    const layout = await page.evaluate(() => {
      const host = document.getElementById("factory") as HTMLElement;
      host.innerHTML = `<m-textfield id="w" label="Wide" style="width:400px"></m-textfield>`;
      const w = document.getElementById("w") as HTMLElement;
      const inline = getComputedStyle(w).display;
      const width = (w.shadowRoot?.firstElementChild as HTMLElement).getBoundingClientRect().width;
      w.focus();
      const focused = w.shadowRoot?.activeElement?.tagName;
      w.blur();
      const blurred = w.shadowRoot?.activeElement ?? null;
      host.innerHTML = "";
      return { inline, width, focused, blurred };
    });
    assert.deepEqual(layout, { inline: "inline-block", width: 400, focused: "INPUT", blurred: null });
    check("textfield: an inline-block host whose width the field fills; focus() and blur() reach the input");
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

  // ---------------------------------------------------------------- radios
  await fresh(
    page,
    `<form id="f"><m-radios id="g" name="size" value="m" aria-label="Size">
       <m-radio value="s">Small</m-radio><m-radio value="m">Medium</m-radio><m-radio value="l" label="Large"></m-radio>
     </m-radios>
     <fieldset id="fs"><m-radios id="o" name="other"><m-radio value="x">Ex</m-radio><m-radio value="y" disabled>Why</m-radio></m-radios></fieldset>
     </form><section id="factory"></section>`
  );
  {
    type Radios = HTMLElement & { value: string | null; component: unknown };
    const settle = (): Promise<unknown> => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    const group = page.getByRole("radiogroup", { name: "Size" });
    assert.equal(await group.count(), 1);
    const radios = group.getByRole("radio");
    assert.equal(await radios.count(), 3);
    for (const [name, checked] of [["Small", false], ["Medium", true], ["Large", false]] as const) {
      assert.equal(await group.getByRole("radio", { name, exact: true, checked }).count(), 1, name);
    }
    check("radios: a radiogroup named by aria-label; children declare the radios, value checks one");

    await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      document.getElementById("g")?.addEventListener("change", (e) => {
        (w.events as unknown[]).push({ detail: (e as CustomEvent).detail, target: (e.target as Element).id });
      });
    });
    await group.getByText("Small", { exact: true }).click();
    let state = await page.evaluate(() => {
      const w = window as unknown as Win;
      const g = document.getElementById("g") as HTMLElement & { value: string | null };
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { events: w.events, value: g.value, attribute: g.getAttribute("value"), size: form.get("size"), other: form.get("other") };
    });
    assert.deepEqual(state, { events: [{ detail: { value: "s" }, target: "g" }], value: "s", attribute: "m", size: "s", other: null });
    check("radios: a click dispatches one change from the host; the live value moves, the attribute stays");

    await page.keyboard.press("ArrowDown");
    state = await page.evaluate(() => {
      const w = window as unknown as Win;
      const g = document.getElementById("g") as HTMLElement & { value: string | null };
      const form = new FormData(document.getElementById("f") as HTMLFormElement);
      return { events: w.events, value: g.value, attribute: g.getAttribute("value"), size: form.get("size"), other: form.get("other") };
    });
    assert.deepEqual((state.events as unknown[]).at(-1), { detail: { value: "m" }, target: "g" });
    assert.equal(state.size, "m");
    assert.equal(await group.getByRole("radio", { name: "Medium", exact: true, checked: true }).count(), 1);
    check("radios: an arrow key moves the selection in the shadow root and dispatches change");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const focused = await page.evaluate(() => {
      const g = document.getElementById("g") as HTMLElement;
      return { host: document.activeElement === g, value: (g.shadowRoot?.activeElement as HTMLInputElement | null)?.value };
    });
    assert.deepEqual(focused, { host: true, value: "m" }, "tabbing into the group lands on the checked radio");
    check("radios: the group is one tab stop, landing on the checked radio");

    const silent = await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      const g = document.getElementById("g") as HTMLElement & { value: string | null };
      g.value = "l";
      const after = { value: g.value, size: new FormData(document.getElementById("f") as HTMLFormElement).get("size") };
      g.value = null;
      return {
        events: w.events, after, cleared: g.value, attribute: g.getAttribute("value"),
        size: new FormData(document.getElementById("f") as HTMLFormElement).get("size"),
      };
    });
    assert.deepEqual(silent, { events: [], after: { value: "l", size: "l" }, cleared: null, attribute: "m", size: null });
    check("radios: setting value fires no event and updates the form value; null clears it");

    const reset = await page.evaluate(() => {
      (document.getElementById("f") as HTMLFormElement).reset();
      const value = (id: string): string | null => (document.getElementById(id) as HTMLElement & { value: string | null }).value;
      return { g: value("g"), o: value("o"), size: new FormData(document.getElementById("f") as HTMLFormElement).get("size") };
    });
    assert.deepEqual(reset, { g: "m", o: null, size: "m" });
    check("radios: form.reset() restores the value attribute");

    const validity = await page.evaluate(() => {
      const o = document.getElementById("o") as HTMLElement & { value: string | null };
      o.setAttribute("required", "");
      const form = document.getElementById("f") as HTMLFormElement;
      const invalid = form.checkValidity();
      const missing = (o as HTMLElement & { internals?: ElementInternals }).internals?.validity.valueMissing;
      o.value = "x";
      const valid = form.checkValidity();
      o.value = null;
      o.removeAttribute("required");
      return { invalid, missing, valid, released: form.checkValidity() };
    });
    assert.deepEqual(validity, { invalid: false, missing: true, valid: true, released: true });
    check("radios: required reports a missing value to the form until one is selected");

    const disabled = await page.evaluate(() => {
      const inputs = (id: string): boolean[] =>
        [...((document.getElementById(id) as HTMLElement).shadowRoot?.querySelectorAll("input") ?? [])].map((i) => i.disabled);
      const initial = inputs("o");
      const fieldset = document.getElementById("fs") as HTMLFieldSetElement;
      fieldset.disabled = true;
      const inFieldset = inputs("o");
      fieldset.disabled = false;
      const reenabled = inputs("o");
      const g = document.getElementById("g") as HTMLElement;
      g.setAttribute("disabled", "");
      const group = inputs("g");
      const submitted = new FormData(document.getElementById("f") as HTMLFormElement).get("size");
      g.removeAttribute("disabled");
      return { initial, inFieldset, reenabled, group, submitted, after: inputs("g") };
    });
    assert.deepEqual(disabled, {
      initial: [false, true], inFieldset: [true, true], reenabled: [false, true],
      group: [true, true, true], submitted: null, after: [false, false, false],
    });
    check("radios: a disabled child, the disabled attribute and a disabled fieldset reach the inputs");

    const before = await page.evaluate(() => {
      const g = document.getElementById("g") as Radios;
      (window as unknown as Record<string, unknown>).__radios = g.component;
      g.value = "l";
      const radios = g.querySelectorAll("m-radio");
      radios[0].textContent = "Tiny";
      radios[1].setAttribute("disabled", "");
      const extra = document.createElement("m-radio");
      extra.setAttribute("value", "xl");
      extra.textContent = "Huge";
      g.append(extra);
      radios[2].remove(); // the selected one
      return null;
    });
    assert.equal(before, null);
    await settle();
    const updated = await page.evaluate(() => {
      const g = document.getElementById("g") as Radios;
      const inputs = [...(g.shadowRoot?.querySelectorAll("input") ?? [])];
      return {
        same: g.component === (window as unknown as Record<string, unknown>).__radios,
        values: inputs.map((i) => i.value),
        disabled: inputs.map((i) => i.disabled),
        value: g.value,
        size: new FormData(document.getElementById("f") as HTMLFormElement).get("size"),
      };
    });
    assert.deepEqual(updated, { same: true, values: ["s", "m", "xl"], disabled: [false, true, false], value: null, size: null });
    for (const name of ["Tiny", "Medium", "Huge"]) assert.equal(await group.getByRole("radio", { name, exact: true }).count(), 1, name);
    check("radios: children relabelled, disabled, added and removed update the group in place; removing the selection clears the form value");

    const reordered = await page.evaluate(async () => {
      const g = document.getElementById("g") as Radios;
      g.value = "xl";
      g.prepend(g.children[2]);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const inputs = [...(g.shadowRoot?.querySelectorAll("input") ?? [])];
      return {
        rebuilt: g.component !== (window as unknown as Record<string, unknown>).__radios,
        values: inputs.map((i) => i.value), value: g.value, checked: inputs.map((i) => i.checked),
      };
    });
    assert.deepEqual(reordered, { rebuilt: true, values: ["xl", "s", "m"], value: "xl", checked: [true, false, false] });
    check("radios: a reorder rebuilds the group and keeps the selection");

    const declared = await page.evaluate(async () => {
      const g = document.getElementById("g") as Radios & { component: { radios: Array<{ config: { value: string; label: string; disabled?: boolean } }> } };
      const radio = document.createElement("m-radio") as HTMLElement & { value: string; label: string; disabled: boolean };
      radio.value = "xs";
      radio.label = "Extra small";
      radio.disabled = true;
      g.append(radio);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const last = g.component.radios.at(-1)?.config;
      return { attributes: [radio.getAttribute("value"), radio.getAttribute("label"), radio.hasAttribute("disabled")], last: { ...last } };
    });
    assert.deepEqual(declared, { attributes: ["xs", "Extra small", true], last: { value: "xs", label: "Extra small", disabled: true } });
    check("radios: <m-radio> properties write the attributes the group reads");

    const early = await page.evaluate(async () => {
      const w = window as unknown as { mtrl: { defineRadios: (o?: object) => string } };
      const radios = document.createElement("late-radios") as HTMLElement & { value?: string | null };
      for (const [value, label] of [["first", "First"], ["second", "Second"]]) {
        const radio = document.createElement("late-radio") as HTMLElement & { value?: string; label?: string };
        radio.value = value;
        radio.label = label;
        radios.append(radio);
      }
      radios.value = "second";
      document.getElementById("host")?.append(radios);
      w.mtrl.defineRadios({ prefix: "late" });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const upgraded = radios as HTMLElement & { value: string | null; component: { radios: Array<{ config: { value: string; label: string } }> } };
      return { options: upgraded.component.radios.map((r) => `${r.config.value}:${r.config.label}`), value: upgraded.value };
    });
    assert.deepEqual(early, { options: ["first:First", "second:Second"], value: "second" });
    check("radios: <m-radio> and <m-radios> properties set before the elements are defined are kept");

    const parity = await page.evaluate(async () => {
      const w = window as unknown as Win & { mtrl: { createRadios: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createRadios({
        name: "parity", value: "x", options: [{ value: "x", label: "Ex" }, { value: "y", label: "Why", disabled: true }],
      });
      document.getElementById("factory")?.append(factory.element);
      // Built checked, as the factory is: a selection made afterwards is mid-transition.
      const element = document.createElement("m-radios");
      element.setAttribute("value", "x");
      element.innerHTML = '<m-radio value="x">Ex</m-radio><m-radio value="y" disabled>Why</m-radio>';
      document.getElementById("factory")?.before(element);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const root = element.shadowRoot?.firstElementChild as HTMLElement;
      const measure = (group: HTMLElement): Array<Record<string, string | number>> =>
        [...group.querySelectorAll('[class*="radios__item"]')].map((item) => {
          const circle = item.querySelector('[class*="radios__circle"]') as HTMLElement;
          const text = item.querySelector('[class*="radios__text"]') as HTMLElement;
          // The label, not the item, which stretches to its container's width.
          const box = (item.querySelector("label") as HTMLElement).getBoundingClientRect();
          const c = circle.getBoundingClientRect();
          return {
            w: Math.round(box.width), h: Math.round(box.height), circleW: c.width, circleH: c.height,
            border: getComputedStyle(circle).borderColor,
            dot: getComputedStyle(circle, "::after").backgroundColor,
            textColor: getComputedStyle(text).color, font: getComputedStyle(text).font,
          };
        });
      return { factory: measure(factory.element), element: measure(root) };
    });
    assert.equal(parity.element.length, 2);
    assert.deepEqual(parity.element, parity.factory);
    check("radios: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- progress
  await fresh(
    page,
    `<section><m-progress id="p" value="30" aria-label="Uploading photo"></m-progress></section>
     <section><m-progress id="pc" variant="circular" indeterminate aria-label="Syncing"></m-progress></section>
     <section id="factory"></section>`
  );
  {
    const inner = (id: string): Promise<Record<string, string | null>> =>
      page.evaluate((id) => {
        const root = (document.getElementById(id) as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
        return { now: root.getAttribute("aria-valuenow"), max: root.getAttribute("aria-valuemax") };
      }, id);
    assert.equal(await page.getByRole("progressbar", { name: "Uploading photo" }).count(), 1);
    assert.equal(await page.getByRole("progressbar", { name: "Syncing" }).count(), 1);
    assert.deepEqual(await inner("p"), { now: "30", max: "100" });
    assert.deepEqual(await inner("pc"), { now: null, max: "100" });
    check("progress: a progressbar named by aria-label, with the value attributes the factory sets");

    await page.evaluate(() => document.getElementById("p")?.setAttribute("value", "60"));
    assert.equal((await inner("p")).now, "60");
    assert.equal(await page.evaluate(() => (document.getElementById("p") as HTMLElement & { value: number }).value), 60);
    check("progress: a value attribute change updates aria-valuenow and the live value");

    const live = await page.evaluate(() => {
      const w = window as unknown as Win;
      w.events = [];
      const p = document.getElementById("p") as HTMLElement & { value: number; indeterminate: boolean };
      for (const name of ["change", "complete"]) p.addEventListener(name, (e) => (w.events as unknown[]).push(e.type));
      const root = p.shadowRoot?.firstElementChild as HTMLElement;
      p.value = 80;
      const now = root.getAttribute("aria-valuenow");
      p.indeterminate = true;
      const indeterminate = root.getAttribute("aria-valuenow");
      p.indeterminate = false;
      return { now, indeterminate, back: root.getAttribute("aria-valuenow"), value: p.value, events: w.events };
    });
    assert.deepEqual(live, { now: "80", indeterminate: null, back: "80", value: 80, events: [] });
    check("progress: setting value and indeterminate updates it and fires no event");

    await page.evaluate(() => document.getElementById("p")?.setAttribute("aria-label", "Downloading"));
    assert.equal(await page.getByRole("progressbar", { name: "Downloading" }).count(), 1);
    assert.equal((await inner("p")).now, "80");
    check("progress: an aria-label change renames it and keeps the live value");

    const parity = await page.evaluate(async () => {
      const w = window as unknown as Win & { mtrl: { createProgress: (c: object) => { element: HTMLElement } } };
      const linear = w.mtrl.createProgress({ value: 80 });
      const circular = w.mtrl.createProgress({ variant: "circular", indeterminate: true });
      document.getElementById("factory")?.append(linear.element, circular.element);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const measure = (root: HTMLElement): Record<string, string | number> => {
        // Not `display`: the circular root is a flex item of the host, so it computes as `flex`.
        const r = root.getBoundingClientRect();
        const c = (root.querySelector("canvas") as HTMLCanvasElement).getBoundingClientRect();
        return { w: r.width, h: r.height, color: getComputedStyle(root).color, canvasW: c.width, canvasH: c.height };
      };
      const shadow = (id: string): HTMLElement =>
        (document.getElementById(id) as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
      return {
        factory: [measure(linear.element), measure(circular.element)],
        element: [measure(shadow("p")), measure(shadow("pc"))],
      };
    });
    assert.deepEqual(parity.element, parity.factory);
    check("progress: linear and circular render as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- loading indicator
  await fresh(
    page,
    `<m-loading-indicator id="li" aria-label="Loading results"></m-loading-indicator>
     <m-loading-indicator id="lc" contained size="64"></m-loading-indicator><section id="factory"></section>`
  );
  {
    assert.equal(await page.getByRole("progressbar", { name: "Loading results" }).count(), 1);
    assert.equal(await page.getByRole("progressbar", { name: "Loading", exact: true }).count(), 1, "the factory's default name");
    check("loading indicator: a progressbar named by aria-label");

    const updated = await page.evaluate(() => {
      const li = document.getElementById("li") as HTMLElement & { component: unknown };
      const before = li.component;
      const root = li.shadowRoot?.firstElementChild as HTMLElement;
      li.setAttribute("size", "96");
      li.setAttribute("value", "0.5");
      const determinate = root.getAttribute("aria-valuenow");
      li.removeAttribute("value");
      li.setAttribute("aria-label", "Loading more");
      return {
        size: root.getBoundingClientRect().width,
        determinate,
        indeterminate: root.getAttribute("aria-valuenow"),
        same: li.component === before,
      };
    });
    assert.deepEqual(updated, { size: 96, determinate: "50", indeterminate: null, same: true });
    assert.equal(await page.getByRole("progressbar", { name: "Loading more" }).count(), 1);
    check("loading indicator: size, value and aria-label changes update it in place");

    const live = await page.evaluate(() => {
      const li = document.getElementById("li") as HTMLElement & {
        value: number | null; stop: () => unknown; component: { isRunning: () => boolean };
      };
      li.value = 0.25;
      const now = li.shadowRoot?.firstElementChild?.getAttribute("aria-valuenow");
      li.stop();
      return { now, running: li.component.isRunning() };
    });
    assert.deepEqual(live, { now: "25", running: false });
    check("loading indicator: the value property and the stop method reach the component");

    const parity = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createLoadingIndicator: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createLoadingIndicator({ contained: true, size: 64 });
      document.getElementById("factory")?.append(factory.element);
      const host = document.getElementById("lc") as HTMLElement;
      const measure = (el: HTMLElement): Record<string, string | number> => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: r.width, h: r.height, bg: s.backgroundColor, color: s.color, radius: s.borderRadius };
      };
      return {
        factory: measure(factory.element),
        element: measure(host.shadowRoot?.firstElementChild as HTMLElement),
        host: host.getBoundingClientRect().height,
      };
    });
    assert.deepEqual(parity.element, parity.factory);
    assert.equal(parity.host, 64, "the host is exactly the indicator's size");
    check("loading indicator: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- badge
  await fresh(
    page,
    `<m-badge id="b1" max="99">120</m-badge> <m-badge id="b2" label="New" color="primary"></m-badge>
     <m-badge id="b3" variant="small"></m-badge><section id="factory"></section>`
  );
  {
    const shown = (): Promise<Record<string, string | null>> =>
      page.evaluate(() => {
        const text = (id: string): string | null =>
          (document.getElementById(id) as HTMLElement).shadowRoot?.firstElementChild?.textContent ?? null;
        return { b1: text("b1"), b2: text("b2") };
      });
    assert.equal(await page.getByRole("status").count(), 2);
    assert.deepEqual(await shown(), { b1: "99+", b2: "New" });
    assert.equal(
      await page.evaluate(() => document.getElementById("b3")?.shadowRoot?.firstElementChild?.getAttribute("aria-hidden")),
      "true"
    );
    check("badge: text or label attribute is the label, max caps it; large is a status, small is hidden");

    const updated = await page.evaluate(async () => {
      const b1 = document.getElementById("b1") as HTMLElement & { component: unknown };
      const before = b1.component;
      b1.textContent = "5";
      document.getElementById("b2")?.setAttribute("label", "Hot");
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      return { same: b1.component === before };
    });
    assert.deepEqual(updated, { same: true });
    assert.deepEqual(await shown(), { b1: "5", b2: "Hot" });
    check("badge: text and label attribute changes update the label in place");

    const live = await page.evaluate(async () => {
      const b2 = document.getElementById("b2") as HTMLElement & { visible: boolean };
      const root = b2.shadowRoot?.firstElementChild as HTMLElement;
      b2.visible = false;
      const hidden = getComputedStyle(root).display;
      // An unrelated change leaves the visibility alone.
      b2.setAttribute("color", "tertiary");
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const kept = b2.visible;
      b2.visible = true;
      return { hidden, kept, visible: b2.visible, display: getComputedStyle(root).display };
    });
    assert.deepEqual(live, { hidden: "none", kept: false, visible: true, display: "flex" });
    check("badge: the visible property hides and shows it; other changes keep it");

    const parity = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createBadge: (c: object) => { element: HTMLElement } } };
      const factory = w.mtrl.createBadge({ label: "Hot", color: "tertiary" });
      document.getElementById("factory")?.append(factory.element);
      const measure = (el: HTMLElement): Record<string, string | number> => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: r.width, h: r.height, bg: s.backgroundColor, color: s.color, radius: s.borderRadius, font: s.font };
      };
      const element = (document.getElementById("b2") as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
      return { factory: measure(factory.element), element: measure(element) };
    });
    assert.deepEqual(parity.element, parity.factory);
    check("badge: renders as the factory does with the global stylesheet");
  }

  // ---------------------------------------------------------------- divider
  await fresh(
    page,
    `<section><m-divider id="d1"></m-divider></section><section><m-divider id="d2" variant="inset"></m-divider></section>
     <section><m-divider id="d3"></m-divider></section><m-divider id="dv" orientation="vertical"></m-divider>
     <section id="factory"></section>`
  );
  {
    assert.equal(await page.getByRole("separator").count(), 4);
    assert.equal(
      await page.evaluate(() => document.getElementById("dv")?.shadowRoot?.firstElementChild?.getAttribute("aria-orientation")),
      "vertical"
    );
    check("divider: a separator, vertical when oriented so");

    const updated = await page.evaluate(() => {
      const d3 = document.getElementById("d3") as HTMLElement & { component: unknown; thickness: number };
      const before = d3.component;
      const root = d3.shadowRoot?.firstElementChild as HTMLElement;
      d3.setAttribute("variant", "middle-inset");
      const margins = [getComputedStyle(root).marginLeft, getComputedStyle(root).marginRight];
      d3.thickness = 2;
      return { margins, height: root.getBoundingClientRect().height, same: d3.component === before };
    });
    assert.deepEqual(updated, { margins: ["16px", "16px"], height: 2, same: true });
    check("divider: variant and thickness changes update it in place");

    const parity = await page.evaluate(() => {
      const w = window as unknown as Win & { mtrl: { createDivider: (c: object) => { element: HTMLElement } } };
      const full = w.mtrl.createDivider({});
      const inset = w.mtrl.createDivider({ variant: "inset" });
      document.getElementById("factory")?.append(full.element, inset.element);
      const measure = (el: HTMLElement): Record<string, string | number> => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: r.width, h: r.height, bg: s.backgroundColor, margin: s.margin };
      };
      const shadow = (id: string): HTMLElement =>
        (document.getElementById(id) as HTMLElement).shadowRoot?.firstElementChild as HTMLElement;
      return { factory: [measure(full.element), measure(inset.element)], element: [measure(shadow("d1")), measure(shadow("d2"))] };
    });
    assert.deepEqual(parity.element, parity.factory);
    check("divider: full-width and inset render as the factory does with the global stylesheet");
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
    await restorePage.getByRole("textbox", { name: "Restored text", exact: true }).fill("kept");
    await restorePage.click("#go");
    await restorePage.waitForURL(/\/away$/);
    await restorePage.goBack();
    await restorePage.waitForFunction(() => (window as unknown as Win).ready === true);
    const checked = (): Record<string, boolean> =>
      Object.fromEntries(["r", "rc"].map((id) => [id, (document.getElementById(id) as HTMLElement & { checked: boolean }).checked]));
    await restorePage.waitForFunction(() => ["r", "rc"].every((id) => (document.getElementById(id) as HTMLElement & { checked: boolean }).checked), undefined, { timeout: 5_000 })
      .catch(() => undefined);
    const restored = await restorePage.evaluate(checked);
    const restoredText = await restorePage.evaluate(() => (document.getElementById("rt") as HTMLElement & { value: string }).value);
    await restorePage.close();
    assert.equal(restored.r, true, "going back restores the switch the user turned on");
    check("forms: going back restores a switch's state");
    assert.equal(restored.rc, true, "going back restores the checkbox the user checked");
    check("forms: going back restores a checkbox's state");
    assert.equal(restoredText, "kept", "going back restores the text the user typed");
    check("forms: going back restores a text field's value");
  }

  {
    const restorePage = await browser.newPage();
    await restorePage.goto(`http://127.0.0.1:${server.port}/restore-radios`);
    await restorePage.waitForFunction(() => (window as unknown as Win).ready === true);
    await restorePage.getByRole("radiogroup", { name: "Restored radios" }).getByText("Beta", { exact: true }).click();
    await restorePage.click("#go");
    await restorePage.waitForURL(/\/away$/);
    await restorePage.goBack();
    await restorePage.waitForFunction(() => (window as unknown as Win).ready === true);
    const value = (): string | null => (document.getElementById("rr") as HTMLElement & { value: string | null }).value;
    await restorePage.waitForFunction(() => (document.getElementById("rr") as HTMLElement & { value: string | null }).value === "b", undefined, { timeout: 5_000 })
      .catch(() => undefined);
    const restored = await restorePage.evaluate(value);
    await restorePage.close();
    assert.equal(restored, "b", "going back restores the radio the user selected over the value attribute");
    check("forms: going back restores a radio group's selection");
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
