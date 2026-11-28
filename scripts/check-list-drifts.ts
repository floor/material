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
 *
 * The row's selected and disabled colours also reached a standard list nested
 * in the row: its unselected icons read on-secondary-container inside a
 * selected row and on-surface at 0.38 opacity inside a disabled one, where the
 * nested list's own unselected colour is on-surface-variant at full opacity.
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
import { withSingleSelectListbox } from ${JSON.stringify(resolve(repoRoot, "src/components/list/index.ts"))};
window.createList = createList;
window.withSingleSelectListbox = withSingleSelectListbox;`,
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
  const withSingleSelectListbox = (window as unknown as {
    withSingleSelectListbox: <T>(list: T, options?: { indicator?: "leading" | "trailing" }) => T;
  }).withSingleSelectListbox;
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
  const nested = createList({
    ariaLabel: "Nested standard",
    items: [row("nested", {})],
  });
  const outer = createList({
    ariaLabel: "Outer segmented",
    variant: "segmented",
    items: [row("outer", {})],
  });
  nested.element.id = "nested";
  outer.element.id = "outer";
  const host = outer.element.querySelector("[data-id='outer']");
  if (host) host.append(nested.element);
  const inside = createList({
    ariaLabel: "Inside selected",
    items: [row("inside", { supportingText: "Nested second line" })],
  });
  const held = createList({
    ariaLabel: "Selected with a nested list",
    items: [row("held", { selected: true })],
  });
  inside.element.id = "inside";
  held.element.id = "held";
  const heldRow = held.element.querySelector("[data-id='held']");
  if (heldRow) heldRow.append(inside.element);
  // A listbox nested in the same selected row: its radio is the one the
  // selected row's radio rule must not reach.
  const chooser = withSingleSelectListbox(createList({
    ariaLabel: "Nested listbox",
    items: [{ id: "pick", headline: "Pick", leading: icon }],
  }), { indicator: "trailing" });
  chooser.element.id = "chooser";
  if (heldRow) heldRow.append(chooser.element);
  const frozen = createList({
    ariaLabel: "Disabled with a nested list",
    items: [row("frozen", { disabled: true })],
  });
  const chill = createList({
    ariaLabel: "Inside disabled",
    items: [row("chill", { supportingText: "Nested second line" })],
  });
  chill.element.id = "chill";
  frozen.element.id = "frozen";
  const frozenRow = frozen.element.querySelector("[data-id='frozen']");
  if (frozenRow) frozenRow.append(chill.element);
  document.body.append(standard.element, segmented.element, dense.element, outer.element, held.element, frozen.element);
  // Segmented rows share one 10dp top and bottom space whatever their lines,
  // and an unselected row takes the surface role (ListTokens ItemTopSpace,
  // ItemBottomSpace and ItemContainerColor; md.comp.list.list-item.*).
  const segLines = createList({
    ariaLabel: "Segmented lines",
    variant: "segmented",
    items: [
      { id: "one", headline: "One" },
      { id: "two", headline: "Two", supportingText: "Support" },
      { id: "three", headline: "Three", overline: "Over", supportingText: "Support" },
    ],
  });
  segLines.element.id = "seg-lines";
  document.body.append(segLines.element);
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
  const frozen = item("frozen", "frozen");
  const chill = item("chill", "chill");
  const paint = (row: HTMLElement, part: string) => roleOf(getComputedStyle(row.querySelector(`.mtrl-list__${part}`) as HTMLElement).color);
  const opacityOf = (row: HTMLElement, part: string) => getComputedStyle(row.querySelector(`.mtrl-list__${part}`) as HTMLElement).opacity;
  const textOf = (row: HTMLElement, line: string) => {
    const text = row.querySelector(".mtrl-list__text") as HTMLElement;
    return roleOf(getComputedStyle(text.querySelector(`.mtrl-list__${line}`) as HTMLElement).color);
  };
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
    leadingNested: widthOf(item("nested", "nested").querySelector(".mtrl-list__leading > *") as Element),
    trailingNested: widthOf(item("nested", "nested").querySelector(".mtrl-list__trailing") as Element),
    leadingOuter: widthOf(item("outer", "outer").querySelector(".mtrl-list__leading > *") as Element),
    trailingOuter: widthOf(item("outer", "outer").querySelector(".mtrl-list__trailing") as Element),
    selectedLeading: paint(selected, "leading"),
    selectedTrailing: paint(selected, "trailing"),
    heldLeading: paint(item("held", "held"), "leading"),
    heldTrailing: paint(item("held", "held"), "trailing"),
    insideLeading: paint(item("inside", "inside"), "leading"),
    insideTrailing: paint(item("inside", "inside"), "trailing"),
    frozenLeading: paint(frozen, "leading"),
    frozenTrailing: paint(frozen, "trailing"),
    frozenLeadingOpacity: opacityOf(frozen, "leading"),
    frozenTrailingOpacity: opacityOf(frozen, "trailing"),
    chillLeading: paint(chill, "leading"),
    chillTrailing: paint(chill, "trailing"),
    chillLeadingOpacity: opacityOf(chill, "leading"),
    chillTrailingOpacity: opacityOf(chill, "trailing"),
    heldHeadline: textOf(item("held", "held"), "headline"),
    insideHeadline: textOf(item("inside", "inside"), "headline"),
    insideSupporting: textOf(item("inside", "inside"), "supporting"),
    frozenTextOpacity: opacityOf(frozen, "text"),
    chillHeadline: textOf(chill, "headline"),
    chillSupporting: textOf(chill, "supporting"),
    chillTextOpacity: opacityOf(chill, "text"),
    segRowRole: roleOf(getComputedStyle(item("seg-lines", "one")).backgroundColor),
    segPadOne: Math.round(parseFloat(getComputedStyle(item("seg-lines", "one")).paddingTop)),
    segPadTwo: Math.round(parseFloat(getComputedStyle(item("seg-lines", "two")).paddingTop)),
    segPadThree: Math.round(parseFloat(getComputedStyle(item("seg-lines", "three")).paddingTop)),
    pickRadioBorder: roleOf(getComputedStyle(item("chooser", "pick").querySelector(".mtrl-list__radio") as HTMLElement).borderTopColor),
    pickRadioDot: getComputedStyle(item("chooser", "pick").querySelector(".mtrl-list__radio") as HTMLElement, "::after").transform,
    insideActionLayer: roleOf(getComputedStyle(item("inside", "inside").querySelector(".mtrl-list__action") as HTMLElement, "::before").backgroundColor),
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
  // A standard list nested in a selected or disabled row keeps its own
  // unselected icon colours and opacity: the row's state reaches its own
  // slots only, not a descendant list's (md.comp.list.list-item.selected and
  // .disabled .{leading,trailing}-icon.color; the factory nesting pattern.
  // Specs read 2026-11-27).
  assert.equal(rest.heldLeading, "OnSecondaryContainer", `${engine}: the selected row's own leading icon is OnSecondaryContainer at rest`);
  assert.equal(rest.heldTrailing, "OnSecondaryContainer", `${engine}: the selected row's own trailing icon is OnSecondaryContainer at rest`);
  assert.equal(rest.insideLeading, "OnSurfaceVariant", `${engine}: a standard list nested in a selected row keeps its unselected leading icon OnSurfaceVariant`);
  assert.equal(rest.insideTrailing, "OnSurfaceVariant", `${engine}: a standard list nested in a selected row keeps its unselected trailing icon OnSurfaceVariant`);
  assert.equal(rest.frozenLeading, "OnSurface", `${engine}: the disabled row's own leading icon is OnSurface`);
  assert.equal(rest.frozenTrailing, "OnSurface", `${engine}: the disabled row's own trailing icon is OnSurface`);
  assert.equal(rest.frozenLeadingOpacity, "0.38", `${engine}: the disabled row's own leading icon is at 0.38 opacity`);
  assert.equal(rest.frozenTrailingOpacity, "0.38", `${engine}: the disabled row's own trailing icon is at 0.38 opacity`);
  assert.equal(rest.chillLeading, "OnSurfaceVariant", `${engine}: a standard list nested in a disabled row keeps its unselected leading icon OnSurfaceVariant`);
  assert.equal(rest.chillTrailing, "OnSurfaceVariant", `${engine}: a standard list nested in a disabled row keeps its unselected trailing icon OnSurfaceVariant`);
  assert.equal(rest.chillLeadingOpacity, "1", `${engine}: a standard list nested in a disabled row keeps its leading icon at full opacity`);
  assert.equal(rest.chillTrailingOpacity, "1", `${engine}: a standard list nested in a disabled row keeps its trailing icon at full opacity`);
  assert.equal(rest.heldHeadline, "OnSecondaryContainer", `${engine}: the selected row's own headline is OnSecondaryContainer`);
  assert.equal(rest.insideHeadline, "OnSurface", `${engine}: a standard list nested in a selected row keeps its headline OnSurface`);
  assert.equal(rest.insideSupporting, "OnSurfaceVariant", `${engine}: a standard list nested in a selected row keeps its supporting text OnSurfaceVariant`);
  assert.equal(rest.frozenTextOpacity, "0.38", `${engine}: the disabled row's own text is at 0.38 opacity`);
  assert.equal(rest.chillHeadline, "OnSurface", `${engine}: a standard list nested in a disabled row keeps its headline OnSurface`);
  assert.equal(rest.chillSupporting, "OnSurfaceVariant", `${engine}: a standard list nested in a disabled row keeps its supporting text OnSurfaceVariant`);
  assert.equal(rest.chillTextOpacity, "1", `${engine}: a standard list nested in a disabled row keeps its text at full opacity`);
  assert.equal(rest.segRowRole, "Surface", `${engine}: an unselected segmented row takes the surface role`);
  assert.equal(rest.segPadOne, 10, `${engine}: a one-line segmented row has 10dp above`);
  assert.equal(rest.segPadTwo, 10, `${engine}: a two-line segmented row has 10dp above`);
  assert.equal(rest.segPadThree, 10, `${engine}: a three-line segmented row has 10dp above`);
  assert.equal(rest.pickRadioBorder, "OnSurfaceVariant", `${engine}: an unselected listbox radio nested in a selected row keeps the OnSurfaceVariant ring`);
  assert.equal(rest.pickRadioDot.startsWith("matrix(0,"), true, `${engine}: an unselected listbox radio nested in a selected row keeps its dot at scale 0 (${rest.pickRadioDot})`);
  // The inner action's layer is what its hover paints; the selected row's own
  // action layer colour must not reach it.
  assert.equal(rest.insideActionLayer, "OnSurface", `${engine}: a list nested in a selected row keeps its action layer OnSurface`);
  assert.equal(rest.leadingStandard, 24, `${engine}: a standard icon stays 24`);
  assert.equal(rest.leadingSegmentedRole, "OnSurfaceVariant", `${engine}: a segmented leading icon stays OnSurfaceVariant`);
  assert.equal(rest.leadingNested, 24, `${engine}: a standard list nested in a segmented list keeps a 24px leading icon`);
  assert.equal(rest.trailingNested, 24, `${engine}: a standard list nested in a segmented list keeps a 24px trailing icon`);
  assert.equal(rest.leadingOuter, 20, `${engine}: the segmented row's own leading icon stays 20`);
  assert.equal(rest.trailingOuter, 20, `${engine}: the segmented row's own trailing icon stays 20`);
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
  // The row holds nested lists after its content; hover the action's own
  // start, clear of them.
  await page.hover("#held [data-id='held'] .mtrl-list__action", { position: { x: 8, y: 8 } });
  assert.equal(
    await page.evaluate(() => document.querySelector("#held [data-id='held']")?.classList.contains("mtrl-list__item--selected") ?? false),
    true,
    `${engine}: the nested reading hovered a row that was no longer selected`,
  );
  const nestedHover = await snapshot(page);
  assert.equal(nestedHover.heldLeading, "OnSurface", `${engine}: the selected row's own leading icon is OnSurface while hovered`);
  assert.equal(nestedHover.heldTrailing, "OnSurface", `${engine}: the selected row's own trailing icon is OnSurface while hovered`);
  assert.equal(nestedHover.insideLeading, "OnSurfaceVariant", `${engine}: a nested unselected leading icon stays OnSurfaceVariant while its selected parent is hovered`);
  assert.equal(nestedHover.insideTrailing, "OnSurfaceVariant", `${engine}: a nested unselected trailing icon stays OnSurfaceVariant while its selected parent is hovered`);
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
