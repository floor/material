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
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;font-family:sans-serif}section{padding:8px}</style></head>
<body><main id="host"></main><script type="module" src="/elements.js"></script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

type Win = Window & Record<string, unknown>;
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
