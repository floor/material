#!/usr/bin/env bun
/**
 * A menu announces the item it has chosen, and only that item.
 *
 * A menu marks its chosen item with menuitemradio and aria-checked. role
 * menuitem has no aria-selected to expose, so Chromium drops the attribute and
 * announces nothing: the item reads as an ordinary item, checked or not
 * (WAI-ARIA 1.2, menuitem: "aria-selected is not supported"; menuitemradio:
 * "aria-checked is required" — and Material renders a chosen menu item with a
 * leading check, m3.material.io/components/menus/specs, the selected state of
 * the vertical menu). Only the level that holds the selection is marked: a
 * submenu's items are commands and stay menuitem. A menu with no selection
 * keeps role menuitem and no checked state, and a listbox — a combobox's popup
 * — keeps role option with aria-selected.
 *
 * The check reads the Chromium accessibility tree, what a screen reader
 * receives, beside the DOM attributes, for the factory menu, the <m-menu>
 * element and a listbox menu.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";

interface RawAXValue { value?: unknown }
interface RawAXProperty { name: string; value?: RawAXValue }
interface RawAXNode { nodeId: string; ignored?: boolean; role?: RawAXValue; name?: RawAXValue; properties?: RawAXProperty[] }
interface AXSummary { role: string; name: string; props: Record<string, unknown> }

/** What the page's menu instance offers the checks. */
interface MenuInstance {
  element: HTMLElement;
  open: () => void;
  setSelected: (id: string | null) => void;
  destroy: () => void;
}
interface Lab {
  mtrl: { createMenu: (config: Record<string, unknown>) => MenuInstance };
  menu?: MenuInstance;
  root: HTMLElement;
}

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;
const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineAll, registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/index.ts"))};
registerStyles({ menu: ${JSON.stringify(compile("components/menu"))} });
defineAll();
window.mtrl = mtrl;
`;
const bundleBuild = await Bun.build({
  entrypoints: ["menu-item-checked-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^menu-item-checked-entry\.ts$/ }, () => ({ path: resolve(repoRoot, "menu-item-checked-entry.ts") }));
      build.onLoad({ filter: /menu-item-checked-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundleBuild.success, String(bundleBuild.logs));
const bundleJs = await bundleBuild.outputs[0]!.text();

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body><main id="stage"></main></body></html>`);
  await page.addStyleTag({ content: compile("main") });
  await page.addScriptTag({ content: bundleJs });

  const cdp = await context.newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const readAX = async (): Promise<AXSummary[]> => {
    const { nodes } = (await cdp.send("Accessibility.getFullAXTree")) as { nodes: RawAXNode[] };
    return nodes.filter((node) => !node.ignored).map((node) => {
      const props: Record<string, unknown> = {};
      for (const property of node.properties ?? []) props[property.name] = property.value?.value;
      return { role: String(node.role?.value ?? ""), name: String(node.name?.value ?? ""), props };
    });
  };
  /** The items of one menu surface, its own list's and not a submenu's. */
  const items = (submenu: boolean): Promise<Array<[string, string | null, string | null, string | null]>> =>
    page.evaluate((submenu) => {
      const lab = window as unknown as Lab;
      const surface = submenu
        ? document.querySelector<HTMLElement>(".mtrl-menu--submenu.mtrl-menu--visible")
        : null;
      const root = surface ?? lab.root;
      return Array.from(root.querySelectorAll<HTMLElement>(".mtrl-menu__item"), (item) => [
        item.querySelector(".mtrl-menu__item-text")?.textContent ?? "",
        item.getAttribute("role"),
        item.getAttribute("aria-checked"),
        item.getAttribute("aria-selected"),
      ]);
    }, submenu);
  const present = (ax: AXSummary[], name: string): AXSummary => {
    const node = ax.find((candidate) => candidate.name === name && /menuitem|option/.test(candidate.role));
    assert.ok(node, `no menuitem ax node named ${name}: ${JSON.stringify(ax.filter((n) => n.name).map((n) => [n.role, n.name]))}`);
    return node;
  };
  const checkedNames = async (): Promise<string> =>
    (await readAX()).filter((node) => node.role === "menuitemradio" && String(node.props.checked) === "true")
      .map((node) => node.name).join();

  // A menu with a selected item: its items are menuitemradio, the chosen one
  // checked, the others not.
  await page.evaluate(async () => {
    const lab = window as unknown as Lab;
    document.getElementById("stage")!.innerHTML = `<button id="menu-opener">Size</button>`;
    lab.menu = lab.mtrl.createMenu({
      opener: "#menu-opener",
      ariaLabel: "Size",
      items: [
        { id: "s", text: "Small" },
        { id: "m", text: "Medium" },
        { id: "l", text: "Large" },
      ],
    });
    lab.menu.setSelected("m");
    lab.root = lab.menu.element;
    lab.menu.open();
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  // What a screen reader receives: the chosen item is a checked menuitemradio.
  const selectedAX = await readAX();
  for (const [name, checked] of [["Small", "false"], ["Medium", "true"], ["Large", "false"]] as const) {
    const node = present(selectedAX, name);
    assert.equal(node.role, "menuitemradio", `${name}: announced as ${node.role}, so the selection is not announced`);
    assert.equal(String(node.props.checked), checked, `${name}: checked is ${node.props.checked}, not ${checked}`);
  }
  assert.deepEqual(await items(false), [
    ["Small", "menuitemradio", "false", null],
    ["Medium", "menuitemradio", "true", null],
    ["Large", "menuitemradio", "false", null],
  ], "a selected menu's items are menuitemradio with aria-checked, and no aria-selected");

  // setSelected moves the check.
  await page.evaluate(() => (window as unknown as Lab).menu!.setSelected("l"));
  assert.deepEqual((await items(false)).map(([text, role, checked]) => [text, role, checked]), [
    ["Small", "menuitemradio", "false"],
    ["Medium", "menuitemradio", "false"],
    ["Large", "menuitemradio", "true"],
  ], "setSelected moves the checked state without recreating the items");
  assert.equal(await checkedNames(), "Large", "the announced checked item follows setSelected");

  // Clearing the selection makes the menu a plain menu again: menuitem, no
  // checked state, nothing announced as chosen.
  await page.evaluate(() => (window as unknown as Lab).menu!.setSelected(null));
  assert.deepEqual(await items(false), [
    ["Small", "menuitem", null, null],
    ["Medium", "menuitem", null, null],
    ["Large", "menuitem", null, null],
  ], "setSelected(null) returns the items to menuitem with no checked state");
  const clearedAX = await readAX();
  assert.equal(clearedAX.filter((node) => node.role === "menuitemradio").length, 0,
    "setSelected(null): the items are still announced as menuitemradio");
  assert.equal(present(clearedAX, "Large").props.checked, undefined,
    "setSelected(null): the item still carries a checked state");
  await page.evaluate(() => (window as unknown as Lab).menu!.destroy());

  // A submenu's items are commands under the level that holds the selection:
  // they stay menuitem and never carry its check.
  await page.evaluate(async () => {
    const lab = window as unknown as Lab;
    document.getElementById("stage")!.innerHTML = `<button id="submenu-opener">Edit</button>`;
    document.querySelectorAll(".mtrl-menu").forEach((element) => element.remove());
    lab.menu = lab.mtrl.createMenu({
      opener: "#submenu-opener",
      ariaLabel: "Edit",
      items: [
        { id: "size", text: "Size" },
        { id: "more", text: "More", hasSubmenu: true, submenu: [{ id: "link", text: "Copy link" }] },
      ],
    });
    lab.menu.setSelected("size");
    lab.root = lab.menu.element;
    lab.menu.open();
    await new Promise((resolve) => setTimeout(resolve, 150));
    lab.menu.element.querySelector<HTMLElement>('[data-id="more"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  // The item that opens a submenu is a menuitem with aria-haspopup, never a
  // radio: it is a way into a level, not one of the choices.
  assert.deepEqual(await items(false), [
    ["Size", "menuitemradio", "true", null],
    ["More", "menuitem", null, null],
  ], "the level that holds the selection is menuitemradio, and its submenu opener stays a menuitem");
  const openerAX = present(await readAX(), "More");
  assert.equal(openerAX.role, "menuitem", `the submenu opener is announced as ${openerAX.role}, not menuitem`);
  assert.equal(openerAX.props.checked, undefined, "the submenu opener carries no checked state");
  assert.deepEqual(await items(true), [
    ["Copy link", "menuitem", null, null],
  ], "a submenu's items are commands: menuitem, with no checked state of the level above");
  const submenuAX = await readAX();
  assert.equal(present(submenuAX, "Copy link").role, "menuitem", "a submenu item is announced as menuitem");
  assert.equal(present(submenuAX, "Copy link").props.checked, undefined, "a submenu item carries no checked state");
  assert.equal(await checkedNames(), "Size", "the checked item is the top level's own");

  // Clearing the selection while that submenu is open leaves no menuitemradio
  // anywhere: the level above returns to menuitem, and the submenu never had it.
  await page.evaluate(() => (window as unknown as Lab).menu!.setSelected(null));
  assert.deepEqual(await items(false), [
    ["Size", "menuitem", null, null],
    ["More", "menuitem", null, null],
  ], "setSelected(null) returns the selecting level to menuitem");
  assert.deepEqual(await items(true), [["Copy link", "menuitem", null, null]],
    "setSelected(null): the open submenu still carries a checked state");
  assert.equal((await readAX()).filter((node) => node.role === "menuitemradio").length, 0,
    "setSelected(null): an item is still announced as menuitemradio");
  await page.evaluate(() => (window as unknown as Lab).menu!.destroy());

  // A menu with no selection is a plain menu: menuitem and no checked state.
  await page.evaluate(async () => {
    const lab = window as unknown as Lab;
    document.getElementById("stage")!.innerHTML = `<button id="menu-opener">Cut</button>`;
    document.querySelectorAll(".mtrl-menu").forEach((element) => element.remove());
    lab.menu = lab.mtrl.createMenu({
      opener: "#menu-opener",
      ariaLabel: "Cut",
      items: [{ id: "cut", text: "Cut" }, { id: "copy", text: "Copy" }],
    });
    lab.root = lab.menu.element;
    lab.menu.open();
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.deepEqual(await items(false), [
    ["Cut", "menuitem", null, null],
    ["Copy", "menuitem", null, null],
  ], "a menu with no selection keeps role menuitem and carries no checked state");

  // A listbox keeps option and aria-selected.
  await page.evaluate(async () => {
    const lab = window as unknown as Lab;
    document.getElementById("stage")!.innerHTML = `<button id="listbox-opener">Combo</button>`;
    document.querySelectorAll(".mtrl-menu").forEach((element) => element.remove());
    lab.menu = lab.mtrl.createMenu({
      opener: "#listbox-opener",
      listbox: true,
      items: [{ id: "s", text: "Small" }, { id: "m", text: "Medium" }],
    });
    lab.menu.setSelected("m");
    lab.root = lab.menu.element;
    document.getElementById("stage")!.append(lab.menu.element);
  });
  assert.deepEqual(await items(false), [
    ["Small", "option", null, "false"],
    ["Medium", "option", null, "true"],
  ], "a listbox keeps role option with aria-selected, and no aria-checked");

  // The <m-menu> element renders the same markup for the same state.
  await page.evaluate(async () => {
    const lab = window as unknown as Lab;
    lab.menu?.destroy();
    document.querySelectorAll(".mtrl-menu").forEach((element) => element.remove());
    document.getElementById("stage")!.innerHTML = `
      <button id="el-opener">Size</button>
      <m-menu id="el-menu" anchor="el-opener" aria-label="Size" open>
        <m-menu-item value="s">Small</m-menu-item>
        <m-menu-item value="m">Medium</m-menu-item>
        <m-menu-item value="l">Large</m-menu-item>
      </m-menu>`;
    await new Promise((resolve) => setTimeout(resolve, 150));
    const host = document.getElementById("el-menu") as unknown as { component: { setSelected: (id: string) => void } };
    host.component.setSelected("m");
    (window as unknown as Lab).root = document.getElementById("el-menu")!.shadowRoot as unknown as HTMLElement;
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.deepEqual(await items(false), [
    ["Small", "menuitemradio", "false", null],
    ["Medium", "menuitemradio", "true", null],
    ["Large", "menuitemradio", "false", null],
  ], "<m-menu> renders the same menuitemradio markup as the factory for the same selection");
  assert.equal(String(present(await readAX(), "Medium").props.checked), "true", "<m-menu>: the selected item is checked in the AX tree");

  assert.deepEqual(errors, []);
  console.log("Passed packed menu checked state: a menu with a selection renders menuitemradio with aria-checked and Chromium announces the checked item, follows setSelected, and returns to menuitem when the selection is cleared; a submenu's items stay menuitem; a menu with no selection keeps menuitem; a listbox keeps option with aria-selected; <m-menu> renders the same markup and announces the same state.");
} finally {
  await browser.close();
}
