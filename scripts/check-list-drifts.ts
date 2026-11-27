#!/usr/bin/env bun
/**
 * The ten list drifts against the list specs.
 * https://m3.material.io/components/lists/specs (2026-11-27):
 * between-space 12dp, expressive icons 20dp, selected hover/focus/press icons
 * on-surface, unselected segmented trailing icon on-surface.
 *
 * On main the gap is 16px, segmented icons are 24px, a selected icon stays
 * on-secondary-container through hover, focus and press, and a segmented
 * trailing icon is on-surface-variant. Row height and vertical padding do not
 * move with the gap.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { webkit, type Browser, type Page } from "playwright";
import { compileString } from "sass";

import { launchChromium } from "./browser-profile";

const repoRoot = resolve(import.meta.dir, "..");
const css = compileString(`@use "themes/baseline"; @use "components/list";`, {
  loadPaths: [resolve(repoRoot, "src/styles")],
  style: "expanded",
}).css;

const bundle = await Bun.build({
  entrypoints: ["list-drifts-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^list-drifts-entry\.ts$/ }, () => ({ path: "list-drifts-entry.ts", namespace: "list-drifts" }));
      build.onLoad({ filter: /.*/, namespace: "list-drifts" }, () => ({
        contents: `import createList from ${JSON.stringify(resolve(repoRoot, "src/components/list/list.ts"))};
window.createList = createList;`,
        loader: "ts",
      }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2 4 20h16z"/></svg>';

const mount = () => {
  const createList = (window as unknown as {
    createList: (config: object) => { element: HTMLElement };
  }).createList;
  const icon = { type: "icon" as const, content: (window as unknown as { ICON: string }).ICON };
  const row = (id: string, extra: object) => ({ id, headline: id, leading: icon, trailing: icon, ...extra });
  document.body.style.cssText = "margin:0;padding:16px";
  const standard = createList({
    ariaLabel: "Standard",
    items: [
      row("selected", { selected: true }),
      row("one", {}),
      row("two", { supportingText: "Second line" }),
      row("three", { overline: "Over", supportingText: "Third line" }),
      row("box", { leading: { type: "control", content: '<input type="checkbox" aria-label="Pick">' } }),
      row("sw", { trailing: { type: "control", content: '<span role="switch" aria-checked="false" aria-label="Alert" style="display:inline-block;width:52px;height:32px"></span>' } }),
    ],
  });
  const segmented = createList({
    ariaLabel: "Segmented",
    variant: "segmented",
    items: [row("seg", {})],
  });
  const dense = createList({
    ariaLabel: "Dense",
    items: [row("dense", {})],
  });
  standard.element.id = "standard";
  segmented.element.id = "segmented";
  dense.element.id = "dense";
  dense.element.style.setProperty("--mtrl-density", "-2");
  document.body.append(standard.element, segmented.element, dense.element);
};

const snapshot = (page: Page) => page.evaluate(() => {
  const token = (name: string) => {
    const probe = document.createElement("span");
    probe.style.color = `var(--mtrl-sys-color-${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  };
  const roles: Record<string, string> = {
    OnSurface: token("on-surface"),
    OnSecondaryContainer: token("on-secondary-container"),
    OnSurfaceVariant: token("on-surface-variant"),
  };
  const roleOf = (color: string) => Object.entries(roles).find(([, value]) => value === color)?.[0] ?? color;
  const item = (root: string, id: string) => document.querySelector(`#${root} [data-id="${id}"]`) as HTMLElement;
  const gapOf = (row: HTMLElement) => {
    const leading = row.querySelector(".mtrl-list__leading") as HTMLElement;
    const text = row.querySelector(".mtrl-list__text") as HTMLElement;
    const a = leading.getBoundingClientRect();
    const b = text.getBoundingClientRect();
    const gap = a.right <= b.left + 0.5 ? b.left - a.right : a.left - b.right;
    return Math.round(gap);
  };
  const heightOf = (row: HTMLElement) => Math.round(row.getBoundingClientRect().height);
  const widthOf = (el: Element) => Math.round(el.getBoundingClientRect().width);
  const selected = item("standard", "selected");
  const seg = item("segmented", "seg");
  const paint = (row: HTMLElement, part: string) => roleOf(getComputedStyle(row.querySelector(`.mtrl-list__${part}`) as HTMLElement).color);
  return {
    gap: gapOf(item("standard", "one")),
    gapTwo: gapOf(item("standard", "two")),
    gapThree: gapOf(item("standard", "three")),
    gapBox: gapOf(item("standard", "box")),
    gapSwitch: gapOf(item("standard", "sw")),
    gapDense: gapOf(item("dense", "dense")),
    heightOne: heightOf(item("standard", "one")),
    heightTwo: heightOf(item("standard", "two")),
    heightThree: heightOf(item("standard", "three")),
    heightBox: heightOf(item("standard", "box")),
    heightDense: heightOf(item("dense", "dense")),
    paddingThree: Math.round(parseFloat(getComputedStyle(item("standard", "three")).paddingTop)),
    leadingStandard: widthOf(item("standard", "one").querySelector(".mtrl-list__leading > *") as Element),
    leadingSegmented: widthOf(seg.querySelector(".mtrl-list__leading > *") as Element),
    trailingSegmented: widthOf(seg.querySelector(".mtrl-list__trailing") as Element),
    leadingSegmentedRole: paint(seg, "leading"),
    trailingSegmentedRole: paint(seg, "trailing"),
    selectedLeading: paint(selected, "leading"),
    selectedTrailing: paint(selected, "trailing"),
  };
});

const run = async (page: Page, engine: string) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline" data-theme-mode="light"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: `${js}\nwindow.ICON = ${JSON.stringify(ICON)};` });
  await page.evaluate(mount);
  const rest = await snapshot(page);
  assert.equal(rest.gap, 12, `${engine}: list/item-content-gap/standard/rest`);
  assert.equal(rest.leadingSegmented, 20, `${engine}: list/leading-icon-size/segmented/rest`);
  assert.equal(rest.trailingSegmented, 20, `${engine}: list/trailing-icon-size/segmented/rest`);
  assert.equal(rest.trailingSegmentedRole, "OnSurface", `${engine}: list/trailing-icon-colour/segmented/rest`);
  assert.equal(rest.selectedLeading, "OnSecondaryContainer", `${engine}: selected rest leading stays OnSecondaryContainer`);
  assert.equal(rest.selectedTrailing, "OnSecondaryContainer", `${engine}: selected rest trailing stays OnSecondaryContainer`);
  assert.equal(rest.leadingStandard, 24, `${engine}: a standard icon stays 24`);
  assert.equal(rest.leadingSegmentedRole, "OnSurfaceVariant", `${engine}: a segmented leading icon stays OnSurfaceVariant`);
  assert.deepEqual(
    {
      gapTwo: rest.gapTwo, gapThree: rest.gapThree, gapBox: rest.gapBox, gapSwitch: rest.gapSwitch, gapDense: rest.gapDense,
      heightOne: rest.heightOne, heightTwo: rest.heightTwo, heightThree: rest.heightThree, heightBox: rest.heightBox,
      heightDense: rest.heightDense, paddingThree: rest.paddingThree,
    },
    {
      gapTwo: 12, gapThree: 12, gapBox: 12, gapSwitch: 12, gapDense: 12,
      heightOne: 56, heightTwo: 72, heightThree: 88, heightBox: 56,
      heightDense: 48, paddingThree: 12,
    },
    `${engine}: the gap change moved a row that should only close 4px between its slots`,
  );

  // A click toggles selection, so hover, press and focus each start from a
  // new list. Focus arrives by Tab only: the selected row is the first
  // button, and a click would both select with the pointer and clear the
  // selected class on mouseup.
  const selected = "#standard [data-id='selected']";
  const action = `${selected} .mtrl-list__action`;
  const remount = async () => {
    await page.evaluate(() => { document.body.replaceChildren(); });
    await page.evaluate(mount);
  };
  const stillSelected = () => page.evaluate((selector) => {
    const row = document.querySelector(selector);
    return !!row?.classList.contains("mtrl-list__item--selected");
  }, selected);

  await remount();
  await page.hover(action);
  assert.equal(await stillSelected(), true, `${engine}: hover read a row that was no longer selected`);
  const hovered = await snapshot(page);
  assert.equal(hovered.selectedLeading, "OnSurface", `${engine}: list/leading-icon-colour/standard/selected-hover`);
  assert.equal(hovered.selectedTrailing, "OnSurface", `${engine}: list/trailing-icon-colour/standard/selected-hover`);

  await remount();
  await page.hover(action);
  await page.mouse.down();
  assert.equal(await stillSelected(), true, `${engine}: press read a row that was no longer selected`);
  const pressed = await snapshot(page);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  assert.equal(pressed.selectedLeading, "OnSurface", `${engine}: list/leading-icon-colour/standard/selected-pressed`);
  assert.equal(pressed.selectedTrailing, "OnSurface", `${engine}: list/trailing-icon-colour/standard/selected-pressed`);

  await remount();
  const webkitEngine = engine === "webkit";
  let focusedOn = false;
  for (let attempt = 0; attempt < 8 && !focusedOn; attempt++) {
    await page.keyboard.press(webkitEngine && attempt >= 4 ? "Alt+Tab" : "Tab");
    focusedOn = await page.evaluate((selector) => !!document.querySelector(selector)?.matches(":focus-visible"), action);
  }
  assert.equal(focusedOn, true, `${engine}: the selected row did not take keyboard focus`);
  assert.equal(await stillSelected(), true, `${engine}: focus read a row that was no longer selected`);
  const focused = await snapshot(page);
  assert.equal(focused.selectedLeading, "OnSurface", `${engine}: list/leading-icon-colour/standard/selected-focus`);
  assert.equal(focused.selectedTrailing, "OnSurface", `${engine}: list/trailing-icon-colour/standard/selected-focus`);
  assert.deepEqual(errors, [], `${engine}: ${errors.join("\n")}`);
  console.log(`${engine}: gap 12, segmented icons 20, selected interaction icons OnSurface, segmented trailing OnSurface`);
};

const pageOptions = { viewport: { width: 800, height: 900 }, reducedMotion: "no-preference" as const };

const chromiumContext = await launchChromium({ headless: true, ...pageOptions });
try {
  const page = await chromiumContext.newPage();
  await run(page, "chromium");
  await page.close();
} finally {
  await chromiumContext.close();
}

const webkitBrowser: Browser = await webkit.launch({ headless: true });
const webkitContext = await webkitBrowser.newContext(pageOptions);
try {
  const page = await webkitContext.newPage();
  await run(page, "webkit");
  await page.close();
} finally {
  await webkitBrowser.close();
}

console.log("List drifts match the list specs.");
