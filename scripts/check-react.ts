#!/usr/bin/env bun
// mtrl/react in a real browser, on React 18 and on React 19.
//
// The same app (scripts/fixtures/react-app.ts) is rendered to a string on the
// server, with no DOM, then hydrated in Chromium: the adapter must import
// safely on a server, produce markup that hydrates without a mismatch, and
// behave as React's own inputs do once live. Runs against the build.
//
//   bun run build && bun run scripts/check-react.ts

import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import type { BunPlugin } from "bun";

// React 18 is installed as react-18 and react-dom-18; this points every import
// of react and react-dom, including react-dom's own, at them.
const react18: BunPlugin = {
  name: "react-18",
  setup(build) {
    build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (args) => ({
      path: Bun.resolveSync(
        args.path.replace(/^react-dom(?=\/|$)/, "react-dom-18").replace(/^react(?=\/|$)/, "react-18"),
        process.cwd()
      ),
    }));
  },
};

const development = { "process.env.NODE_ENV": '"development"' };

const bundle = async (entry: string, target: "browser" | "bun", plugins: BunPlugin[]): Promise<string> => {
  const result = await Bun.build({ entrypoints: [entry], target, plugins, define: development });
  assert(result.success, String(result.logs));
  return result.outputs[0].text();
};

type Win = Window & {
  hydrated?: boolean;
  api: {
    log: Array<{ id: string; detail: unknown }>;
    submits: number;
    setExtra: (v: boolean) => void;
    setOrder: (v: string[]) => void;
    setShow: (v: boolean) => void;
    setProgress: (v: number) => void;
    switchRef: { current: (HTMLElement & { toggle: () => void; checked: boolean }) | null };
  };
};

const browser = await chromium.launch({ headless: true });
let checks = 0;

const run = async (version: 18 | 19): Promise<void> => {
  const plugins = version === 18 ? [react18] : [];
  const check = (name: string): void => {
    checks++;
    console.log(`  ok react ${version}: ${name}`);
  };

  // Server render in this process, no DOM.
  const server = await bundle("scripts/fixtures/react-server.ts", "bun", plugins);
  const serverPath = `${process.cwd()}/.check-react-${version}.js`;
  await Bun.write(serverPath, server);
  let html: string;
  try {
    const { render } = (await import(serverPath)) as { render: () => string };
    html = render();
  } finally {
    await Bun.file(serverPath).delete();
  }
  assert.match(html, /<m-switch id="u" name="u" checked="">Uncontrolled<\/m-switch>/);
  assert.match(html, /<m-switch id="d" disabled="" supporting-text="Unavailable">/);
  assert.match(html, /<m-tabs id="t" value="t2">/);
  assert.match(html, /<m-radios [^>]*value="m"[^>]*>.*<m-radio value="s">Small<\/m-radio>/s);
  assert.match(html, /<m-chips [^>]*value="veg"[^>]*>.*<m-chip value="veg">Vegetarian<\/m-chip>/s);
  assert.match(html, /<m-button id="b" type="submit" variant="filled" class="save" data-test="1">Save<\/m-button>/);
  check("renders on a server without a DOM, attributes in the markup");

  const client = await bundle("scripts/fixtures/react-client.ts", "browser", plugins);
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
    assert.equal(await page.getByRole("switch", { name: "Controlled", exact: true }).isChecked(), false);
    check("hydrates: defaultChecked and controlled checked apply");

    await uncontrolled.click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as Win).api.log), [
      { id: "u", detail: { checked: false, value: "on" } },
    ]);
    assert.equal(await uncontrolled.isChecked(), false);
    check("uncontrolled: a click calls onChange with the typed detail");

    await page.getByRole("switch", { name: "Controlled", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("controlled")?.textContent === "true");
    assert.equal(await page.getByRole("switch", { name: "Controlled", exact: true }).isChecked(), true);
    check("controlled: onChange updates state, state updates the switch");

    await page.getByRole("switch", { name: "Locked", exact: true }).click();
    await page.waitForFunction(() => !(document.getElementById("l") as HTMLElement & { checked: boolean }).checked);
    const locked = await page.evaluate(() => (window as unknown as Win).api.log.filter((e) => e.id === "l"));
    assert.equal(locked.length, 1);
    assert.equal(await page.getByRole("switch", { name: "Locked", exact: true }).isChecked(), false);
    check("controlled: a prop that does not change puts the switch back");

    const disabled = await page.evaluate(() => {
      const d = document.getElementById("d") as HTMLElement;
      return { input: d.shadowRoot?.querySelector("input")?.disabled, text: d.shadowRoot?.textContent };
    });
    assert.equal(disabled.input, true);
    assert.match(disabled.text ?? "", /Unavailable/);
    check("boolean and dashed attributes reach the component");

    const ref = await page.evaluate(() => {
      const el = (window as unknown as Win).api.switchRef.current;
      if (!el) return null;
      el.toggle();
      return { tag: el.localName, checked: el.checked };
    });
    assert.deepEqual(ref, { tag: "m-switch", checked: true });
    check("ref is the element, with its forwarded methods");

    // ------------------------------------------------------------- button
    const button = await page.evaluate(() => {
      const b = document.getElementById("b") as HTMLElement;
      return { className: b.className, data: b.dataset.test };
    });
    assert.deepEqual(button, { className: "save", data: "1" });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(await page.evaluate(() => (window as unknown as Win).api.submits), 1);
    check("button: host props pass through, type=submit reaches React's onSubmit");

    // ------------------------------------------------------------- checkbox
    await page.getByRole("checkbox", { name: "Agree", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("agreed")?.textContent === "true");
    assert.equal(await page.getByRole("checkbox", { name: "Agree", exact: true }).isChecked(), true);
    check("checkbox: controlled checked and onChange");

    // ------------------------------------------------------------- slider
    await page.getByRole("slider", { name: "Level", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.getElementById("level")?.textContent === "51");
    assert.equal(await page.getByRole("slider", { name: "Level", exact: true }).getAttribute("aria-valuenow"), "51");
    check("slider: controlled value and onChange");
    // ------------------------------------------------------------- textfield
    await page.getByRole("textbox", { name: "Name", exact: true }).pressSequentially("Ada");
    await page.waitForFunction(() => document.getElementById("text")?.textContent === "Ada");
    assert.equal(await page.getByRole("textbox", { name: "Name", exact: true }).inputValue(), "Ada");
    check("textfield: controlled value and onInput");
    // ------------------------------------------------------------- radios
    const sizes = page.getByRole("radiogroup", { name: "Size" });
    assert.equal(await sizes.getByRole("radio", { name: "Medium", exact: true, checked: true }).count(), 1);
    await sizes.getByText("Large", { exact: true }).click();
    await page.waitForFunction(() => document.getElementById("size")?.textContent === "l");
    assert.equal(await sizes.getByRole("radio", { name: "Large", exact: true, checked: true }).count(), 1);
    check("radios: controlled value and onChange");
    // ------------------------------------------------------------- chips
    const diet = page.getByRole("grid", { name: "Diet" });
    assert.equal(await diet.getByRole("gridcell", { name: "Vegetarian", exact: true, selected: true }).count(), 1);
    await diet.getByRole("gridcell", { name: "Gluten free", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("diet")?.textContent === "veg,gf");
    assert.equal(await diet.getByRole("gridcell", { name: "Gluten free", exact: true, selected: true }).count(), 1);
    check("chips: controlled value and onChange");

    // ------------------------------------------------------------- navigation rail
    const rail = page.getByRole("navigation", { name: "Main" });
    assert.equal(await rail.getByRole("button", { name: "Inbox", exact: true }).getAttribute("aria-current"), "page");
    await rail.getByRole("button", { name: "Sent", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("destination")?.textContent === "sent");
    assert.equal(await rail.getByRole("button", { name: "Sent", exact: true }).getAttribute("aria-current"), "page");
    check("navigation rail: controlled value and onChange");
    // ------------------------------------------------------------- list
    const fruits = page.getByRole("list", { name: "Fruits" });
    assert.equal(await fruits.getByRole("button", { name: "Banana", pressed: true }).count(), 1);
    await fruits.getByRole("button", { name: "Cherry" }).click();
    await page.waitForFunction(() => document.getElementById("fruit")?.textContent === "c");
    assert.equal(await fruits.getByRole("button", { name: "Cherry", pressed: true }).count(), 1);
    check("list: a click on an item updates the controlled value through onChange");

    // ------------------------------------------------------------- tabs
    assert.equal(await page.getByRole("tab", { name: "Trips", exact: true, selected: true }).count(), 1);
    await page.getByRole("tab", { name: "Flights", exact: true }).click();
    await page.waitForFunction(() => document.getElementById("tab")?.textContent === "t1");
    assert.equal(await page.getByRole("tab", { name: "Flights", exact: true, selected: true }).count(), 1);
    check("tabs: controlled value and onChange");

    await page.evaluate(() => (window as unknown as Win).api.setExtra(true));
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
    await page.evaluate(() => (window as unknown as Win).api.setProgress(70));
    await page.waitForFunction(() => document.getElementById("pg")?.shadowRoot?.firstElementChild?.getAttribute("aria-valuenow") === "70");
    assert.equal(await valueNow(), "70");
    check("progress: the value prop sets aria-valuenow, and a new value updates it");

    // ------------------------------------------------------------- lifecycle
    const reordered = await page.evaluate(async () => {
      const w = window as unknown as Win;
      const a = document.getElementById("oa") as HTMLElement & { checked: boolean; component: unknown };
      a.checked = true;
      const before = a.component;
      w.api.setOrder(["b", "a"]);
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
      w.api.setShow(false);
      await new Promise((r) => setTimeout(r, 50));
      return { removed: !gone.isConnected, destroyed: gone.component === null };
    });
    assert.deepEqual(unmounted, { removed: true, destroyed: true });
    check("unmounting destroys the component");

    assert.deepEqual(problems, [], "no errors, hydration warnings or React warnings");
    check("no errors or warnings, hydration included");
  } finally {
    await page.close();
    http.stop(true);
  }
};

try {
  await run(18);
  await run(19);
} finally {
  await browser.close();
}

console.log(`react: ${checks} checks passed`);
