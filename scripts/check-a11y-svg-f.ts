#!/usr/bin/env bun
/**
 * Patch (f), A19. CDP accessibility tree for decorative icons.
 *
 * Loads dist/styles.css. A closed search dialog stays on screen only with
 * that sheet, which is why an unstyled fixture missed the naming regressions.
 *
 * A control that keeps its own name has no non-ignored graphic descendant
 * (image, graphics-document, graphics-symbol, graphics-object, svg-root),
 * whether or not that graphic has a name. A sole titled icon stays exposed
 * when the control has no other name, and that control's name stays "Save".
 * Names are read from the accessibility node of that element. The menu item
 * is read after the real stylesheet has shown the menu, and before the search
 * view opens over it. A closed menu is visibility:hidden and has no node.
 *
 * The checkbox icon is not in this page. test/components/checkbox/checkbox.test.ts
 * pins .mtrl-checkbox__icon with isEqualNode to markup that has no aria-hidden,
 * and that test stays as it is. This check does not require that icon to be absent.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, type CDPSession } from "playwright";

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" data-icon="menu"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>`;
const SAVE = `<svg viewBox="0 0 24 24"><title>Save</title><path d="M0 0h24v24H0z"/></svg>`;

const SOLE_HOSTS = [
  "#icon-only",
  "#space-label",
  "#cleared-text",
  "#cleared-label",
  "#fab-refresh",
  "#empty-label",
  "#titled-refresh",
];

type Factory = (config?: object) => {
  element: HTMLElement;
  open?: () => void;
  close?: () => void;
  expand?: () => void;
  collapse?: () => void;
  isOpen?: () => boolean;
  setText?: (text: string) => void;
  setAriaLabel?: (label: string) => void;
  setIcon?: (html: string) => void;
  setLeadingIcon?: (html: string) => void;
  setType?: (type: string) => void;
};

/** Page fields for this check only. Not `declare global`: `ready`, `m`, and `clock` already augment Window in other check scripts. */
type SvgCheckWindow = {
  ready?: boolean;
  mountError?: string;
  m?: Record<string, Factory>;
  notice?: ReturnType<Factory>;
  clock?: ReturnType<Factory>;
  searchBar?: ReturnType<Factory>;
  searchView?: ReturnType<Factory>;
};

type AxNode = {
  nodeId?: string;
  ignored?: boolean;
  role?: { value?: string };
  name?: { value?: string };
  childIds?: string[];
  backendDOMNodeId?: number;
};

const GRAPHIC = new Set(["image", "graphics-document", "graphics-symbol", "graphics-object", "svg-root"]);

const stylesheet = Bun.file(resolve("dist/styles.css"));
assert(await stylesheet.exists(), "dist/styles.css is missing");

const bundle = await Bun.build({
  entrypoints: [resolve("scripts/check-a11y-svg-f-entry.ts")],
  target: "browser",
});
assert(bundle.success, bundle.logs.join("\n"));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/material.js") {
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    }
    if (url.pathname === "/styles.css") return new Response(stylesheet);
    return new Response(`<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head><body>
      <script type="module">
        import { createButton, createIconButton, createFab, createExtendedFab, createSwitch, createMenu, createSearch, createDialog, createTimePicker, createTextField, createSelect, enableDecorativeIcons } from "/material.js";
        enableDecorativeIcons();
        window.m = { createButton, createIconButton, createFab, createExtendedFab, createSwitch, createMenu, createSearch, createDialog, createTimePicker, createTextField, createSelect };
        window.ready = true;
      </script>
    </body></html>`, { headers: { "Content-Type": "text/html" } });
  },
});

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url.href);
  await page.waitForFunction(() => (window as unknown as SvgCheckWindow).ready === true);

  await page.evaluate(({ icon, save }) => {
    const view = window as unknown as SvgCheckWindow;
    const m = view.m;
    if (!m) throw new Error("factories missing");
    const add = (element: HTMLElement) => document.body.append(element);
    try {
      const saveButton = m.createButton({ text: "Save", icon });
      saveButton.element.id = "named-button";
      add(saveButton.element);

      const only = m.createButton({ icon: save });
      only.element.id = "icon-only";
      add(only.element);

      const space = m.createButton({ icon: save, ariaLabel: " " });
      space.element.id = "space-label";
      add(space.element);

      const clearedText = m.createButton({ icon: save, text: "Text" });
      clearedText.setText?.("");
      clearedText.element.id = "cleared-text";
      add(clearedText.element);

      const clearedLabel = m.createButton({ icon: save, ariaLabel: "Action" });
      clearedLabel.setAriaLabel?.("");
      clearedLabel.element.id = "cleared-label";
      add(clearedLabel.element);

      const emptyLabel = m.createButton({ icon: save, ariaLabel: "" });
      emptyLabel.element.id = "empty-label";
      add(emptyLabel.element);

      const titledRefresh = m.createButton({ icon: save });
      titledRefresh.setIcon?.(save);
      titledRefresh.element.id = "titled-refresh";
      add(titledRefresh.element);

      const favorite = m.createIconButton({ icon: save, ariaLabel: "Favorite" });
      favorite.element.id = "favorite";
      add(favorite.element);

      const create = m.createFab({ icon, ariaLabel: "Create" });
      create.element.id = "create";
      add(create.element);

      const refreshed = m.createFab({ icon: save });
      refreshed.setIcon?.(save);
      refreshed.element.id = "fab-refresh";
      add(refreshed.element);

      const compose = m.createExtendedFab({ text: "Compose", icon });
      compose.element.id = "compose";
      add(compose.element);

      // Default switch HTML stays the recorded bytes. The thumb graphic is
      // hidden only with the wrapper opt-in, the one output allowed to change.
      const wifi = m.createSwitch({ label: "Wi-Fi", controlLabelOnly: true });
      wifi.element.id = "wifi";
      add(wifi.element);

      const opener = document.createElement("button");
      opener.id = "menu-opener";
      opener.textContent = "Edit";
      add(opener);
      const menu = m.createMenu({ opener, items: [{ id: "cut", text: "Cut", icon }] });
      menu.element.id = "edit-menu";
      menu.open?.();

      const bar = m.createSearch({});
      bar.element.id = "search-bar";
      add(bar.element);
      view.searchBar = bar;

      const search = m.createSearch({
        value: "notes",
        suggestions: [{ text: "Documents", icon: save }],
        trailingItems: [{ id: "filter", type: "icon", content: save, ariaLabel: "Filter" }],
      });
      search.element.id = "search-view";
      add(search.element);
      view.searchView = search;

      // Left closed for the first tree. A modal dialog makes the rest of the
      // page inert, so these open one at a time after that tree is read.
      const dialog = m.createDialog({ title: "Notice", closeButton: true, layer: "top" });
      dialog.element.id = "notice";
      add(dialog.element);
      view.notice = dialog;

      const picker = m.createTimePicker({ value: "09:30" });
      picker.element.id = "clock";
      add(picker.element);
      view.clock = picker;

      const email = m.createTextField({ label: "Email", trailingIcon: icon, trailingIconLabel: "Clear text" });
      email.element.id = "email";
      add(email.element);

      const country = m.createSelect({ label: "Country", options: [{ id: "fr", text: "France" }] });
      country.element.id = "country";
      add(country.element);
    } catch (error) {
      view.mountError = error instanceof Error ? error.message : String(error);
    }
  }, { icon: ICON, save: SAVE });

  const mountError = await page.evaluate(() => (window as unknown as SvgCheckWindow).mountError ?? "");
  assert.equal(mountError, "", mountError);
  assert.deepEqual(errors, [], errors.join("\n"));
  assert.equal(await page.evaluate(() => document.querySelector(".mtrl-checkbox__icon") === null), true);

  // Closed, the menu is visibility:hidden and has no accessibility node.
  // aria-hidden="false" is set in the same turn as the visible class, and the
  // visibility transition is what exposes the item. Read that item before the
  // search view opens over it.
  await page.waitForFunction(() => {
    const menu = document.getElementById("edit-menu");
    return !!menu
      && menu.classList.contains("mtrl-menu--visible")
      && menu.getAttribute("aria-hidden") === "false"
      && getComputedStyle(menu).visibility === "visible";
  });

  const cdp: CDPSession = await page.context().newCDPSession(page);

  const axNodes = async (): Promise<AxNode[]> => {
    const tree = (await cdp.send("Accessibility.getFullAXTree")) as { nodes: AxNode[] };
    return tree.nodes;
  };

  const backendOf = async (selector: string): Promise<number> => {
    const described = await cdp.send("DOM.getDocument") as { root: { nodeId: number } };
    const queried = await cdp.send("DOM.querySelector", {
      nodeId: described.root.nodeId,
      selector,
    }) as { nodeId: number };
    assert.notEqual(queried.nodeId, 0, `missing ${selector}`);
    const details = await cdp.send("DOM.describeNode", { nodeId: queried.nodeId }) as { node: { backendNodeId: number } };
    return details.node.backendNodeId;
  };

  const graphicsUnder = (nodes: AxNode[], root: AxNode): string[] => {
    const byId = new Map<string, AxNode>();
    for (const node of nodes) if (node.nodeId) byId.set(node.nodeId, node);
    const found: string[] = [];
    const walk = (id: string): void => {
      const node = byId.get(id);
      if (!node) return;
      const role = node.role?.value ?? "";
      if (node.ignored !== true && GRAPHIC.has(role)) found.push(`${role}:${node.name?.value ?? ""}`);
      for (const child of node.childIds ?? []) walk(child);
    };
    for (const child of root.childIds ?? []) walk(child);
    return found;
  };

  const inspect = async (selector: string, nodes: AxNode[]) => {
    const backend = await backendOf(selector);
    const node = nodes.find((item) => item.backendDOMNodeId === backend && item.ignored !== true)
      ?? nodes.find((item) => item.backendDOMNodeId === backend);
    assert.ok(node, `no accessibility node for ${selector}`);
    return {
      name: node.name?.value ?? "",
      ignored: node.ignored === true,
      graphics: graphicsUnder(nodes, node),
    };
  };

  const named = async (selector: string, name: string, nodes: AxNode[]): Promise<void> => {
    const seen = await inspect(selector, nodes);
    assert.equal(seen.ignored, false, `${selector} is ignored`);
    assert.equal(seen.name, name, `${selector} name is "${seen.name}"`);
    assert.deepEqual(seen.graphics, [], `${selector} still exposes ${seen.graphics.join(", ")}`);
  };

  const soleTitle = async (selector: string, nodes: AxNode[]): Promise<void> => {
    const seen = await inspect(selector, nodes);
    assert.equal(seen.ignored, false, `${selector} is ignored`);
    assert.equal(seen.name, "Save", `${selector} name is "${seen.name}"`);
  };

  const insideSoleHost = async (backendDOMNodeId: number | undefined): Promise<boolean> => {
    if (backendDOMNodeId === undefined) return false;
    const resolved = await cdp.send("DOM.resolveNode", { backendNodeId: backendDOMNodeId }) as { object?: { objectId?: string } };
    const objectId = resolved.object?.objectId;
    if (!objectId) return false;
    const called = await cdp.send("Runtime.callFunctionOn", {
      objectId,
      functionDeclaration: `function () {
        const hosts = ${JSON.stringify(SOLE_HOSTS)};
        return hosts.some((selector) => typeof this.closest === "function" && this.closest(selector) !== null);
      }`,
      returnByValue: true,
    }) as { result?: { value?: boolean } };
    return called.result?.value === true;
  };

  const unnamedGraphics = async (nodes: AxNode[]): Promise<string[]> => {
    const found: string[] = [];
    for (const node of nodes) {
      if (node.ignored === true) continue;
      const role = node.role?.value ?? "";
      if (!GRAPHIC.has(role) || (node.name?.value ?? "") !== "") continue;
      if (await insideSoleHost(node.backendDOMNodeId)) continue;
      found.push(role);
    }
    return found;
  };

  const menuSelector = "#edit-menu [role='menuitem']";
  let menuPage: AxNode[] = [];
  const menuDeadline = Date.now() + 2000;
  while (Date.now() < menuDeadline) {
    menuPage = await axNodes();
    const backend = await backendOf(menuSelector);
    if (menuPage.some((item) => item.backendDOMNodeId === backend && item.ignored !== true)) break;
    await page.waitForTimeout(50);
  }
  await named(menuSelector, "Cut", menuPage);

  await page.evaluate(() => (window as unknown as SvgCheckWindow).searchView?.expand?.());
  await page.waitForFunction(() => document.querySelector("#search-view .mtrl-search__leading-icon")?.getAttribute("aria-label") === "Go back");

  const dom = await page.evaluate(() => {
    const attr = (selector: string, name: string) => document.querySelector(selector)?.getAttribute(name) ?? null;
    const title = (selector: string) => document.querySelector(selector)?.textContent ?? "";
    const missing = (selector: string) => document.querySelector(selector) === null;
    return {
      namedHidden: attr("#named-button .mtrl-button__icon", "aria-hidden"),
      namedAuthor: attr("#named-button svg", "data-icon"),
      namedSvgHidden: attr("#named-button svg", "aria-hidden"),
      onlyHidden: attr("#icon-only .mtrl-button__icon", "aria-hidden"),
      onlyTitle: title("#icon-only svg title"),
      onlySvgHidden: attr("#icon-only svg", "aria-hidden"),
      spaceHidden: attr("#space-label .mtrl-button__icon", "aria-hidden"),
      spaceTitle: title("#space-label svg title"),
      spaceSvgHidden: attr("#space-label svg", "aria-hidden"),
      spaceHostLabel: attr("#space-label", "aria-label"),
      clearedTextHidden: attr("#cleared-text .mtrl-button__icon", "aria-hidden"),
      clearedTextTitle: title("#cleared-text svg title"),
      clearedTextSvgHidden: attr("#cleared-text svg", "aria-hidden"),
      clearedLabelHidden: attr("#cleared-label .mtrl-button__icon", "aria-hidden"),
      clearedLabelTitle: title("#cleared-label svg title"),
      clearedLabelSvgHidden: attr("#cleared-label svg", "aria-hidden"),
      clearedHostLabel: attr("#cleared-label", "aria-label"),
      emptyHidden: attr("#empty-label .mtrl-button__icon", "aria-hidden"),
      emptyTitle: title("#empty-label svg title"),
      emptyHostLabel: attr("#empty-label", "aria-label"),
      refreshHidden: attr("#titled-refresh .mtrl-button__icon", "aria-hidden"),
      refreshTitle: title("#titled-refresh svg title"),
      refreshSvgHidden: attr("#titled-refresh svg", "aria-hidden"),
      favoriteHidden: attr("#favorite .mtrl-icon-button__icon", "aria-hidden"),
      favoriteTitle: title("#favorite svg title"),
      favoriteSvgHidden: attr("#favorite svg", "aria-hidden"),
      createHidden: attr("#create .mtrl-fab__icon", "aria-hidden"),
      fabRefreshHidden: attr("#fab-refresh .mtrl-fab__icon", "aria-hidden"),
      fabRefreshTitle: title("#fab-refresh svg title"),
      fabRefreshSvgHidden: attr("#fab-refresh svg", "aria-hidden"),
      fabHostLabel: attr("#fab-refresh", "aria-label"),
      composeHidden: attr("#compose .mtrl-extended-fab__icon", "aria-hidden"),
      switchHidden: attr("#wifi .mtrl-switch__thumb-icon", "aria-hidden"),
      menuHidden: attr("#edit-menu .mtrl-menu__item-icon", "aria-hidden"),
      barLabel: attr("#search-bar .mtrl-search__leading-icon", "aria-label"),
      barHidden: attr("#search-bar .mtrl-search__leading-icon [aria-hidden='true']", "aria-hidden"),
      searchLabel: attr("#search-view .mtrl-search__leading-icon", "aria-label"),
      searchHidden: attr("#search-view .mtrl-search__leading-icon [aria-hidden='true']", "aria-hidden"),
      suggestionHidden: attr("#search-view .mtrl-search__suggestion-icon", "aria-hidden"),
      suggestionTitle: title("#search-view .mtrl-search__suggestion-icon svg title"),
      filterLabel: attr("#search-view [data-trailing-id='filter']", "aria-label"),
      filterHidden: attr("#search-view [data-trailing-id='filter'] [aria-hidden='true']", "aria-hidden"),
      filterTitle: title("#search-view [data-trailing-id='filter'] svg title"),
      filterSvgHidden: attr("#search-view [data-trailing-id='filter'] svg", "aria-hidden"),
      closeHidden: attr("#notice [aria-label='Close dialog'] svg", "aria-hidden"),
      closeFocusable: attr("#notice [aria-label='Close dialog'] svg", "focusable"),
      toggleLabel: attr("#clock .mtrl-time-picker__toggle-type", "aria-label"),
      toggleHidden: attr("#clock .mtrl-time-picker__toggle-type [aria-hidden='true']", "aria-hidden"),
      trailingHidden: attr("#email .mtrl-text-field__trailing-icon--button [aria-hidden='true']", "aria-hidden"),
      trailingAuthor: attr("#email .mtrl-text-field__trailing-icon--button svg", "data-icon"),
      selectHidden: attr("#country .mtrl-text-field__trailing-icon", "aria-hidden"),
      selectTag: document.querySelector("#country .mtrl-text-field__trailing-icon")?.tagName ?? "",
      gone: [
        "#named-button .mtrl-button__icon",
        "#icon-only .mtrl-button__icon",
        "#space-label .mtrl-button__icon",
        "#cleared-text .mtrl-button__icon",
        "#fab-refresh .mtrl-fab__icon",
        "#favorite .mtrl-icon-button__icon",
        "#search-view .mtrl-search__suggestion-icon",
        "#clock .mtrl-time-picker__toggle-type",
      ].filter(missing),
    };
  });

  assert.deepEqual(dom, {
    namedHidden: "true",
    namedAuthor: "menu",
    namedSvgHidden: null,
    onlyHidden: null,
    onlyTitle: "Save",
    onlySvgHidden: null,
    spaceHidden: null,
    spaceTitle: "Save",
    spaceSvgHidden: null,
    spaceHostLabel: " ",
    clearedTextHidden: null,
    clearedTextTitle: "Save",
    clearedTextSvgHidden: null,
    clearedLabelHidden: null,
    clearedLabelTitle: "Save",
    clearedLabelSvgHidden: null,
    clearedHostLabel: "",
    emptyHidden: null,
    emptyTitle: "Save",
    emptyHostLabel: null,
    refreshHidden: null,
    refreshTitle: "Save",
    refreshSvgHidden: null,
    favoriteHidden: "true",
    favoriteTitle: "Save",
    favoriteSvgHidden: null,
    createHidden: "true",
    fabRefreshHidden: null,
    fabRefreshTitle: "Save",
    fabRefreshSvgHidden: null,
    fabHostLabel: null,
    composeHidden: "true",
    switchHidden: "true",
    menuHidden: "true",
    barLabel: "Search",
    barHidden: "true",
    searchLabel: "Go back",
    searchHidden: "true",
    suggestionHidden: "true",
    suggestionTitle: "Save",
    filterLabel: "Filter",
    filterHidden: "true",
    filterTitle: "Save",
    filterSvgHidden: null,
    closeHidden: "true",
    closeFocusable: "false",
    toggleLabel: "Toggle input picker",
    toggleHidden: "true",
    trailingHidden: "true",
    trailingAuthor: "menu",
    selectHidden: "true",
    selectTag: "SPAN",
    gone: [],
  });

  const openPage = await axNodes();
  for (const selector of SOLE_HOSTS) await soleTitle(selector, openPage);
  await named("#named-button", "Save", openPage);
  await named("#favorite", "Favorite", openPage);
  await named("#create", "Create", openPage);
  await named("#compose", "Compose", openPage);
  await named("#wifi .mtrl-switch__input", "Wi-Fi", openPage);
  await named("#search-bar .mtrl-search__leading-icon", "Search", openPage);
  await named("#search-view .mtrl-search__leading-icon", "Go back", openPage);
  await named("#search-view .mtrl-search__clear-button", "Clear search", openPage);
  await named("#search-view [data-trailing-id='filter']", "Filter", openPage);
  await named("#search-view [role='option']", "Documents", openPage);
  await named("#email .mtrl-text-field__trailing-icon--button", "Clear text", openPage);
  await named("#country [role='combobox']", "Country", openPage);
  assert.deepEqual(await unnamedGraphics(openPage), [], "unnamed graphic nodes while the page is not modal");

  await page.evaluate((save) => (window as unknown as SvgCheckWindow).searchBar?.setLeadingIcon?.(save), SAVE);
  await page.waitForFunction(() => document.querySelector("#search-bar .mtrl-search__leading-icon svg title")?.textContent === "Save");
  const replaced = await axNodes();
  await named("#search-bar .mtrl-search__leading-icon", "Search", replaced);
  const replacedDom = await page.evaluate(() => ({
    hidden: document.querySelector("#search-bar .mtrl-search__leading-icon [aria-hidden='true']")?.getAttribute("aria-hidden") ?? null,
    svgHidden: document.querySelector("#search-bar .mtrl-search__leading-icon svg")?.getAttribute("aria-hidden") ?? null,
  }));
  assert.deepEqual(replacedDom, { hidden: "true", svgHidden: null });

  await page.evaluate(() => (window as unknown as SvgCheckWindow).searchBar?.expand?.());
  await page.waitForFunction(() => document.querySelector("#search-bar .mtrl-search__leading-icon")?.getAttribute("aria-label") === "Go back");
  await named("#search-bar .mtrl-search__leading-icon", "Go back", await axNodes());

  await page.evaluate(() => (window as unknown as SvgCheckWindow).searchBar?.collapse?.());
  await page.waitForFunction(() => {
    const leading = document.querySelector("#search-bar .mtrl-search__leading-icon");
    return leading?.getAttribute("aria-label") === "Search" && leading.querySelector("svg title")?.textContent === "Save";
  });
  const collapsed = await axNodes();
  await named("#search-bar .mtrl-search__leading-icon", "Search", collapsed);
  assert.equal(
    await page.evaluate(() => document.querySelector("#search-bar .mtrl-search__leading-icon svg")?.getAttribute("aria-hidden") ?? null),
    null,
  );

  await page.evaluate(() => (window as unknown as SvgCheckWindow).notice?.open?.());
  await page.waitForFunction(() => (document.getElementById("notice") as HTMLDialogElement | null)?.open === true);
  const dialogPage = await axNodes();
  await named("#notice [aria-label='Close dialog']", "Close dialog", dialogPage);
  assert.deepEqual(await unnamedGraphics(dialogPage), [], "unnamed graphic nodes in the open dialog");

  await page.evaluate(() => {
    const view = window as unknown as SvgCheckWindow;
    view.notice?.close?.();
    view.clock?.open?.();
  });
  await page.waitForFunction(() => (document.querySelector("#clock dialog") as HTMLDialogElement | null)?.open === true);
  const dialPage = await axNodes();
  await named("#clock .mtrl-time-picker__toggle-type", "Toggle input picker", dialPage);
  assert.deepEqual(await unnamedGraphics(dialPage), [], "unnamed graphic nodes in the open time picker");

  await page.evaluate(() => (window as unknown as SvgCheckWindow).clock?.setType?.("input"));
  await page.waitForFunction(() => document.querySelector("#clock .mtrl-time-picker__toggle-type")?.getAttribute("aria-label") === "Toggle dial picker");
  const inputPage = await axNodes();
  await named("#clock .mtrl-time-picker__toggle-type", "Toggle dial picker", inputPage);
  assert.equal(
    await page.evaluate(() => document.querySelector("#clock .mtrl-time-picker__toggle-type [aria-hidden='true']")?.getAttribute("aria-hidden") ?? null),
    "true",
  );
  assert.deepEqual(await unnamedGraphics(inputPage), [], "unnamed graphic nodes in input mode");
  await cdp.detach();
} finally {
  await browser.close();
  server.stop();
}
