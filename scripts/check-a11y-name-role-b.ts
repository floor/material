/**
 * Tabs and button-group names in the Chromium accessibility tree.
 * Material tabs/badges accessibility and WAI-ARIA APG tabs, read 2026-11-07:
 * https://m3.material.io/components/tabs/accessibility
 * https://m3.material.io/components/badges/accessibility
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 * Badge information belongs in the destination's name. A tablist and icon-only
 * control need names; a runtime value fallback preserves explicit labels.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";
import { componentStyles } from "./style-manifest";

interface Subject {
  element: HTMLElement;
  setText: (text: string) => Subject;
  setValue: (value: string) => Subject;
  setBadge: (value: string) => Subject;
  hideBadge: () => Subject;
  showBadge: () => Subject;
  getTabs: () => Subject[];
  setActiveTab: (value: string) => unknown;
  getValue: () => string;
}
type Host = HTMLElement & { component: Subject };
interface FixtureWindow extends Window {
  mtrl: Record<string, (config: Record<string, unknown>) => Subject>;
  subject: Subject;
  before?: { component: Subject; tab: Element; markup: string };
  ready: boolean;
}

const sourceRoot = resolve(process.argv[2] ?? ".");
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(sourceRoot, "src/styles")], style: "compressed", logger: sass.Logger.silent,
}).css;
const css = compile("main");
const styles = Object.fromEntries(["badge", "progress", "button", "icon-button", "tabs", "button-group"].map(name => [name, compile(componentStyles[name].source)]));
styles.ripple = compile("utilities/ripple");
const entry = `import * as m from ${JSON.stringify(resolve(sourceRoot, "src/index.ts"))};
import {createTab} from ${JSON.stringify(resolve(sourceRoot, "src/components/tabs/index.ts"))};
import {defineAll} from ${JSON.stringify(resolve(sourceRoot, "src/elements/index.ts"))};
import {registerStyles} from ${JSON.stringify(resolve(sourceRoot, "src/elements/styles.ts"))};
registerStyles(${JSON.stringify(styles)}); defineAll(); window.mtrl={...m,createTab}; window.ready=true;`;
const bundle = await Bun.build({ entrypoints: ["a11y-b"], target: "browser", plugins: [{ name: "a11y-b", setup(build) {
  build.onResolve({ filter: /^a11y-b$/ }, () => ({ path: "a11y-b", namespace: "fixture" }));
  build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: entry, loader: "ts", resolveDir: process.cwd() }));
} }] });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  return new URL(request.url).pathname === "/entry.js"
    ? new Response(js, { headers: { "Content-Type": "text/javascript" } })
    : new Response(`<!doctype html><html data-theme="baseline"><head><style>${css}</style></head><body><main id="stage"></main><script type="module" src="/entry.js"></script></body></html>`, { headers: { "Content-Type": "text/html" } });
} });
const icon = "<svg viewBox='0 0 24 24'><path d='M4 4h16v16H4z'/></svg>";
const tabs = [{ value: "flights", text: "Flights", badge: "3" }, { value: "favorites", icon, ariaLabel: "Favorites" }, { value: "pins", icon }];
const markup = `<m-tabs id="target" aria-label="Media views" value="flights"><m-tab value="flights" badge="3">Flights</m-tab><m-tab value="favorites" icon="${icon}" aria-label="Favorites"></m-tab><m-tab value="pins" icon="${icon}"></m-tab></m-tabs>`;
const browser = await chromium.launch({ headless: true });
const failures: string[] = [];
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const ax = async () => (await cdp.send("Accessibility.getFullAXTree")).nodes.filter(node => !node.ignored);
  const names = async (role: string): Promise<string[]> => (await ax()).filter(node => node.role?.value === role).map(node => String(node.name?.value ?? ""));
  const settle = () => page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const mount = async (factory?: string, config: Record<string, unknown> = {}, html = markup): Promise<void> => {
    await page.goto(`http://127.0.0.1:${server.port}`);
    await page.waitForFunction(() => (window as unknown as FixtureWindow).ready);
    await page.evaluate(({ factory, config, html }) => {
      const win = window as unknown as FixtureWindow;
      const stage = document.getElementById("stage")!;
      if (factory) {
        win.subject = win.mtrl[factory](config);
        win.subject.element.id = "target";
        stage.append(win.subject.element);
      } else stage.innerHTML = html;
    }, { factory, config, html });
    await settle();
  };
  const test = async (name: string, run: () => Promise<void>): Promise<void> => {
    checks++;
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`); }
  };

  for (const flavor of ["factory", "element"] as const) {
    const mountTabs = () => mount(flavor === "factory" ? "createTabs" : undefined, { ariaLabel: "Trip sections", tabs });
    await test(`${flavor} tablist name`, async () => {
      await mountTabs();
      assert.deepEqual(await names("tablist"), [flavor === "factory" ? "Trip sections" : "Media views"]);
    });
    await test(`${flavor} explicit and fallback tab names`, async () => {
      await mountTabs();
      assert.deepEqual(await names("tab"), ["Flights, 3", "Favorites", "pins"]);
    });
    await test(`${flavor} badge exposed through tab name only`, async () => {
      await mountTabs();
      assert.equal((await names("tab"))[0], "Flights, 3");
      assert.deepEqual(await names("status"), []);
    });
  }
  await test("standalone icon tab fallback survives text/value updates", async () => {
    await mount("createTab", { value: "pins", icon });
    assert.deepEqual(await names("tab"), ["pins"]);
    await page.evaluate(() => (window as unknown as FixtureWindow).subject.setText("Saved pins"));
    assert.deepEqual(await names("tab"), ["Saved pins"]);
    await page.evaluate(() => { const tab = (window as unknown as FixtureWindow).subject; tab.setText(""); tab.setValue("bookmarks"); });
    assert.deepEqual(await names("tab"), ["bookmarks"]);
  });
  await test("explicit tab label survives text/value and badge updates", async () => {
    await mount("createTab", { value: "pins", icon, ariaLabel: "Saved destinations" });
    await page.evaluate(() => { const tab = (window as unknown as FixtureWindow).subject; tab.setText("Visible"); tab.setValue("new-value"); tab.setBadge("4"); });
    assert.deepEqual(await names("tab"), ["Saved destinations, 4"]);
    assert.deepEqual(await names("status"), []);
    await page.evaluate(() => (window as unknown as FixtureWindow).subject.hideBadge());
    assert.deepEqual(await names("tab"), ["Saved destinations"]);
    await page.evaluate(() => (window as unknown as FixtureWindow).subject.showBadge());
    assert.deepEqual(await names("tab"), ["Saved destinations, 4"]);
  });
  await test("new and updated factory badges stay hidden in AX", async () => {
    await mount("createTab", { value: "flights", text: "Flights" });
    for (const count of ["3", "7", ""]) {
      await page.evaluate(count => (window as unknown as FixtureWindow).subject.setBadge(count), count);
      assert.deepEqual(await names("tab"), [count ? `Flights, ${count}` : "Flights"]);
      assert.deepEqual(await names("status"), []);
    }
  });
  await test("standalone badge retains status semantics", async () => {
    await mount("createBadge", { label: "3" });
    assert.equal((await names("status")).length, 1);
  });
  await test("host and declaration author attributes/selectors remain native", async () => {
    await mount();
    assert.equal(await page.evaluate(() => {
      const host = document.querySelector('#target[aria-label="Media views"]')!;
      const child = host.querySelector('m-tab[aria-label="Favorites"]')!;
      return host.getAttribute === Element.prototype.getAttribute && host.hasAttribute === Element.prototype.hasAttribute
        && child.getAttribute === Element.prototype.getAttribute && child.hasAttribute === Element.prototype.hasAttribute
        && host.outerHTML.includes('aria-label="Media views"') && child.outerHTML.includes('aria-label="Favorites"');
    }), true);
  });
  await test("tablist label updates preserve component, selection and focus", async () => {
    await mount();
    await page.evaluate(() => {
      const host = document.getElementById("target") as Host;
      host.component.setActiveTab("favorites");
      const tab = host.shadowRoot!.querySelectorAll('[role="tab"]')[1] as HTMLElement;
      tab.focus();
      (window as unknown as FixtureWindow).before = { component: host.component, tab, markup: host.outerHTML };
      host.setAttribute("aria-label", "Changed views");
    });
    await settle();
    assert.deepEqual(await names("tablist"), ["Changed views"]);
    assert.equal(await page.evaluate(() => {
      const host = document.getElementById("target") as Host;
      const before = (window as unknown as FixtureWindow).before!;
      return host.component === before.component && host.shadowRoot!.activeElement === before.tab && host.component.getValue() === "favorites"
        && host.matches('[aria-label="Changed views"]');
    }), true);
    await page.evaluate(() => document.getElementById("target")!.removeAttribute("aria-label"));
    await settle();
    assert.deepEqual(await names("tablist"), [""]);
  });
  await test("declaration label/badge updates preserve tabs and focus", async () => {
    await mount();
    await page.evaluate(() => {
      const host = document.getElementById("target") as Host;
      const tab = host.shadowRoot!.querySelectorAll('[role="tab"]')[1] as HTMLElement;
      tab.focus();
      (window as unknown as FixtureWindow).before = { component: host.component, tab, markup: host.outerHTML };
      host.children[1].setAttribute("aria-label", "Saved favorites");
      host.children[1].setAttribute("badge", "8");
    });
    await settle();
    assert.deepEqual(await names("tab"), ["Flights, 3", "Saved favorites, 8", "pins"]);
    assert.deepEqual(await names("status"), []);
    assert.equal(await page.evaluate(() => {
      const host = document.getElementById("target") as Host;
      const before = (window as unknown as FixtureWindow).before!;
      return host.component === before.component && host.shadowRoot!.activeElement === before.tab
        && host.children[1].matches('[aria-label="Saved favorites"][badge="8"]');
    }), true);
    await page.evaluate(() => { const tab = document.getElementById("target")!.children[1]; tab.removeAttribute("aria-label"); tab.removeAttribute("badge"); });
    await settle();
    assert.deepEqual(await names("tab"), ["Flights, 3", "favorites", "pins"]);
  });
  for (const selection of ["none", "single", "multi"]) {
    await test(`runtime icon group fallback (${selection}), explicit label preserved`, async () => {
      // Deliberately runtime input: TypeScript still requires an explicit label
      // for icon-only factory entries. The fallback is defensive, not a weaker type.
      await mount("createButtonGroup", { selection, ariaLabel: "Text alignment", buttons: [{ value: "left", icon, ariaLabel: "Align left" }, { value: "center", icon }] });
      assert.deepEqual(await names("button"), ["Align left", "center"]);
    });
  }
  await test("typed text and explicitly labeled group inputs retain names", async () => {
    await mount("createButtonGroup", { buttons: [{ value: "day", text: "Day" }, { value: "left", icon, ariaLabel: "Align left" }] });
    assert.deepEqual(await names("button"), ["Day", "Align left"]);
  });
  assert.deepEqual(errors, [], "Uncaught browser errors");
} finally { await browser.close(); server.stop(true); }
assert.equal(failures.length, 0, `Accessibility names: ${failures.length}/${checks} failed\n${failures.join("\n")}`);
console.log(`Passed accessibility names: ${checks} CDP/DOM scenarios (factory and custom elements).`);
