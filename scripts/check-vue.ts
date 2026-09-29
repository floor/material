#!/usr/bin/env bun
// mtrl/vue in a real browser.
//
// The same app (scripts/fixtures/vue-app.ts) is rendered to a string with
// Vue's server renderer, with no DOM, then hydrated in Chromium: the adapter
// must import safely on a server, produce markup that hydrates without a
// mismatch, and keep v-model in step with the element. Runs against the build.
//
//   bun run build && bun run scripts/check-vue.ts

import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

// Development builds, so Vue reports hydration mismatches and warnings.
const defines = {
  "process.env.NODE_ENV": '"development"',
  __VUE_OPTIONS_API__: "true",
  __VUE_PROD_DEVTOOLS__: "false",
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "true",
};

const bundle = async (entry: string, target: "browser" | "bun"): Promise<string> => {
  const result = await Bun.build({ entrypoints: [entry], target, define: defines });
  assert(result.success, String(result.logs));
  return result.outputs[0].text();
};

type Win = Window & {
  hydrated?: boolean;
  api: {
    log: Array<{ id: string; detail: unknown }>;
    submits: number;
    model: { value: boolean };
    extra: { value: boolean };
    order: { value: string[] };
    show: { value: boolean };
    progress: { value: number };
    switchRef: { value: { element: (HTMLElement & { toggle: () => void; checked: boolean }) | null } | null };
  };
};

const browser = await chromium.launch({ headless: true });
let checks = 0;

const run = async (): Promise<void> => {
  const check = (name: string): void => {
    checks++;
    console.log(`  ok vue: ${name}`);
  };

  // Server render in this process, no DOM.
  const server = await bundle("scripts/fixtures/vue-server.ts", "bun");
  const serverPath = `${process.cwd()}/.check-vue.js`;
  await Bun.write(serverPath, server);
  let html: string;
  try {
    const { render } = (await import(serverPath)) as { render: () => Promise<string> };
    html = await render();
  } finally {
    await Bun.file(serverPath).delete();
  }
  assert.match(html, /<m-switch checked name="u" id="u">Uncontrolled<\/m-switch>/);
  assert.match(html, /<m-switch disabled supporting-text="Unavailable" id="d">/);
  assert.match(html, /<m-tabs value="t2" id="t">/);
  assert.match(html, /<m-button variant="filled" type="submit" id="b" class="save" data-test="1">Save<\/m-button>/);
  check("renders on a server without a DOM, attributes in the markup");

  const client = await bundle("scripts/fixtures/vue-client.ts", "browser");
  const http = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/client.js") return new Response(client, { headers: { "Content-Type": "text/javascript" } });
      if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
      return new Response(
        `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><div id="root">${html}</div><script type="module" src="/client.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    },
  });

  const page: Page = await browser.newPage();
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
  });

  try {
    await page.goto(`http://127.0.0.1:${http.port}`);
    await page.waitForFunction(() => (window as unknown as Win).hydrated && (window as unknown as Win).api);
    await page.waitForFunction(() => !!(document.getElementById("t") as HTMLElement & { component?: unknown }).component);

    // ------------------------------------------------------------- switch
    const uncontrolled = page.getByRole("switch", { name: "Uncontrolled", exact: true });
    assert.equal(await uncontrolled.isChecked(), true);
    assert.equal(await page.getByRole("switch", { name: "Model", exact: true }).isChecked(), false);
    check("hydrates: defaultChecked and v-model apply");

    await uncontrolled.click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as Win).api.log), [
      { id: "u", detail: { checked: false, value: "on" } },
    ]);
    assert.equal(await uncontrolled.isChecked(), false);
    check("uncontrolled: a click calls onChange with the typed detail");

    await page.getByRole("switch", { name: "Model", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("model")?.textContent === "true");
    check("v-model: a click updates the bound state");

    await page.getByRole("switch", { name: "Named", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("named")?.textContent === "true");
    check("v-model:checked: a click updates the bound state");

    // State set from outside reaches the element, without an event back.
    const pushed = await page.evaluate(async () => {
      const w = window as unknown as Win;
      const before = w.api.log.length;
      w.api.model.value = false;
      await new Promise((r) => setTimeout(r, 50));
      const m = document.getElementById("m") as HTMLElement & { checked: boolean };
      return { checked: m.checked, events: w.api.log.length - before };
    });
    assert.deepEqual(pushed, { checked: false, events: 0 });
    assert.equal(await page.getByRole("switch", { name: "Model", exact: true }).isChecked(), false);
    check("v-model: state set from outside reaches the element");

    const disabled = await page.evaluate(() => {
      const d = document.getElementById("d") as HTMLElement;
      return { input: d.shadowRoot?.querySelector("input")?.disabled, text: d.shadowRoot?.textContent };
    });
    assert.equal(disabled.input, true);
    assert.match(disabled.text ?? "", /Unavailable/);
    check("boolean and dashed attributes reach the component");

    const ref = await page.evaluate(() => {
      const el = (window as unknown as Win).api.switchRef.value?.element;
      if (!el) return null;
      el.toggle();
      return { tag: el.localName, checked: el.checked };
    });
    assert.deepEqual(ref, { tag: "m-switch", checked: true });
    check("the template ref exposes the element, with its forwarded methods");

    // ------------------------------------------------------------- button
    const button = await page.evaluate(() => {
      const b = document.getElementById("b") as HTMLElement;
      return { className: b.className, data: b.dataset.test };
    });
    assert.deepEqual(button, { className: "save", data: "1" });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(await page.evaluate(() => (window as unknown as Win).api.submits), 1);
    check("button: attributes fall through to the host, type=submit reaches @submit");

    // ------------------------------------------------------------- checkbox
    await page.getByRole("checkbox", { name: "Agree", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("agreed")?.textContent === "true");
    assert.equal(await page.getByRole("checkbox", { name: "Agree", exact: true }).isChecked(), true);
    check("checkbox: v-model");

    // ------------------------------------------------------------- tabs
    assert.equal(await page.getByRole("tab", { name: "Trips", exact: true, selected: true }).count(), 1);
    await page.getByRole("tab", { name: "Flights", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("tab")?.textContent === "t1");
    assert.equal(await page.getByRole("tab", { name: "Flights", exact: true, selected: true }).count(), 1);
    check("tabs: v-model");

    await page.evaluate(() => {
      (window as unknown as Win).api.extra.value = true;
    });
    await page.waitForFunction(() => document.getElementById("t")?.shadowRoot?.querySelectorAll('[role="tab"]').length === 3);
    assert.equal(await page.getByRole("tab", { name: "Flights", exact: true, selected: true }).count(), 1);
    check("tabs: a Tab rendered later is added, and the selection is kept");

    const late = await page.evaluate(() => {
      const el = document.getElementById("late") as HTMLElement & { checked: boolean };
      return { checked: el.checked, attribute: el.getAttribute("checked"), disabled: el.shadowRoot?.querySelector("input")?.disabled };
    });
    assert.deepEqual(late, { checked: true, attribute: "", disabled: true });
    check("a component mounted after hydration takes defaultChecked and booleans");

    // ------------------------------------------------------------- progress
    const valueNow = (): Promise<string | null | undefined> =>
      page.evaluate(() => document.getElementById("pg")?.shadowRoot?.firstElementChild?.getAttribute("aria-valuenow"));
    assert.equal(await valueNow(), "30");
    await page.evaluate(() => {
      (window as unknown as Win).api.progress.value = 70;
    });
    await page.waitForFunction(() => document.getElementById("pg")?.shadowRoot?.firstElementChild?.getAttribute("aria-valuenow") === "70");
    assert.equal(await valueNow(), "70");
    check("progress: the value prop sets aria-valuenow, and a new value updates it");

    // ------------------------------------------------------------- lifecycle
    const reordered = await page.evaluate(async () => {
      const w = window as unknown as Win;
      const a = document.getElementById("oa") as HTMLElement & { checked: boolean; component: unknown };
      a.checked = true;
      const before = a.component;
      w.api.order.value = ["b", "a"];
      await new Promise((r) => setTimeout(r, 50));
      const after = document.getElementById("oa") as HTMLElement & { checked: boolean; component: unknown };
      return {
        same: after === a && after.component === before,
        checked: after.checked,
        order: [...document.querySelectorAll('[id^="o"]')].map((e) => e.id),
      };
    });
    assert.deepEqual(reordered, { same: true, checked: true, order: ["ob", "oa"] });
    check("a keyed reorder moves the element and keeps its state");

    const unmounted = await page.evaluate(async () => {
      const w = window as unknown as Win;
      const gone = document.getElementById("gone") as HTMLElement & { component: unknown };
      w.api.show.value = false;
      await new Promise((r) => setTimeout(r, 50));
      return { removed: !gone.isConnected, destroyed: gone.component === null };
    });
    assert.deepEqual(unmounted, { removed: true, destroyed: true });
    check("unmounting destroys the component");

    assert.deepEqual(problems, [], "no errors, hydration warnings or Vue warnings");
    check("no errors or warnings, hydration included");
  } finally {
    await page.close();
    http.stop(true);
  }
};

try {
  await run();
} finally {
  await browser.close();
}

console.log(`vue: ${checks} checks passed`);
