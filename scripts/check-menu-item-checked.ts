#!/usr/bin/env bun
/**
 * A menu that carries a selection announces it.
 *
 * A menu marks its chosen item with menuitemradio and aria-checked. role
 * menuitem has no aria-selected to expose, so Chromium drops the attribute and
 * announces nothing: the item reads as an ordinary item, checked or not
 * (WAI-ARIA 1.2, menuitem: "aria-selected is not supported"; menuitemradio:
 * "aria-checked is required" — and Material renders a chosen menu item with a
 * leading check, m3.material.io/components/menus/specs, the selected state of
 * the vertical menu). A menu with no selection keeps role menuitem and no
 * checked state, and a listbox — a combobox's popup — keeps role option with
 * aria-selected.
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

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const mainCss = sass.compileString(`@use "main";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;
const menuCss = sass.compileString(`@use "components/menu";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineAll, registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/index.ts"))};
registerStyles({ menu: ${JSON.stringify(menuCss)} });
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
  await page.addStyleTag({ content: mainCss });
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
  const menuItems = (): Promise<Array<{ text: string; role: string | null; checked: string | null; selected: string | null }>> =>
    page.evaluate(() => Array.from(
      (window as unknown as { root: HTMLElement }).root.querySelectorAll<HTMLElement>(".mtrl-menu__item"),
      (item) => ({
        text: item.querySelector(".mtrl-menu__item-text")?.textContent ?? "",
        role: item.getAttribute("role"),
        checked: item.getAttribute("aria-checked"),
        selected: item.getAttribute("aria-selected"),
      }),
    ));
  const present = (ax: AXSummary[], name: string): AXSummary => {
    const node = ax.find((candidate) => candidate.name === name && /menuitem|option/.test(candidate.role));
    assert.ok(node, `no menuitem ax node named ${name}: ${JSON.stringify(ax.filter((n) => n.name).map((n) => [n.role, n.name]))}`);
    return node;
  };

  // A menu with a selected item: every item is a menuitemradio, the chosen one
  // checked, the others not.
  await page.evaluate(async () => {
    const stage = document.getElementById("stage")!;
    stage.innerHTML = `<button id="menu-opener">Size</button>`;
    const w = window as unknown as { mtrl: { createMenu: (config: Record<string, unknown>) => { open: () => void; setSelected: (id: string | null) => void; destroy: () => void } }; menu?: { destroy: () => void } };
    w.menu = w.mtrl.createMenu({
      opener: "#menu-opener",
      ariaLabel: "Size",
      items: [
        { id: "s", text: "Small" },
        { id: "m", text: "Medium" },
        { id: "l", text: "Large" },
      ],
    });
    w.menu.setSelected("m");
    (window as unknown as { root: HTMLElement }).root = (w.menu as unknown as { element: HTMLElement }).element;
    w.menu.open();
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  // What a screen reader receives: the chosen item is a checked menuitemradio.
  const selectedAX = await readAX();
  for (const [name, checked] of [["Small", "false"], ["Medium", "true"], ["Large", "false"]] as const) {
    const node = present(selectedAX, name);
    assert.equal(node.role, "menuitemradio", `${name}: announced as ${node.role}, so the selection is not announced`);
    assert.equal(String(node.props.checked), checked, `${name}: checked is ${node.props.checked}, not ${checked}`);
  }
  assert.deepEqual(await menuItems(), [
    { text: "Small", role: "menuitemradio", checked: "false", selected: null },
    { text: "Medium", role: "menuitemradio", checked: "true", selected: null },
    { text: "Large", role: "menuitemradio", checked: "false", selected: null },
  ], "a selected menu's items are menuitemradio with aria-checked, and no aria-selected");
  // setSelected moves the check, and creating an item with a selection live
  // gives it the same role.
  await page.evaluate(async () => {
    const w = window as unknown as { menu: { setSelected: (id: string | null) => void } };
    w.menu.setSelected("l");
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  assert.deepEqual((await menuItems()).map((item) => [item.text, item.role, item.checked]), [
    ["Small", "menuitemradio", "false"],
    ["Medium", "menuitemradio", "false"],
    ["Large", "menuitemradio", "true"],
  ], "setSelected moves the checked state without recreating the items");
  assert.equal((await readAX()).filter((node) => node.role === "menuitemradio" && String(node.props.checked) === "true").map((node) => node.name).join(), "Large",
    "the announced checked item follows setSelected");

  // A menu with no selection keeps menuitem and carries no checked state.
  await page.evaluate(async () => {
    const stage = document.getElementById("stage")!;
    const w = window as unknown as { menu?: { destroy: () => void }; mtrl: { createMenu: (config: Record<string, unknown>) => { open: () => void; destroy: () => void } } };
    w.menu?.destroy();
    stage.innerHTML = `<button id="menu-opener">Edit</button>`;
    w.menu = w.mtrl.createMenu({
      opener: "#menu-opener",
      ariaLabel: "Edit",
      items: [{ id: "cut", text: "Cut" }, { id: "copy", text: "Copy" }],
    });
    (window as unknown as { root: HTMLElement }).root = (w.menu as unknown as { element: HTMLElement }).element;
    w.menu.open();
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.deepEqual((await menuItems()).map((item) => [item.text, item.role, item.checked, item.selected]), [
    ["Cut", "menuitem", null, null],
    ["Copy", "menuitem", null, null],
  ], "a menu with no selection keeps role menuitem and carries no checked state");

  // A listbox keeps option and aria-selected.
  await page.evaluate(async () => {
    const stage = document.getElementById("stage")!;
    const w = window as unknown as { menu?: { destroy: () => void }; mtrl: { createMenu: (config: Record<string, unknown>) => { setSelected: (id: string) => void; destroy: () => void } } };
    w.menu?.destroy();
    stage.innerHTML = `<button id="listbox-opener">Combo</button>`;
    w.menu = w.mtrl.createMenu({
      opener: "#listbox-opener",
      listbox: true,
      items: [{ id: "s", text: "Small" }, { id: "m", text: "Medium" }],
    });
    w.menu.setSelected("m");
    (window as unknown as { root: HTMLElement }).root = (w.menu as unknown as { element: HTMLElement }).element;
    stage.append((w.menu as unknown as { element: HTMLElement }).element);
  });
  assert.deepEqual((await menuItems()).map((item) => [item.text, item.role, item.checked, item.selected]), [
    ["Small", "option", null, "false"],
    ["Medium", "option", null, "true"],
  ], "a listbox keeps role option with aria-selected, and no aria-checked");

  // The <m-menu> element renders the same markup for the same state.
  await page.evaluate(async () => {
    const stage = document.getElementById("stage")!;
    const w = window as unknown as { menu?: { destroy: () => void } };
    w.menu?.destroy();
    document.querySelectorAll(".mtrl-menu").forEach((element) => element.remove());
    stage.innerHTML = `
      <button id="el-opener">Size</button>
      <m-menu id="el-menu" anchor="el-opener" aria-label="Size" open>
        <m-menu-item value="s">Small</m-menu-item>
        <m-menu-item value="m">Medium</m-menu-item>
        <m-menu-item value="l">Large</m-menu-item>
      </m-menu>`;
    await new Promise((resolve) => setTimeout(resolve, 150));
    (document.getElementById("el-menu") as unknown as { component: { setSelected: (id: string) => void } }).component.setSelected("m");
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.deepEqual(await page.evaluate(() => {
    const host = document.getElementById("el-menu")!;
    return Array.from(host.shadowRoot!.querySelectorAll<HTMLElement>(".mtrl-menu__item"), (item) => [
      item.querySelector(".mtrl-menu__item-text")?.textContent,
      item.getAttribute("role"),
      item.getAttribute("aria-checked"),
      item.getAttribute("aria-selected"),
    ]);
  }), [
    ["Small", "menuitemradio", "false", null],
    ["Medium", "menuitemradio", "true", null],
    ["Large", "menuitemradio", "false", null],
  ], "<m-menu> renders the same menuitemradio markup as the factory for the same selection");
  const elementAX = await readAX();
  assert.equal(String(present(elementAX, "Medium").props.checked), "true", "<m-menu>: the selected item is checked in the AX tree");

  assert.deepEqual(errors, []);
  console.log("Passed packed menu checked state: a menu with a selection renders menuitemradio with aria-checked and Chromium announces the checked item; a menu with no selection keeps menuitem; a listbox keeps option with aria-selected; <m-menu> renders the same markup and announces the same state.");
} finally {
  await browser.close();
}
