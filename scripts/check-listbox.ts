#!/usr/bin/env bun
// scripts/check-listbox.ts
//
// The check for the lean selection popup (material/components/listbox and
// material/styles/listbox), against the packed exact-head package.
//
// Two fixtures serve the same flat selection: the same options, label,
// control shell, theme, keyboard contract and production consumer toolchain.
// A is the existing menu in listbox/manual mode plus the small combobox bridge
// an application writes for it; B is the new factory. A's imports never reach
// the full Select: only the menu and the bridge, which stand in for what an
// application already has to ship.
//
// Behaviour runs in Chromium (full), then a focused keyboard, top-layer,
// focus and touch-pointer smoke in Firefox and WebKit. The assistive-technology
// smoke reads the Chromium accessibility tree through CDP. The stop/go gate
// compares the complete styled fixture's gzip: initial JS plus base CSS plus
// the popup sheet. Base CSS compiles the baseline theme (scripts/style-manifest
// baseStyles), so the theme is in both totals. The shared control shell's CSS
// is app code on both sides and is not counted.
//
// What this check does not cover: SSR output and registration (styles-package
// and the ssr checks own those), the adapters, and visual regressions beyond
// the placement and state assertions below. The report names them.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, firefox, webkit, type Browser, type BrowserType, type CDPSession, type Page } from "playwright";
import { createPackageFixture, run } from "./package-fixture";

const fixture = await createPackageFixture();
const browsers: Record<string, string> = {};
const started = performance.now();
const measured: Record<string, unknown> = {};
let browser: Browser | undefined;

const ok = (name: string): void => {
  console.log(`  ok ${name}`);
};

/** The menu-based combobox bridge fixture A needs. The full menu owns the
 * surface, placement and dismissal; the application owns the control, its
 * value text and every key. */
const BRIDGE = `
import { createMenu } from "material/components/menu";

export function createMenuSelector(config) {
  var control = config.control;
  var placeholder = config.placeholder == null ? "" : config.placeholder;
  var handlers = { open: new Set(), change: new Set(), close: new Set() };
  var options = config.options.map(function (option) {
    return { id: option.id, text: option.text, disabled: option.disabled === true, data: option.data };
  });
  var value = config.value == null ? null : config.value;
  var disabled = config.disabled === true;
  var destroyed = false;
  var active = null;
  var pending = "selected";
  var buffer = "";
  var bufferAt = 0;
  var TYPEAHEAD = 500;
  var originalText = control.textContent;
  var written = "";
  var original = new Map();
  function own(name, next) {
    if (!original.has(name)) original.set(name, control.getAttribute(name));
    if (next === null) control.removeAttribute(name);
    else control.setAttribute(name, next);
  }
  function find(id) {
    for (var i = 0; i < options.length; i++) if (options[i].id === id) return options[i];
    return undefined;
  }
  function write() {
    var option = find(value);
    written = option ? option.text : placeholder;
    control.textContent = written;
  }
  function emit(type, detail) {
    Array.from(handlers[type]).forEach(function (handler) { handler(detail); });
  }
  function items() {
    return options.map(function (option) {
      return { id: option.id, text: option.text, disabled: option.disabled === true };
    });
  }
  var menu = createMenu({
    opener: control, items: items(), listbox: true, manualOpen: true,
    closeOnSelect: false, closeOnClickOutside: true, closeOnEscape: false,
  });
  function list() { return menu.element.querySelector('[role="listbox"]'); }
  function rows() {
    var root = list();
    return root ? Array.prototype.slice.call(root.querySelectorAll('[role="option"]')) : [];
  }
  function enabledRows() {
    return rows().filter(function (row) {
      return row.getAttribute("aria-disabled") !== "true" && (!row.checkVisibility || row.checkVisibility());
    });
  }
  function rowFor(id) {
    var listRows = rows();
    for (var i = 0; i < listRows.length; i++) if (listRows[i].getAttribute("data-id") === id) return listRows[i];
    return null;
  }
  function setActive(row) {
    active = row || null;
    rows().forEach(function (item) {
      item.classList.toggle("mtrl-menu__item--active", item === active);
    });
    if (active) {
      own("aria-activedescendant", active.id);
      if (active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
    } else own("aria-activedescendant", null);
  }
  function place(start) {
    var listRows = enabledRows();
    if (!listRows.length) return setActive(null);
    if (start === "first") return setActive(listRows[0]);
    if (start === "last") return setActive(listRows[listRows.length - 1]);
    var selected = value === null ? null : rowFor(value);
    if (selected && listRows.indexOf(selected) >= 0) return setActive(selected);
    if (start === "selected-last") return setActive(listRows[listRows.length - 1]);
    setActive(listRows[0]);
  }
  function search(text) {
    var query = text.toLowerCase();
    var cycling = text.split("").every(function (character) { return character === text[0]; });
    var listRows = enabledRows();
    var from = active ? listRows.indexOf(active) : -1;
    var start = from < 0 ? 0 : cycling ? from + 1 : from;
    for (var offset = 0; offset < listRows.length; offset++) {
      var row = listRows[(start + offset) % listRows.length];
      if ((row.textContent || "").trim().toLowerCase().indexOf(query) === 0) return row;
    }
    return null;
  }
  function typeahead(character) {
    var now = performance.now();
    if (now - bufferAt > TYPEAHEAD) buffer = "";
    buffer += character;
    bufferAt = now;
    var row = search(buffer);
    if (!row && buffer.length > 1) {
      buffer = character;
      row = search(buffer);
    }
    if (row) setActive(row);
  }
  function move(distance) {
    var listRows = enabledRows();
    if (!listRows.length) return;
    var position = active ? listRows.indexOf(active) : -1;
    if (position < 0) position = 0;
    else position = Math.max(0, Math.min(listRows.length - 1, position + distance));
    setActive(listRows[position]);
  }
  var api = {
    element: menu.element,
    open: function (event) { open(event, "selected"); return api; },
    close: function (event) { close(event); return api; },
    toggle: function (event) { if (menu.isOpen()) close(event); else open(event, "selected"); return api; },
    isOpen: function () { return !destroyed && menu.isOpen(); },
    getValue: function () { return value; },
    setValue: function (id) {
      if (destroyed) return api;
      if (id !== null && typeof id !== "string") throw new TypeError("listbox value must be a string or null");
      if (id !== null && !find(id)) throw new RangeError("listbox has no option " + id);
      value = id;
      menu.setSelected(value);
      write();
      if (menu.isOpen()) {
        var row = id === null ? null : rowFor(id);
        if (row && row.getAttribute("aria-disabled") !== "true") setActive(row);
      }
      return api;
    },
    getOptions: function () {
      return options.map(function (option) {
        return { id: option.id, text: option.text, disabled: option.disabled, data: option.data };
      });
    },
    setOptions: function (next) {
      if (destroyed) return api;
      var seen = new Set();
      var snapshot = next.map(function (option, index) {
        if (!option || typeof option !== "object") throw new TypeError("listbox option " + index + " must be an object");
        if (typeof option.id !== "string" || option.id === "") throw new TypeError("listbox option " + index + " needs a nonempty string id");
        if (seen.has(option.id)) throw new TypeError("listbox option id " + option.id + " is used twice");
        seen.add(option.id);
        if (typeof option.text !== "string") throw new TypeError("listbox option " + option.id + " needs a string text");
        return { id: option.id, text: option.text, disabled: option.disabled === true, data: option.data };
      });
      var previous = active ? active.getAttribute("data-id") : null;
      options = snapshot;
      if (value !== null && !find(value)) value = null;
      menu.setItems(items());
      menu.setSelected(value);
      write();
      if (menu.isOpen()) {
        var row = previous === null ? null : rowFor(previous);
        if (row && row.getAttribute("aria-disabled") !== "true") setActive(row);
        else place("selected");
      }
      return api;
    },
    setDisabled: function (next) {
      if (destroyed) return api;
      disabled = next === true;
      own("aria-disabled", disabled ? "true" : null);
      if (disabled) close();
      return api;
    },
    isDisabled: function () { return disabled; },
    on: function (type, handler) { handlers[type].add(handler); return api; },
    off: function (type, handler) { handlers[type].delete(handler); return api; },
    destroy: function () {
      if (destroyed) return;
      destroyed = true;
      if (menu.isOpen()) menu.close(undefined, false);
      menu.destroy();
      original.forEach(function (was, name) {
        if (was === null) control.removeAttribute(name);
        else control.setAttribute(name, was);
      });
      if (control.textContent === written) control.textContent = originalText;
    },
  };

  own("role", "combobox");
  own("tabindex", "0");
  own("aria-haspopup", "listbox");
  own("aria-label", config.ariaLabel);
  own("aria-expanded", "false");
  if (disabled) own("aria-disabled", "true");
  write();

  menu.on("open", function (event) {
    own("aria-expanded", "true");
    var root = list();
    if (root && root.id) own("aria-controls", root.id);
    menu.setSelected(value);
    place(pending);
    emit("open", { listbox: api, originalEvent: event && event.originalEvent });
  });
  menu.on("close", function (event) {
    if (destroyed) return;
    own("aria-expanded", "false");
    own("aria-controls", null);
    setActive(null);
    buffer = "";
    emit("close", { listbox: api, originalEvent: event && event.originalEvent });
  });
  menu.on("select", function (event) {
    var item = event && event.item;
    var option = item ? find(item.id) : undefined;
    if (!option || option.disabled) return;
    active = rowFor(option.id);
    choose(event && event.originalEvent);
  });
  function open(event, start) {
    if (destroyed || disabled || menu.isOpen()) return;
    pending = start || "selected";
    menu.open(event, "keyboard");
  }
  function close(event) {
    if (menu.isOpen()) menu.close(event, false);
  }
  function choose(event) {
    var option = active ? find(active.getAttribute("data-id")) : undefined;
    if (option && !option.disabled) {
      var previous = value;
      value = option.id;
      menu.setSelected(value);
      write();
      if (option.id !== previous) {
        emit("change", {
          listbox: api, originalEvent: event, value: value,
          previousValue: previous, option: { id: option.id, text: option.text, disabled: option.disabled, data: option.data },
        });
      }
    }
    close(event);
  }
  control.addEventListener("click", function (event) {
    if (destroyed || disabled) return;
    if (menu.isOpen()) close(event);
    else open(event, "selected");
  });
  control.addEventListener("keydown", function (event) {
    if (destroyed || disabled || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    if (event.ctrlKey || event.metaKey) return;
    var key = event.key;
    if (event.altKey) {
      if (key === "ArrowDown" && !menu.isOpen()) { event.preventDefault(); open(event, "selected"); }
      else if (key === "ArrowUp" && menu.isOpen()) { event.preventDefault(); choose(event); }
      return;
    }
    if (!menu.isOpen()) {
      if (key === "Enter" || key === " ") { event.preventDefault(); open(event, "selected"); }
      else if (key === "ArrowDown") { event.preventDefault(); open(event, "selected"); }
      else if (key === "ArrowUp") { event.preventDefault(); open(event, "selected-last"); }
      else if (key === "Home") { event.preventDefault(); open(event, "first"); }
      else if (key === "End") { event.preventDefault(); open(event, "last"); }
      else if (key.length === 1) {
        event.preventDefault();
        open(event, "selected");
        if (menu.isOpen()) typeahead(key);
      }
      return;
    }
    if (key === "Enter") { event.preventDefault(); choose(event); }
    else if (key === " ") {
      event.preventDefault();
      if (buffer && performance.now() - bufferAt <= TYPEAHEAD) typeahead(" ");
      else choose(event);
    } else if (key === "ArrowDown" || key === "PageDown") { event.preventDefault(); move(key === "ArrowDown" ? 1 : 10); }
    else if (key === "ArrowUp" || key === "PageUp") { event.preventDefault(); move(key === "ArrowUp" ? -1 : -10); }
    else if (key === "Home") { event.preventDefault(); var first = enabledRows()[0]; if (first) setActive(first); }
    else if (key === "End") { event.preventDefault(); var all = enabledRows(); if (all.length) setActive(all[all.length - 1]); }
    else if (key === "Escape") { event.preventDefault(); close(event); }
    else if (key === "Tab") choose(event);
    else if (key.length === 1) { event.preventDefault(); typeahead(key); }
  });
  return api;
}
`;

/** A page-side helper set, injected after the fixture's bundle. */
const HARNESS = `
window.__events = [];
window.__lastOriginal = {};
window.__options = [
  { id: "apple", text: "Apple" },
  { id: "banana", text: "Banana" },
  { id: "blueberry", text: "Blueberry" },
  { id: "cherry", text: "Cherry" },
  { id: "coconut", text: "Coconut" },
  { id: "date", text: "Date", disabled: true },
  { id: "elderberry", text: "Elderberry" },
];
window.__reset = function () {
  if (window.__h) { try { window.__h.destroy(); } catch (error) {} }
  window.__h = null;
  document.body.dir = "";
  document.body.innerHTML = '<div style="padding:140px 40px"><div id="control" class="control"></div><button id="after">after</button><button id="before">before</button></div>';
  window.__events = [];
  window.scrollTo(0, 0);
};
window.__mount = function (kind, overrides) {
  overrides = overrides || {};
  var control = document.getElementById("control");
  var options = overrides.options || window.__options;
  var config = {
    control: control,
    ariaLabel: overrides.ariaLabel || "Fruit",
    options: options,
    value: overrides.value === undefined ? null : overrides.value,
    placeholder: overrides.placeholder === undefined ? "Choose fruit" : overrides.placeholder,
    disabled: overrides.disabled === true,
  };
  var make = kind === "menu" ? window.__menuSelector : window.__listbox;
  var handle = make(config);
  ["open", "change", "close"].forEach(function (type) {
    handle.on(type, function (detail) {
      window.__events.push({
        type: type,
        value: detail && detail.value !== undefined ? detail.value : null,
        previousValue: detail && detail.previousValue !== undefined ? detail.previousValue : null,
        option: detail && detail.option ? detail.option.text : null,
      });
    });
  });
  window.__h = handle;
  return true;
};
window.__root = function () { return document.querySelector('[role="listbox"]'); };
window.__rows = function () {
  var root = window.__root();
  return root ? Array.prototype.slice.call(root.querySelectorAll('[role="option"]')) : [];
};
window.__visible = function () {
  var root = window.__root();
  return !!root && root.getBoundingClientRect().height > 0;
};
window.__attached = function () {
  var root = window.__root();
  return !!root && root.isConnected;
};
window.__control = function () { return document.getElementById("control"); };
window.__activeId = function () { return window.__control().getAttribute("aria-activedescendant"); };
window.__active = function () {
  var id = window.__activeId();
  return id ? document.getElementById(id) : null;
};
window.__activeText = function () { var row = window.__active(); return row ? row.textContent : null; };
window.__selected = function () {
  return window.__rows().filter(function (row) { return row.getAttribute("aria-selected") === "true"; }).map(function (row) { return row.textContent; });
};
window.__text = function () { return window.__control().textContent; };
window.__attrs = function () {
  var control = window.__control();
  return {
    role: control.getAttribute("role"),
    tabindex: control.getAttribute("tabindex"),
    haspopup: control.getAttribute("aria-haspopup"),
    expanded: control.getAttribute("aria-expanded"),
    controls: control.getAttribute("aria-controls"),
    active: control.getAttribute("aria-activedescendant"),
    label: control.getAttribute("aria-label"),
    disabled: control.getAttribute("aria-disabled"),
    focus: document.activeElement === control,
  };
};
`;

const CONTROL_CSS = `
.control {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 320px;
  min-height: 56px;
  padding: 0 16px;
  border: 1px solid #79747e;
  border-radius: 4px;
  font: 16px/24px sans-serif;
  background: #fff;
  color: #1d1b20;
  cursor: pointer;
}
`;

const cssGzip = (bytes: Uint8Array): number => Bun.gzipSync(bytes).length;
const cssText = (name: string): Promise<string> => readFile(join(fixture.installed, `dist/styles/${name}.css`), "utf8");

/** The styles JS edge's static CSS imports, then the sheet itself. */
async function styleAssets(name: string): Promise<{ path: string; raw: number; gzip: number }[]> {
  const edges = await readFile(join(fixture.installed, `dist/styles/${name}.js`), "utf8");
  const dependencies = [...edges.matchAll(/import "\.\/([\w-]+)\.js";/g)].map(match => match[1]!);
  const assets: { path: string; raw: number; gzip: number }[] = [];
  for (const file of [...dependencies, name]) {
    const bytes = await readFile(join(fixture.installed, `dist/styles/${file}.css`));
    assets.push({ path: `styles/${file}.css`, raw: bytes.byteLength, gzip: cssGzip(bytes) });
  }
  const edgeBytes = await readFile(join(fixture.installed, `dist/styles/${name}.js`));
  assets.push({ path: `styles/${name}.js`, raw: edgeBytes.byteLength, gzip: cssGzip(edgeBytes) });
  return assets;
}

type Built = {
  text: string;
  raw: number;
  gzip: number;
  inputs: string[];
  dynamic: number;
};

async function bundle(entry: string): Promise<Built> {
  const result = (await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "iife",
    minify: true,
    metafile: true,
  } as unknown as Parameters<typeof Bun.build>[0])) as unknown as {
    readonly success: boolean;
    readonly logs: readonly unknown[];
    readonly outputs: readonly { text(): Promise<string> }[];
    readonly metafile: unknown;
  };
  assert(result.success, String(result.logs));
  const output = result.outputs[0];
  assert(output, "the build produced no output");
  const text = await output.text();
  const metafile = (typeof result.metafile === "string" ? JSON.parse(result.metafile) : result.metafile) as {
    outputs: Record<string, { inputs: Record<string, unknown>; imports: { kind: string; external?: boolean }[] }>;
  };
  const chunks = Object.values(metafile.outputs);
  const inputs = [...new Set(chunks.flatMap(chunk => Object.keys(chunk.inputs)))];
  const dynamic = chunks.reduce((sum, chunk) => sum + chunk.imports.filter(imp => imp.kind === "dynamic-import" && !imp.external).length, 0);
  const bytes = Buffer.from(text);
  return { text, raw: bytes.byteLength, gzip: cssGzip(bytes), inputs, dynamic };
}

async function openPage(engine: BrowserType): Promise<{ page: Page; browser: Browser }> {
  const launched = await engine.launch({ headless: true });
  const page = await launched.newPage({ viewport: { width: 900, height: 600 } });
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addStyleTag({ content: CONTROL_CSS });
  browsers[engine.name()] = launched.version();
  return { page, browser: launched };
}

async function mount(page: Page, kind: "menu" | "listbox", overrides: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(() => (window as unknown as { __reset: () => void }).__reset());
  await page.evaluate(({ kind, overrides }) => {
    (window as unknown as { __mount: (kind: string, overrides: unknown) => void }).__mount(kind, overrides);
  }, { kind, overrides });
}

const waitVisible = (page: Page): Promise<unknown> =>
  page.waitForFunction(() => (window as unknown as { __visible: () => boolean }).__visible());

const state = (page: Page): Promise<{
  attrs: Record<string, unknown>;
  text: string;
  selected: string[];
  active: string | null;
  events: Record<string, unknown>[];
}> =>
  page.evaluate(() => {
    const view = window as unknown as {
      __attrs: () => Record<string, unknown>;
      __text: () => string;
      __selected: () => string[];
      __activeText: () => string | null;
      __events: Record<string, unknown>[];
    };
    return { attrs: view.__attrs(), text: view.__text(), selected: view.__selected(), active: view.__activeText(), events: view.__events };
  });

/** The behaviour both fixtures promise. Fixture A's bridge implements the same
 * contract through the menu; each case reads the same page-side helpers. */
async function sharedBehaviour(page: Page, kind: "menu" | "listbox"): Promise<void> {
  const label = kind === "menu" ? "A: menu + bridge" : "B: factory";

  await mount(page, kind);
  let s = await state(page);
  assert.deepEqual(s.attrs, {
    role: "combobox", tabindex: "0", haspopup: "listbox", expanded: "false",
    controls: null, active: null, label: "Fruit", disabled: null, focus: false,
  }, `${label}: the closed control's attributes`);
  assert.equal(s.text, "Choose fruit", `${label}: placeholder text`);
  assert.deepEqual(s.selected, [], `${label}: no option selected`);
  ok(`${label}: closed control attributes, placeholder, no selection`);

  await page.locator("#control").click();
  await waitVisible(page);
  s = await state(page);
  assert.equal(s.attrs.expanded, "true", `${label}: expanded after click`);
  assert.equal(s.attrs.focus, true, `${label}: focus stays on the control`);
  assert.equal(s.attrs.controls, await page.evaluate(() => (window as unknown as { __root: () => HTMLElement }).__root().id || null), `${label}: aria-controls names the listbox`);
  assert.equal(s.active, "Apple", `${label}: no selection starts at the first option`);
  assert.deepEqual(s.events.map(event => event.type), ["open"], `${label}: one open event`);
  ok(`${label}: click opens, focus stays, first option active`);

  await page.keyboard.press("ArrowDown");
  assert.equal((await state(page)).active, "Banana", `${label}: ArrowDown`);
  await page.keyboard.press("ArrowDown");
  assert.equal((await state(page)).active, "Blueberry", `${label}: ArrowDown again`);
  await page.keyboard.press("End");
  assert.equal((await state(page)).active, "Elderberry", `${label}: End skips the disabled last-but-one`);
  await page.keyboard.press("Home");
  assert.equal((await state(page)).active, "Apple", `${label}: Home`);
  await page.keyboard.press("PageDown");
  assert.equal((await state(page)).active, "Elderberry", `${label}: PageDown stops at the last enabled option`);
  await page.keyboard.press("PageUp");
  assert.equal((await state(page)).active, "Apple", `${label}: PageUp stops at the first`);
  ok(`${label}: arrows, Home, End, PageUp and PageDown`);

  await page.keyboard.press("b");
  assert.equal((await state(page)).active, "Banana", `${label}: typeahead b`);
  await page.keyboard.press("b");
  assert.equal((await state(page)).active, "Blueberry", `${label}: repeated b cycles`);
  await page.keyboard.press("c");
  assert.equal((await state(page)).active, "Cherry", `${label}: typeahead c`);
  await page.keyboard.press("z");
  assert.equal((await state(page)).active, "Cherry", `${label}: a no-match buffer keeps the active option`);
  await page.waitForTimeout(600);
  await page.keyboard.press("e");
  assert.equal((await state(page)).active, "Elderberry", `${label}: a fresh buffer after 500 ms`);
  ok(`${label}: typeahead cycling, no match and the reset window`);

  await page.keyboard.press("Enter");
  s = await state(page);
  assert.equal(s.attrs.expanded, "false", `${label}: Enter closes`);
  assert.equal(s.attrs.active, null, `${label}: no stale active id`);
  assert.equal(s.text, "Elderberry", `${label}: the committed text`);
  assert.deepEqual(s.selected, ["Elderberry"], `${label}: the committed option is selected`);
  const changes = s.events.filter(event => event.type === "change");
  assert.deepEqual(changes, [{ type: "change", value: "elderberry", previousValue: null, option: "Elderberry" }], `${label}: one change for the committed choice`);
  assert.deepEqual(s.events.map(event => event.type), ["open", "change", "close"], `${label}: event order`);
  ok(`${label}: Enter commits, closes, selects and emits one change`);

  await page.locator("#control").click();
  await waitVisible(page);
  s = await state(page);
  assert.equal(s.active, "Elderberry", `${label}: reopening starts at the selected option`);
  await page.keyboard.press("Escape");
  s = await state(page);
  assert.equal(s.attrs.expanded, "false", `${label}: Escape closes`);
  assert.equal(s.text, "Elderberry", `${label}: Escape rolls back`);
  assert.equal(s.events.filter(event => event.type === "change").length, 1, `${label}: Escape emits no change`);
  ok(`${label}: Escape closes without a change`);

  await page.locator("#control").click();
  await waitVisible(page);
  await page.keyboard.press("Enter");
  s = await state(page);
  assert.equal(s.text, "Elderberry", `${label}: re-committing the selected option keeps it`);
  assert.equal(s.events.filter(event => event.type === "change").length, 1, `${label}: the same value emits no second change`);
  ok(`${label}: exactly one change per different choice`);

  await mount(page, kind, { value: "banana" });
  await page.locator("#control").click();
  await waitVisible(page);
  assert.equal((await state(page)).active, "Banana", `${label}: a selected value is active first`);
  await page.keyboard.press("Enter");
  s = await state(page);
  assert.equal(s.attrs.expanded, "false", `${label}: Enter on the selected option closes`);
  assert.equal(s.events.filter(event => event.type === "change").length, 0, `${label}: committing the same value emits no change`);
  ok(`${label}: committing the selected option emits no change`);

  await mount(page, kind);
  await page.evaluate(() => document.getElementById("after")!.focus());
  await page.locator("#control").focus();
  await page.keyboard.press("ArrowDown");
  await waitVisible(page);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  s = await state(page);
  assert.equal(s.text, "Banana", `${label}: Tab commits the active option`);
  const focus = await page.evaluate(() => document.activeElement?.id ?? null);
  assert.equal(focus, "after", `${label}: Tab keeps its native focus move`);
  assert.equal(s.attrs.expanded, "false", `${label}: Tab closes`);
  ok(`${label}: Tab commits without preventDefault`);

  await mount(page, kind);
  await page.locator("#control").focus();
  await page.keyboard.press("Space");
  await waitVisible(page);
  assert.equal((await state(page)).attrs.expanded, "true", `${label}: Space opens`);
  await page.keyboard.press("Space");
  s = await state(page);
  assert.equal(s.attrs.expanded, "false", `${label}: Space commits the active option`);
  assert.equal(s.text, "Apple", `${label}: the Space choice commits`);
  assert.deepEqual(s.events.filter(event => event.type === "change").map(event => event.value), ["apple"], `${label}: the Space change`);
  ok(`${label}: Space opens while closed and commits while open`);

  await mount(page, kind);
  await page.locator("#control").focus();
  await page.keyboard.press("Alt+ArrowDown");
  await waitVisible(page);
  assert.equal((await state(page)).attrs.expanded, "true", `${label}: Alt+Down opens`);
  await page.keyboard.press("Alt+ArrowUp");
  s = await state(page);
  assert.equal(s.attrs.expanded, "false", `${label}: Alt+Up commits`);
  assert.equal(s.text, "Apple", `${label}: the Alt+Up choice commits`);
  ok(`${label}: Alt+Down opens and Alt+Up commits`);

  await mount(page, kind, { value: "cherry" });
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[role="option"]')].find(candidate => candidate.textContent === "Blueberry") as HTMLElement;
    row.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    row.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  s = await state(page);
  assert.equal(s.text, "Blueberry", `${label}: a pointer click commits`);
  assert.deepEqual(s.events.filter(event => event.type === "change").map(event => event.value), ["blueberry"], `${label}: the click's change`);
  ok(`${label}: pointer activation commits`);

  await mount(page, kind, { value: "cherry" });
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[role="option"]')].find(candidate => candidate.getAttribute("aria-disabled") === "true") as HTMLElement;
    row.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    row.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  s = await state(page);
  assert.equal(s.attrs.expanded, "true", `${label}: a disabled row does not close the popup`);
  assert.equal(s.text, "Cherry", `${label}: the disabled row does not commit`);
  assert.equal(s.active, "Cherry", `${label}: the disabled row does not become active`);
  assert.equal(s.events.filter(event => event.type === "change").length, 0, `${label}: no change from a disabled row`);
  await page.keyboard.press("Escape");
  ok(`${label}: disabled options never commit or become active`);

  await mount(page, kind, { value: "cherry" });
  const quiet = await page.evaluate(() => {
    const view = window as unknown as { __h: { setValue: (value: string) => void; getValue: () => string | null }; __events: unknown[] };
    view.__h.setValue("banana");
    let unknown = "";
    try { view.__h.setValue("nope"); } catch (error) { unknown = (error as Error).name; }
    let wrongType = "";
    try { (view.__h.setValue as unknown as (value: number) => void)(3); } catch (error) { wrongType = (error as Error).name; }
    return { value: view.__h.getValue(), text: document.getElementById("control")!.textContent, events: view.__events.length, unknown, wrongType };
  });
  assert.deepEqual(quiet, { value: "banana", text: "Banana", events: 0, unknown: "RangeError", wrongType: "TypeError" }, `${label}: setValue is quiet and rejects unknown values`);
  ok(`${label}: setValue updates silently and throws atomically`);

  const replaced = await page.evaluate(() => {
    const view = window as unknown as { __h: { setOptions: (options: unknown[]) => void; setValue: (value: string) => void; getValue: () => string | null; getOptions: () => unknown[] }; __events: unknown[] };
    const text = () => document.getElementById("control")!.textContent;
    view.__h.setOptions([{ id: "apple", text: "Apple" }, { id: "grape", text: "Grape" }]);
    const cleared = { value: view.__h.getValue(), text: text() };
    view.__h.setValue("apple");
    let atomic = "";
    try { view.__h.setOptions([{ id: "one", text: "One" }, { id: "one", text: "Again" }]); } catch (error) { atomic = (error as Error).name; }
    return { cleared, kept: { value: view.__h.getValue(), text: text(), options: view.__h.getOptions().length }, atomic, events: view.__events.length };
  });
  assert.deepEqual(replaced, {
    cleared: { value: null, text: "Choose fruit" },
    kept: { value: "apple", text: "Apple", options: 2 },
    atomic: "TypeError", events: 0,
  }, `${label}: setOptions keeps a surviving value, clears a removed one and rejects atomically`);
  ok(`${label}: setOptions replacement and atomic validation`);

  const disabled = await page.evaluate(() => {
    const view = window as unknown as { __h: { setDisabled: (value: boolean) => void; isDisabled: () => boolean }; __events: unknown[] };
    view.__h.setDisabled(true);
    return { is: view.__h.isDisabled(), attr: document.getElementById("control")!.getAttribute("aria-disabled"), events: view.__events.length };
  });
  assert.deepEqual(disabled, { is: true, attr: "true", events: 0 }, `${label}: setDisabled marks the control`);
  // aria-disabled makes Playwright treat the control as not enabled and retry
  // the click until it times out; the measure here is the library's own guard,
  // so the click is sent past the actionability check and must not open.
  await page.locator("#control").click({ force: true });
  await page.keyboard.press("ArrowDown");
  assert.equal((await page.evaluate(() => (window as unknown as { __h: { isOpen: () => boolean } }).__h.isOpen())), false, `${label}: a disabled control does not open`);
  await page.evaluate(() => (window as unknown as { __h: { setDisabled: (value: boolean) => void } }).__h.setDisabled(false));
  ok(`${label}: disabling closes and blocks opening`);

  const subscription = await page.evaluate(() => {
    const view = window as unknown as { __h: { on: (type: string, handler: () => void) => void; off: (type: string, handler: () => void) => void; open: () => void; close: () => void } };
    let count = 0;
    const handler = () => { count++; };
    view.__h.on("open", handler);
    view.__h.open();
    view.__h.close();
    view.__h.off("open", handler);
    view.__h.open();
    view.__h.close();
    return count;
  });
  assert.equal(subscription, 1, `${label}: off removes the exact subscription`);
  ok(`${label}: on/off subscription identity`);

  const destroyed = await page.evaluate(() => {
    const view = window as unknown as { __h: { destroy: () => void } };
    const control = document.getElementById("control")!;
    view.__h.destroy();
    view.__h.destroy();
    return {
      popup: document.querySelector('[role="listbox"]') === null,
      expanded: control.getAttribute("aria-expanded"),
      controls: control.getAttribute("aria-controls"),
      role: control.getAttribute("role"),
      text: control.textContent,
    };
  });
  assert.deepEqual(destroyed, { popup: true, expanded: null, controls: null, role: null, text: "" }, `${label}: destroy is idempotent and leaves no stale state`);
  ok(`${label}: destroy twice removes the popup and the owned state`);
}

/** Fixture A's dismissals belong to the menu; only what the bridge owns is
 * asserted here. */
async function menuDismissal(page: Page): Promise<void> {
  await mount(page, "menu");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.mouse.click(700, 500);
  assert.equal(await page.evaluate(() => (window as unknown as { __h: { isOpen: () => boolean } }).__h.isOpen()), false, "A: an outside click closes");
  assert.equal((await state(page)).text, "Choose fruit", "A: the outside click commits nothing");
  ok("A: outside click dismissal");
}

async function factoryBehaviour(page: Page): Promise<void> {
  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
  assert.equal((await state(page)).attrs.expanded, "false", "B: an outside pointerdown closes");
  ok("B: dismisses on the first outside pointerdown");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  assert.equal((await state(page)).attrs.expanded, "false", "B: an external scroll closes");
  ok("B: external scroll closes");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  assert.equal((await state(page)).attrs.expanded, "false", "B: a resize closes");
  ok("B: resize closes");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => document.getElementById("after")!.focus());
  assert.equal((await state(page)).attrs.expanded, "false", "B: focus leaving the control closes");
  ok("B: focus departure closes");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => {
    // The popup's own scrolling is not dismissal; the page's is.
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    popup.dispatchEvent(new Event("scroll"));
  });
  assert.equal((await state(page)).attrs.expanded, "true", "B: scrolling the popup itself keeps it open");
  await page.keyboard.press("Escape");
  ok("B: internal scrolling is not dismissal");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => document.getElementById("control")!.remove());
  await page.waitForFunction(() => (window as unknown as { __events: { type: string }[] }).__events.some(event => event.type === "close"));
  assert.equal((await page.evaluate(() => (window as unknown as { __events: { type: string }[] }).__events.filter(event => event.type === "close").length)), 1, "B: detaching the control closes once");
  ok("B: detaching the control closes");

  await mount(page, "listbox");
  // The factory's control must be inside the dialog to hear its close.
  await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.id = "d";
    document.body.appendChild(dialog);
    const control = document.createElement("div");
    control.id = "dialog-control";
    dialog.appendChild(control);
    const view = window as unknown as {
      __listbox: (config: unknown) => { open: () => void; isOpen: () => boolean; destroy: () => void };
    };
    const handle = view.__listbox({ control, ariaLabel: "Fruit", options: [{ id: "apple", text: "Apple" }] });
    (window as unknown as { __dialogHandle: unknown }).__dialogHandle = handle;
    dialog.showModal();
    handle.open();
  });
  await page.waitForFunction(() => document.getElementById("dialog-control")!.getAttribute("aria-expanded") === "true");
  await page.evaluate(() => (document.getElementById("d") as HTMLDialogElement).close());
  // A dialog's close event fires in a later task: an immediate read still
  // reports the popup open, so wait for the owned handle to settle to closed.
  await page.waitForFunction(() => (window as unknown as { __dialogHandle: { isOpen: () => boolean } }).__dialogHandle.isOpen() === false);
  assert.equal(await page.evaluate(() => (window as unknown as { __dialogHandle: { isOpen: () => boolean } }).__dialogHandle.isOpen()), false, "B: closing the modal dialog closes the popup");
  await page.evaluate(() => {
    (window as unknown as { __dialogHandle: { destroy: () => void } }).__dialogHandle.destroy();
    document.getElementById("d")!.remove();
  });
  ok("B: the enclosing dialog's close dismisses");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.keyboard.press("ArrowDown");
  await page.evaluate(() => {
    const view = window as unknown as { __h: { setOptions: (options: unknown[]) => void } };
    view.__h.setOptions([
      { id: "apple", text: "Apple" },
      { id: "banana", text: "Banana" },
      { id: "grape", text: "Grape" },
    ]);
  });
  assert.equal((await state(page)).active, "Banana", "B: replacing options while open keeps a surviving active option");
  await page.keyboard.press("Enter");
  assert.equal((await state(page)).text, "Banana", "B: the replacement commits");
  ok("B: setOptions while open");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  const reentrant = await page.evaluate(() => {
    const view = window as unknown as {
      __h: { on: (type: string, handler: () => void) => void; open: () => void; close: () => void };
    };
    view.__h.on("change", () => { view.__h.close(); view.__h.open(); });
    return true;
  });
  assert.equal(reentrant, true, "B: reentrancy handler installed");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => (window as unknown as { __h: { isOpen: () => boolean } }).__h.isOpen()), true, "B: a change handler's newer open wins");
  await page.keyboard.press("Escape");
  ok("B: a reentrant open is not closed by the commit");

  await mount(page, "listbox");
  await page.evaluate(() => {
    const view = window as unknown as { __h: { on: (type: string, handler: () => void) => void; destroy: () => void } };
    view.__h.on("change", () => { view.__h.destroy(); });
  });
  await page.locator("#control").click();
  await waitVisible(page);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.querySelector('[role="listbox"]') === null), true, "B: destroying from a change handler leaves no popup");
  ok("B: destroy from a change handler");

  // A destroy ends the dispatch it happened in: the handlers after it belong to
  // a control that no longer exists, for every announced event.
  await mount(page, "listbox");
  await page.evaluate(() => {
    const view = window as unknown as {
      __h: { on: (type: string, handler: () => void) => void; destroy: () => void };
      __after: number;
    };
    view.__after = 0;
    view.__h.on("change", () => { view.__h.destroy(); });
    view.__h.on("change", () => { view.__after++; });
  });
  await page.locator("#control").click();
  await waitVisible(page);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const changeDispatch = await page.evaluate(() => {
    const view = window as unknown as { __after: number; __events: { type: string }[] };
    return {
      after: view.__after,
      events: view.__events.map(event => event.type),
      popup: document.querySelector('[role="listbox"]') !== null,
      expanded: document.getElementById("control")!.getAttribute("aria-expanded"),
    };
  });
  assert.equal(changeDispatch.after, 0, "B: a change handler's destroy stops the remaining change handlers");
  assert.deepEqual(changeDispatch.events, ["open", "change"], "B: no close follows the destroying change");
  assert.equal(changeDispatch.popup, false, "B: the destroying change leaves no popup");
  assert.equal(changeDispatch.expanded, null, "B: the destroyed control keeps no expanded state");
  ok("B: destroy ends a change dispatch");

  await mount(page, "listbox");
  await page.evaluate(() => {
    const view = window as unknown as {
      __h: { on: (type: string, handler: () => void) => void; destroy: () => void };
      __after: number;
    };
    view.__after = 0;
    view.__h.on("open", () => { view.__h.destroy(); });
    view.__h.on("open", () => { view.__after++; });
  });
  await page.locator("#control").click();
  const openDispatch = await page.evaluate(() => {
    const view = window as unknown as { __after: number };
    const control = document.getElementById("control")!;
    return {
      after: view.__after,
      popup: document.querySelector('[role="listbox"]') !== null,
      expanded: control.getAttribute("aria-expanded"),
      controls: control.getAttribute("aria-controls"),
    };
  });
  assert.equal(openDispatch.after, 0, "B: an open handler's destroy stops the remaining open handlers");
  assert.equal(openDispatch.popup, false, "B: the destroying open leaves no popup");
  assert.equal(openDispatch.expanded, null, "B: a destroyed open leaves no expanded state");
  assert.equal(openDispatch.controls, null, "B: a destroyed open leaves no aria-controls");
  ok("B: destroy ends an open dispatch");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => {
    const view = window as unknown as {
      __h: { on: (type: string, handler: () => void) => void; destroy: () => void };
      __after: number;
    };
    view.__after = 0;
    view.__h.on("close", () => { view.__h.destroy(); });
    view.__h.on("close", () => { view.__after++; });
  });
  await page.keyboard.press("Escape");
  const closeDispatch = await page.evaluate(() => {
    const view = window as unknown as { __after: number };
    return { after: view.__after, popup: document.querySelector('[role="listbox"]') !== null };
  });
  assert.equal(closeDispatch.after, 0, "B: a close handler's destroy stops the remaining close handlers");
  assert.equal(closeDispatch.popup, false, "B: the destroying close leaves no popup");
  ok("B: destroy ends a close dispatch");

  // The open path focuses the control synchronously, so a focus handler can
  // destroy, close or close-and-reopen it while the open is still running.
  await mount(page, "listbox");
  const focusDestroy = await page.evaluate(() => {
    const view = window as unknown as {
      __h: { open: () => void; destroy: () => void; isOpen: () => boolean };
      __events: { type: string }[];
    };
    const control = document.getElementById("control")!;
    control.addEventListener("focus", () => { view.__h.destroy(); }, { once: true });
    view.__h.open();
    return {
      open: view.__h.isOpen(),
      popup: document.querySelector('[role="listbox"]') !== null,
      expanded: control.getAttribute("aria-expanded"),
      controls: control.getAttribute("aria-controls"),
      events: view.__events.map(event => event.type),
    };
  });
  assert.equal(focusDestroy.open, false, "B: a focus handler's destroy leaves the popup closed");
  assert.equal(focusDestroy.popup, false, "B: a focus handler's destroy removes the popup");
  assert.equal(focusDestroy.expanded, null, "B: a focus handler's destroy leaves no expanded state");
  assert.equal(focusDestroy.controls, null, "B: a focus handler's destroy leaves no aria-controls");
  assert.deepEqual(focusDestroy.events, [], "B: a destroyed open announces nothing");
  ok("B: destroy from the focus callback");

  await mount(page, "listbox");
  const focusClose = await page.evaluate(() => {
    const view = window as unknown as {
      __h: { open: () => void; close: () => void; isOpen: () => boolean };
      __events: { type: string }[];
    };
    const control = document.getElementById("control")!;
    control.addEventListener("focus", () => { view.__h.close(); }, { once: true });
    view.__h.open();
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    return {
      open: view.__h.isOpen(),
      expanded: control.getAttribute("aria-expanded"),
      controls: control.getAttribute("aria-controls"),
      shown: popup.matches(":popover-open"),
      events: view.__events.map(event => event.type),
    };
  });
  assert.equal(focusClose.open, false, "B: a focus handler's close stays closed");
  assert.equal(focusClose.expanded, "false", "B: the focus handler's close leaves aria-expanded false");
  assert.equal(focusClose.controls, null, "B: the focus handler's close leaves no aria-controls");
  assert.equal(focusClose.shown, false, "B: the focus handler's close hides the popover");
  assert.deepEqual(focusClose.events, ["close"], "B: the focus handler's close announces close, never open");
  ok("B: close from the focus callback");

  await mount(page, "listbox");
  const focusReopen = await page.evaluate(() => {
    const view = window as unknown as {
      __h: { open: () => void; close: () => void; isOpen: () => boolean };
      __events: { type: string }[];
    };
    const control = document.getElementById("control")!;
    control.addEventListener("focus", () => { view.__h.close(); view.__h.open(); }, { once: true });
    view.__h.open();
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    return {
      open: view.__h.isOpen(),
      expanded: control.getAttribute("aria-expanded"),
      controls: control.getAttribute("aria-controls"),
      id: popup.id,
      shown: popup.matches(":popover-open"),
      opens: view.__events.filter(event => event.type === "open").length,
    };
  });
  assert.equal(focusReopen.open, true, "B: a focus handler's close-reopen leaves the popup open");
  assert.equal(focusReopen.expanded, "true", "B: the focus handler's close-reopen leaves aria-expanded true");
  assert.equal(focusReopen.controls, focusReopen.id, "B: the focus handler's close-reopen names the popup");
  assert.equal(focusReopen.shown, true, "B: the focus handler's close-reopen shows the popover");
  assert.equal(focusReopen.opens, 1, "B: the focus handler's close-reopen announces one open");
  ok("B: close and reopen from the focus callback");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.evaluate(() => {
    const view = window as unknown as { __h: { isOpen: () => boolean } };
    const second = document.createElement("div");
    second.id = "second";
    document.body.appendChild(second);
    (window as unknown as { __second: unknown }).__second = (window as unknown as {
      __listbox: (config: unknown) => { open: () => void; isOpen: () => boolean; destroy: () => void };
    }).__listbox({ control: second, ariaLabel: "Other", options: [{ id: "one", text: "One" }] });
    (window as unknown as { __second: { open: () => void } }).__second.open();
    (window as unknown as { __first: { isOpen: () => boolean } }).__first = view.__h;
  });
  assert.equal(await page.evaluate(() => (window as unknown as { __first: { isOpen: () => boolean } }).__first.isOpen()), false, "B: a second popup closes the first");
  assert.equal(await page.evaluate(() => (window as unknown as { __second: { isOpen: () => boolean } }).__second.isOpen()), true, "B: the second popup is open");
  await page.evaluate(() => (window as unknown as { __second: { destroy: () => void } }).__second.destroy());
  ok("B: registry ownership across popups");

  await mount(page, "listbox");
  const failures = await page.evaluate(() => {
    const view = window as unknown as { __h: { open: () => void; isOpen: () => boolean } };
    const control = document.getElementById("control")!;
    const proto = HTMLElement.prototype as unknown as { showPopover: () => void };
    const original = proto.showPopover;
    let thrown = "";
    proto.showPopover = function () { throw new Error("show failed"); };
    try { view.__h.open(); } catch (error) { thrown = (error as Error).message; }
    proto.showPopover = original;
    const after = { open: view.__h.isOpen(), expanded: control.getAttribute("aria-expanded"), controls: control.getAttribute("aria-controls") };
    delete (proto as unknown as { showPopover?: () => void }).showPopover;
    let missing = "";
    const fresh = document.createElement("div");
    document.body.appendChild(fresh);
    try {
      (window as unknown as { __listbox: (config: unknown) => unknown }).__listbox({ control: fresh, ariaLabel: "Fruit", options: [] });
    } catch (error) { missing = (error as Error).message; }
    (window as unknown as { __listbox: (config: unknown) => unknown }).__listbox;
    proto.showPopover = original;
    fresh.remove();
    return { thrown, after, missing };
  });
  assert.equal(failures.thrown, "show failed", "B: a failing show rethrows");
  assert.deepEqual(failures.after, { open: false, expanded: "false", controls: null }, "B: a failing show leaves no half-open state");
  assert.match(failures.missing, /Popover API/, "B: construction names the missing Popover API");
  ok("B: show failure and an absent Popover API");

  await mount(page, "listbox");
  const placement = await page.evaluate(() => {
    const control = document.getElementById("control")!;
    const view = window as unknown as { __h: { open: () => void; close: () => void } };
    const style = (parent: HTMLElement) => { parent.style.paddingTop = "0"; parent.style.paddingBottom = "0"; };
    void style;
    view.__h.open();
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    const below = { top: popup.getBoundingClientRect().top, height: popup.getBoundingClientRect().height, control: control.getBoundingClientRect().bottom };
    view.__h.close();
    window.scrollTo(0, document.body.scrollHeight);
    control.style.position = "fixed";
    control.style.bottom = "4px";
    control.style.left = "40px";
    view.__h.open();
    const flipped = { top: popup.getBoundingClientRect().top, bottom: popup.getBoundingClientRect().bottom, control: control.getBoundingClientRect().top, height: popup.getBoundingClientRect().height };
    view.__h.close();
    control.style.position = "fixed";
    control.style.bottom = "";
    control.style.left = "calc(100% - 80px)";
    control.style.top = "120px";
    view.__h.open();
    const clamped = { left: popup.getBoundingClientRect().left, right: popup.getBoundingClientRect().right, width: document.documentElement.clientWidth };
    view.__h.close();
    return { below, flipped, clamped };
  });
  assert.ok(placement.below.top >= placement.below.control - 1, "B: the popup opens below the control");
  assert.ok(placement.flipped.bottom <= placement.flipped.control + 1, "B: near the bottom edge it flips above");
  assert.ok(placement.clamped.left >= -1 && placement.clamped.right <= placement.clamped.width + 1, "B: it clamps inside the viewport");
  ok("B: placement below, block flip and inline clamp");

  // A control wider than its viewport must not drag the popup past the edge:
  // the control's width is a floor for the popup, and the viewport bounds it.
  await page.setViewportSize({ width: 360, height: 600 });
  await mount(page, "listbox");
  const oversized = await page.evaluate(() => {
    const control = document.getElementById("control")!;
    control.style.width = "600px";
    const view = window as unknown as { __h: { open: () => void; close: () => void } };
    view.__h.open();
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    const rect = popup.getBoundingClientRect();
    const result = {
      controlWidth: control.getBoundingClientRect().width,
      viewport: document.documentElement.clientWidth,
      left: rect.left,
      right: rect.right,
      width: rect.width,
    };
    view.__h.close();
    return result;
  });
  await page.setViewportSize({ width: 900, height: 600 });
  assert.ok(oversized.controlWidth > oversized.viewport, `B: the control (${oversized.controlWidth}px) is wider than the viewport (${oversized.viewport}px)`);
  assert.ok(oversized.width <= oversized.viewport + 1, `B: an oversized control's popup (${oversized.width}px) stays within the viewport (${oversized.viewport}px)`);
  assert.ok(oversized.left >= -1 && oversized.right <= oversized.viewport + 1, `B: the oversized popup stays inside the viewport (${oversized.left}..${oversized.right})`);
  ok("B: an oversized control cannot push the popup past the viewport");

  await mount(page, "listbox");
  const rtl = await page.evaluate(() => {
    document.body.dir = "rtl";
    const control = document.getElementById("control")!;
    control.style.marginLeft = "auto";
    control.style.marginRight = "40px";
    const view = window as unknown as { __h: { open: () => void; close: () => void } };
    view.__h.open();
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    const rects = { popup: popup.getBoundingClientRect().right, control: control.getBoundingClientRect().right };
    view.__h.close();
    return rects;
  });
  assert.ok(Math.abs(rtl.popup - rtl.control) <= 1, "B: in RTL the popup aligns to the control's right edge");
  ok("B: RTL inline alignment");

  await mount(page, "listbox");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.keyboard.press("ArrowDown");
  const activeFocus = await page.evaluate(() => {
    const control = document.getElementById("control")!;
    const id = control.getAttribute("aria-activedescendant")!;
    const active = document.getElementById(id)!;
    const selected = document.querySelectorAll('[role="listbox"] [aria-selected="true"]').length;
    return { focus: document.activeElement === control, id, active: active.textContent, selected };
  });
  assert.equal(activeFocus.focus, true, "B: focus stays on the control while exploring");
  assert.equal(activeFocus.active, "Banana", "B: activedescendant names the active row");
  assert.equal(activeFocus.selected, 0, "B: the active row is not the selected row");
  ok("B: active and selected are distinct");

  await page.keyboard.press("Escape");
}

/** A real touch sequence. The smoke above dispatches pointer and click events by
 * hand, which skips the browser's own decisions: a real tap focuses the tapped
 * node between pointerdown and click, and a pan cancels the gesture. */
async function touchBehaviour(page: Page): Promise<void> {
  await mount(page, "listbox");
  await page.locator("#control").tap();
  await waitVisible(page);
  assert.equal((await state(page)).attrs.expanded, "true", "B: a real touch tap opens the control");
  assert.equal((await state(page)).attrs.focus, true, "B: the tap leaves focus on the control");
  await page.locator('[role="option"]', { hasText: "Cherry" }).tap();
  const tapped = await state(page);
  assert.equal(tapped.text, "Cherry", "B: a real touch tap on a row selects it");
  assert.equal(tapped.attrs.expanded, "false", "B: the tapped choice closes the popup");
  assert.deepEqual(tapped.selected, ["Cherry"], "B: the tapped row is selected");
  assert.deepEqual(tapped.events.filter(event => event.type === "change"),
    [{ type: "change", value: "cherry", previousValue: null, option: "Cherry" }], "B: the tap emits one change");
  ok("B: a real touch tap selects and closes");

  // A pan over a longer list scrolls it. The browser cancels the gesture when
  // the scroll takes over, so the pan reaches no pointerup and chooses nothing.
  await page.setViewportSize({ width: 900, height: 400 });
  await mount(page, "listbox", {
    options: Array.from({ length: 30 }, (_, index) => ({ id: `item-${index}`, text: `Item ${index}` })),
  });
  await page.locator("#control").tap();
  await waitVisible(page);
  const before = await page.evaluate(() => {
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    const rect = popup.getBoundingClientRect();
    return { scrollTop: popup.scrollTop, top: rect.top, left: rect.left, height: rect.height };
  });
  assert.ok(before.height < 400, `B: the long list is bounded by the viewport (${before.height}px)`);
  const client = await page.context().newCDPSession(page);
  const x = Math.round(before.left + 100);
  const y = Math.round(before.top + before.height - 40);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (const delta of [20, 40, 60, 80]) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - delta }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
  const panned = await page.evaluate(() => {
    const popup = document.querySelector('[role="listbox"]') as HTMLElement;
    const view = window as unknown as { __events: { type: string }[] };
    return {
      scrollTop: popup.scrollTop,
      shown: popup.matches(":popover-open"),
      text: document.getElementById("control")!.textContent,
      events: view.__events.map(event => event.type),
    };
  });
  await page.setViewportSize({ width: 900, height: 600 });
  assert.ok(panned.scrollTop > before.scrollTop, `B: a touch pan scrolls the list (${before.scrollTop} to ${panned.scrollTop})`);
  assert.equal(panned.shown, true, "B: the pan leaves the popup open");
  assert.equal(panned.text, "Choose fruit", "B: the pan commits nothing");
  assert.deepEqual(panned.events, ["open"], "B: the pan emits no change");
  ok("B: a touch pan scrolls without choosing");
}

async function chromiumBehaviour(page: Page): Promise<void> {
  await sharedBehaviour(page, "menu");
  await menuDismissal(page);
  await sharedBehaviour(page, "listbox");
  await factoryBehaviour(page);

  // The accessibility smoke reads the tree an assistive technology reads.
  const session = await page.context().newCDPSession(page);
  await mount(page, "listbox", { value: "banana" });
  const closed = await axNode(session, "combobox");
  assert.equal(closed.name, "Fruit", "AT: the control's accessible name");
  assert.equal(closed.expanded, "false", "AT: collapsed when closed");
  await page.locator("#control").click();
  await waitVisible(page);
  await page.keyboard.press("ArrowDown");
  const open = await axNode(session, "combobox");
  assert.equal(open.expanded, "true", "AT: expanded while open");
  assert.equal(open.name, "Fruit", "AT: the name does not change with the value");
  const menuNodes = await axNodes(session, "option");
  assert.ok(menuNodes.some(node => node.name === "Blueberry"), "AT: the active option is exposed by name");
  await page.keyboard.press("Enter");
  const committed = await axNode(session, "combobox");
  assert.equal(committed.expanded, "false", "AT: collapsed after the committed choice");
  const selected = await page.evaluate(() => {
    const row = document.querySelector('[role="option"][aria-selected="true"]');
    return row ? row.textContent : null;
  });
  assert.equal(selected, "Blueberry", "AT: the committed option keeps aria-selected");
  measured.accessibility = { closed, open, options: menuNodes.map(node => node.name), selected };
  ok("AT: name, expansion, exploration and the committed choice");

  await mount(page, "listbox", { disabled: true });
  const disabled = await axNode(session, "combobox");
  assert.equal(disabled.disabled, "true", "AT: the disabled control is exposed as disabled");
  measured.accessibilityDisabled = disabled;
  ok("AT: disabled state");
}

type AxNode = { name: string; expanded: string; disabled: string; value: string };
async function axNode(session: CDPSession, role: string): Promise<AxNode> {
  const nodes = await axNodes(session, role);
  assert.ok(nodes.length > 0, `AT: no ${role} node in the accessibility tree`);
  return nodes[0]!;
}
async function axNodes(session: CDPSession, role: string): Promise<AxNode[]> {
  const tree = (await session.send("Accessibility.getFullAXTree")) as {
    nodes: { ignored?: boolean; role?: { value?: string }; name?: { value?: string }; value?: { value?: unknown }; properties?: { name: string; value: { value?: unknown } }[] }[];
  };
  const property = (node: { properties?: { name: string; value: { value?: unknown } }[] }, name: string): string => {
    const found = node.properties?.find(item => item.name === name);
    return found ? String(found.value.value) : "";
  };
  return tree.nodes
    .filter(node => !node.ignored && node.role?.value === role)
    .map(node => ({
      name: String(node.name?.value ?? ""),
      expanded: property(node, "expanded") === "true" ? "true" : property(node, "expanded") === "false" ? "false" : "",
      disabled: property(node, "disabled") === "true" ? "true" : "false",
      value: String(node.value?.value ?? ""),
    }));
}

/** Focused smoke: keyboard, top layer, focus and a touch pointer, in an engine
 * that supports them. A fixture A menu has no popover top layer, so that
 * assertion is B's. */
async function smoke(page: Page, kind: "menu" | "listbox"): Promise<void> {
  const label = kind === "menu" ? "A" : "B";
  await mount(page, kind);
  await page.locator("#control").focus();
  await page.locator("#control").click();
  await waitVisible(page);
  assert.equal(await page.evaluate(() => document.querySelector('[role="listbox"]')!.isConnected), true, `${label}: top-layer surface connected`);
  assert.equal((await state(page)).attrs.focus, true, `${label}: focus stays on the control`);
  if (kind === "listbox") {
    assert.equal(await page.evaluate(() => document.querySelector('[role="listbox"]')!.matches(":popover-open")), true, "B: the surface is a shown popover");
  }
  await page.keyboard.press("ArrowDown");
  assert.equal((await state(page)).active, "Banana", `${label}: keyboard moves the active option`);
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[role="option"]')].find(candidate => candidate.textContent === "Cherry") as HTMLElement;
    row.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
    row.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  assert.equal((await state(page)).text, "Cherry", `${label}: a touch pointer commits`);
  assert.equal((await state(page)).attrs.expanded, "false", `${label}: the touch choice closes`);
  let snapshot = "unavailable";
  try {
    snapshot = await page.locator("#control").ariaSnapshot();
  } catch {
    snapshot = "unavailable in this engine";
  }
  measured[`snapshot${label}`] = snapshot;
  ok(`${label}: keyboard, top-layer, focus and touch pointer`);
}

try {
  const entryA = join(fixture.directory, "fixture-menu.ts");
  await writeFile(entryA, `${BRIDGE}\nwindow.__menuSelector = createMenuSelector;\n`);
  const entryB = join(fixture.directory, "fixture-listbox.ts");
  await writeFile(entryB, `import { createListbox } from "material/components/listbox";\nwindow.__listbox = createListbox;\n`);
  const harness = join(fixture.directory, "harness.js");
  await writeFile(harness, HARNESS);

  // The public import is server-safe and registers nothing.
  const noDom = await run(["bun", "-e", "if (typeof document !== 'undefined') throw new Error('document exists'); await import('material/components/listbox'); console.log('no-dom import ok');"], fixture.directory);
  assert.match(noDom, /no-dom import ok/, "the package imports without a DOM");
  const packageEntries = await readFile(join(fixture.installed, "package.json"), "utf8");
  const manifest = JSON.parse(packageEntries) as { exports: Record<string, unknown>; sideEffects?: unknown };
  assert.ok(manifest.exports["./components/listbox"], "the package exports ./components/listbox");
  assert.ok(manifest.exports["./styles/*"], "the package exports ./styles/*");
  ok("public entry resolves from the packed tarball; imports without a DOM");

  const builtA = await bundle(entryA);
  const builtB = await bundle(entryB);
  // A mixed app keeps its eager menu and adds the factory: the negative case
  // the design asks for, where no code is deduplicated between them.
  const entryMixed = join(fixture.directory, "fixture-mixed.ts");
  await writeFile(entryMixed, `${BRIDGE}\nimport { createListbox } from "material/components/listbox";\nwindow.__menuSelector = createMenuSelector;\nwindow.__listbox = createListbox;\n`);
  const builtMixed = await bundle(entryMixed);
  const forbidden = (path: string): boolean =>
    /components\/(select|list|text-field|menu\/menu|menu\/on-demand|menu\/deferred)\b/.test(path) ||
    /\/elements\//.test(path) ||
    /^.*\/core\//.test(path);
  const leaked = builtB.inputs.filter(forbidden);
  assert.deepEqual(leaked, [], `the factory's closure reaches another component: ${leaked.join(", ")}`);
  assert.ok(builtB.inputs.some(path => /components\/listbox\//.test(path)), "the factory bundle contains the listbox module");
  assert.equal(builtB.dynamic, 0, `the factory bundle holds ${builtB.dynamic} dynamic import(s)`);
  assert.doesNotMatch(builtB.text, /customElements\.define/, "the factory bundle registers no element");
  const registry = builtB.inputs.filter(path => /components\/menu\//.test(path));
  assert.equal(registry.length, 1, `the factory's closure holds ${registry.length} menu modules: ${registry.join(", ")}`);
  assert.match(registry[0]!, /components\/menu\/features\/registry\.js$/, "the only menu module in the factory's closure is the registry leaf");
  ok("the factory's closure is the popup plus the registry leaf, with no dynamic import and no registration");

  const files: Record<string, number> = {};
  for (const file of ["dist/components/listbox/index.js", "dist/components/listbox/index.d.ts", "dist/styles/listbox.js", "dist/styles/listbox.css"]) {
    const bytes = await readFile(join(fixture.installed, file));
    assert.ok(bytes.byteLength > 0, `${file} is empty`);
    files[file] = bytes.byteLength;
  }
  measured.files = files;
  ok("the JS, declaration and sheet files are in the packed tarball");

  const baseSheet = await readFile(join(fixture.installed, "dist/styles/base.css"));
  const base = { path: "styles/base.css", raw: baseSheet.byteLength, gzip: cssGzip(baseSheet) };
  const assetsA = [base, ...(await styleAssets("menu"))];
  const assetsB = [base, ...(await styleAssets("listbox"))];
  assert.ok(await cssText("listbox").then(css => css.includes("mtrl-listbox")), "the listbox sheet is packed");

  const sum = (assets: { gzip: number }[]): number => assets.reduce((total, asset) => total + asset.gzip, 0);
  const totals = {
    A: { js: builtA, css: sum(assetsA), all: builtA.gzip + sum(assetsA) },
    B: { js: builtB, css: sum(assetsB), all: builtB.gzip + sum(assetsB) },
  };
  const saving = totals.A.all - totals.B.all;
  const percent = (saving / totals.A.all) * 100;
  measured.fixtures = {
    A: { js: { raw: builtA.raw, gzip: builtA.gzip, dynamicImports: builtA.dynamic }, css: assetsA, cssGzip: totals.A.css, total: totals.A.all },
    B: { js: { raw: builtB.raw, gzip: builtB.gzip, dynamicImports: builtB.dynamic }, css: assetsB, cssGzip: totals.B.css, total: totals.B.all },
    mixed: { js: { raw: builtMixed.raw, gzip: builtMixed.gzip }, addedOverA: builtMixed.gzip - builtA.gzip },
    gate: { saving, percent: Number(percent.toFixed(1)) },
  };
  console.log(`  A: menu + bridge JS ${builtA.gzip} B gzip, CSS ${totals.A.css} B gzip, total ${totals.A.all} B`);
  console.log(`  B: factory JS ${builtB.gzip} B gzip, CSS ${totals.B.css} B gzip, total ${totals.B.all} B`);
  console.log(`  mixed: eager menu kept and the factory added, JS ${builtMixed.gzip} B gzip (+${builtMixed.gzip - builtA.gzip} B over A)`);
  console.log(`  gate: saving ${saving} B (${percent.toFixed(1)}%), needs >= 1024 B and >= 10%`);

  const fail = (message: string): never => {
    throw new assert.AssertionError({ message });
  };
  if (!(saving >= 1024 && percent >= 10)) {
    fail(`listbox gate not met: saving ${saving} B (${percent.toFixed(1)}%), the design's stop/go needs at least 1024 B and 10%. Record the measurement and hold.`);
  }

  // Chromium: the full behaviour, then the other engines' smoke.
  const chromiumPage = await openPage(chromium);
  browser = chromiumPage.browser;
  await chromiumPage.page.addStyleTag({ content: await cssText("base") });
  await chromiumPage.page.addStyleTag({ content: await cssText("listbox") });
  await chromiumPage.page.addStyleTag({ content: await cssText("menu") });
  await chromiumPage.page.addScriptTag({ content: builtA.text });
  await chromiumPage.page.addScriptTag({ content: builtB.text });
  await chromiumPage.page.addScriptTag({ content: HARNESS });
  await chromiumBehaviour(chromiumPage.page);
  await chromiumPage.page.close();

  // The real tap and pan run in a touch context of the same engine.
  const touchContext = await chromiumPage.browser.newContext({ viewport: { width: 900, height: 600 }, hasTouch: true });
  const touchPage = await touchContext.newPage();
  await touchPage.setContent("<!doctype html><html><body></body></html>");
  await touchPage.addStyleTag({ content: CONTROL_CSS });
  await touchPage.addStyleTag({ content: await cssText("base") });
  await touchPage.addStyleTag({ content: await cssText("listbox") });
  await touchPage.addScriptTag({ content: builtB.text });
  await touchPage.addScriptTag({ content: HARNESS });
  await touchBehaviour(touchPage);
  await touchContext.close();

  const engines: [BrowserType, string][] = [[firefox, "firefox"], [webkit, "webkit"]];
  for (const [engine, name] of engines) {
    try {
      const launched = await openPage(engine);
      await launched.page.addStyleTag({ content: await cssText("base") });
      await launched.page.addStyleTag({ content: await cssText("listbox") });
      await launched.page.addStyleTag({ content: await cssText("menu") });
      await launched.page.addScriptTag({ content: builtA.text });
      await launched.page.addScriptTag({ content: builtB.text });
      await launched.page.addScriptTag({ content: HARNESS });
      await smoke(launched.page, "menu");
      await smoke(launched.page, "listbox");
      await launched.page.close();
      await launched.browser.close();
    } catch (error) {
      // An engine the CI image did not install is recorded, not hidden.
      const message = (error as Error).message;
      if (/Executable doesn't exist|browserType.launch/.test(message)) {
        measured[name] = "unavailable";
        console.log(`  -- ${name}: smoke unavailable (${message.split("\n")[0]})`);
      } else {
        throw error;
      }
    }
  }

  const commit = (await run(["git", "rev-parse", "HEAD"])).trim();
  const report = {
    commit,
    bun: Bun.version,
    browsers,
    fixtures: measured.fixtures,
    accessibility: measured.accessibility,
    accessibilityDisabled: measured.accessibilityDisabled,
    snapshots: { A: measured.snapshotA, B: measured.snapshotB },
    uncovered: [
      "SSR output and registration: styles-package:check, ssr-comments:check, ssr-consumer:check and the ssr browser checks own them",
      "old default assets and layer order: styles-package:check and the packed size checks",
      "visual regression beyond placement and state: no screenshots in this check",
      "forced-colors and high-zoom paint: not exercised; z-order and layout are asserted without the forced-colors mode",
    ],
  };
  await mkdir("analysis/listbox", { recursive: true });
  await writeFile("analysis/listbox/measurements.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(`listbox: gate met in ${((performance.now() - started) / 1000).toFixed(1)}s`);
  ok("measurements written to analysis/listbox/measurements.json");
} finally {
  await browser?.close();
  await fixture.cleanup();
}
