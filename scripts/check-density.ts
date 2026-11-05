#!/usr/bin/env bun
// scripts/check-density.ts
//
// The density scale in Chromium, on the shipped dist stylesheet. A container
// sets the integer custom property `--mtrl-density` (0 down to -5): every
// component the scale reaches moves 4px a step — 2px for a round radius — down
// to its own floor; type and icons never move; a control the scale takes under
// 48px keeps a 48px touch target; the surfaces that never densify hold their
// geometry under a page-wide value; the old options land on the step they name;
// and the property itself is optional, typed and overridable.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import type createButton from "../src/components/button";
import type createButtonGroup from "../src/components/button-group";
import type createDatePicker from "../src/components/datepicker";
import type createDialog from "../src/components/dialog";
import type createDrawer from "../src/components/drawer";
import type createIconButton from "../src/components/icon-button";
import type createList from "../src/components/list";
import type createMenu from "../src/components/menu";
import type createSelect from "../src/components/select";
import type createSnackbar from "../src/components/snackbar";
import type createTextField from "../src/components/text-field";

assert(existsSync("dist/styles.css"), "dist/styles.css is missing: the build emits no full sheet");
const css = readFileSync("dist/styles.css", "utf8");

const names = [
  "button",
  "icon-button",
  "button-group",
  "list",
  "drawer",
  "text-field",
  "select",
  "menu",
  "dialog",
  "snackbar",
  "datepicker",
];
for (const name of names) {
  assert(existsSync(`dist/components/${name}/index.js`), `dist/components/${name}/index.js is missing: the build emits no such factory`);
}

// The built factories, so the check reads the shipped package.
const entry = names
  .map(name => `import f_${name.replace(/-/g, "_")} from ${JSON.stringify(resolve(`dist/components/${name}/index.js`))};`)
  .join("\n") +
  `\nObject.assign(window, { ${[
    `createButton: f_button`,
    `createIconButton: f_icon_button`,
    `createButtonGroup: f_button_group`,
    `createList: f_list`,
    `createDrawer: f_drawer`,
    `createTextField: f_text_field`,
    `createSelect: f_select`,
    `createMenu: f_menu`,
    `createDialog: f_dialog`,
    `createSnackbar: f_snackbar`,
    `createDatePicker: f_datepicker`,
  ].join(", ")} });\n`;
const directory = await mkdtemp(join(tmpdir(), "mtrl-density-"));
const entryFile = join(directory, "entry.js");
await writeFile(entryFile, entry);
const bundle = await Bun.build({ entrypoints: [entryFile], target: "browser", format: "iife" });
assert(bundle.success, String(bundle.logs));

type Control = { width: number; height: number; radius: number; type: string };
type Sample = {
  buttonM: Control;
  buttonS: Control;
  buttonXs: Control;
  iconS: Control & { icon: number };
  iconXsNarrow: Control;
  group: { height: number; childHeight: number; childRadius: number };
  listRow: { height: number; paddingTop: number; type: string };
  drawerItem: { height: number; type: string };
  field: { height: number; input: number; type: string };
  select: { input: number };
};
type Excluded = { menuItem: number; dialogAction: number; snackbarAction: number; dayCell: number };
type Result = {
  steps: Record<string, Sample>;
  aliases: {
    fieldCompact: { input: number; type: string };
    selectCompact: number;
    groupComfortable: number;
    groupCompact: number;
    drawerDense: number;
  };
  robustness: { absent: number; invalid: number; localOverride: number; sugar3: number; sugar5: number };
  excluded: { baseline: Excluded; dense: Excluded };
  touch: {
    button: { height: number; top: boolean; bottom: boolean };
    icon: { width: number; height: number; corners: boolean };
    list: { height: number; top: boolean; bottom: boolean };
    drawer: { height: number; top: boolean; bottom: boolean };
    group: { height: number; corners: boolean; gapHitsButton: boolean };
  };
};

type DensityWindow = Window & {
  createButton: typeof createButton;
  createIconButton: typeof createIconButton;
  createButtonGroup: typeof createButtonGroup;
  createList: typeof createList;
  createDrawer: typeof createDrawer;
  createTextField: typeof createTextField;
  createSelect: typeof createSelect;
  createMenu: typeof createMenu;
  createDialog: typeof createDialog;
  createSnackbar: typeof createSnackbar;
  createDatePicker: typeof createDatePicker;
};

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h24v24H0z"/></svg>';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, reducedMotion: "reduce" });
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: await bundle.outputs[0].text() });

  const result = await page.evaluate(async (icon: string): Promise<Result> => {
    const w = window as unknown as DensityWindow;

    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    };
    // A computed custom-property-driven length is a px value.
    const radius = (element: Element) => Math.round(parseFloat(getComputedStyle(element).borderTopLeftRadius));
    const typeOf = (element: Element) => {
      const style = getComputedStyle(element);
      return `${style.fontSize} / ${style.lineHeight} / ${style.fontFamily}`;
    };
    const must = <T extends Element>(root: ParentNode, selector: string, what: string): T => {
      const found = root.querySelector<T>(selector);
      if (!found) throw new Error(`the check found no ${what} (${selector})`);
      return found;
    };
    const settle = () => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const hits = (element: Element, x: number, y: number): boolean => {
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === element || element.contains(hit));
    };

    // A fresh page for every measurement: no surface left open, no property
    // left set.
    const clear = () => {
      document.querySelectorAll("dialog[open]").forEach(dialog => (dialog as HTMLDialogElement).close());
      document.body.replaceChildren();
      document.documentElement.removeAttribute("style");
    };
    const host = (density: number | string | null): HTMLElement => {
      const element = document.createElement("div");
      element.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;gap:8px;width:700px;padding:8px";
      if (density !== null) element.style.setProperty("--mtrl-density", String(density));
      document.body.append(element);
      return element;
    };

    // Everything the scale reaches: button s and the two floors (m moves the
    // whole range, xs starts on it), icon button s, the narrow xs width that a
    // target never widens, the button group's derived height and radius, the
    // list row, the drawer item, the text field and the select built on it.
    const sample = (parent: HTMLElement): Sample => {
      const button = (size: "xs" | "s" | "m") => {
        const component = w.createButton({ text: "Save", size });
        parent.append(component.element);
        return component.element;
      };
      const buttonM = button("m");
      const buttonS = button("s");
      const buttonXs = button("xs");

      const iconButton = (size: "s" | "xs", width?: "narrow") => {
        const component = w.createIconButton({ icon, ariaLabel: "Add", size, width });
        parent.append(component.element);
        const measure = box(component.element);
        return {
          width: measure.width,
          height: measure.height,
          radius: radius(component.element),
          type: typeOf(component.element),
          icon: box(must(component.element, ".mtrl-icon-button__icon", "icon button icon")).width,
        };
      };
      const iconS = iconButton("s");
      const iconXsNarrow = iconButton("xs", "narrow");

      const groupComponent = w.createButtonGroup({
        kind: "standard",
        size: "s",
        buttons: [{ text: "One" }, { text: "Two" }],
      });
      parent.append(groupComponent.element);
      const groupChild = must<HTMLElement>(groupComponent.element, ".mtrl-button", "button group child");

      const listComponent = w.createList({ items: [{ id: "a", headline: "Alpha" }] });
      parent.append(listComponent.element);
      const listRow = must<HTMLElement>(listComponent.element, ".mtrl-list__item", "list row");
      const listHeadline = must<HTMLElement>(listRow, ".mtrl-list__headline", "list headline");

      const drawerComponent = w.createDrawer({ open: true, items: [{ id: "a", label: "Alpha", icon }] });
      parent.append(drawerComponent.element);
      const drawerItem = must<HTMLElement>(drawerComponent.element, ".mtrl-drawer__item", "drawer item");
      const drawerLabel = must<HTMLElement>(drawerItem, ".mtrl-drawer__item-label", "drawer item label");

      const fieldComponent = w.createTextField({ label: "Name", value: "Ada" });
      parent.append(fieldComponent.element);
      const fieldInput = must<HTMLInputElement>(fieldComponent.element, ".mtrl-text-field__input", "text field input");

      const selectComponent = w.createSelect({ label: "Fruit", options: [{ id: "apple", text: "Apple" }] });
      parent.append(selectComponent.element);
      const selectInput = must<HTMLInputElement>(selectComponent.element, ".mtrl-text-field__input", "select input");

      const control = (element: Element): Control => ({
        width: box(element).width,
        height: box(element).height,
        radius: radius(element),
        type: typeOf(element),
      });

      return {
        buttonM: control(buttonM),
        buttonS: control(buttonS),
        buttonXs: control(buttonXs),
        iconS,
        iconXsNarrow: {
          width: iconXsNarrow.width,
          height: iconXsNarrow.height,
          radius: iconXsNarrow.radius,
          type: iconXsNarrow.type,
        },
        group: {
          height: box(groupComponent.element).height,
          childHeight: box(groupChild).height,
          childRadius: radius(groupChild),
        },
        listRow: {
          height: box(listRow).height,
          paddingTop: Math.round(parseFloat(getComputedStyle(listRow).paddingTop)),
          type: typeOf(listHeadline),
        },
        drawerItem: { height: box(drawerItem).height, type: typeOf(drawerLabel) },
        field: { height: box(fieldComponent.element).height, input: box(fieldInput).height, type: typeOf(fieldInput) },
        select: { input: box(selectInput).height },
      };
    };

    // The steps, the sugar classes and the property's own edge cases.
    const steps: Record<string, Sample> = {};
    for (const step of [0, -1, -2, -3, -4, -5]) {
      clear();
      steps[String(step)] = sample(host(step));
    }

    clear();
    const aliasesHost = host(null);
    const compactField = w.createTextField({ label: "Name", value: "Ada", density: "compact" });
    aliasesHost.append(compactField.element);
    const compactInput = must<HTMLInputElement>(compactField.element, ".mtrl-text-field__input", "compact text field input");
    const compactSelect = w.createSelect({ label: "Fruit", density: "compact", options: [{ id: "apple", text: "Apple" }] });
    aliasesHost.append(compactSelect.element);
    const comfortableGroup = w.createButtonGroup({ size: "s", density: "comfortable", buttons: [{ text: "One" }] });
    aliasesHost.append(comfortableGroup.element);
    const compactGroup = w.createButtonGroup({ size: "s", density: "compact", buttons: [{ text: "One" }] });
    aliasesHost.append(compactGroup.element);
    const denseDrawer = w.createDrawer({ open: true, dense: true, items: [{ id: "a", label: "Alpha" }] });
    aliasesHost.append(denseDrawer.element);
    const aliases = {
      fieldCompact: { input: box(compactInput).height, type: typeOf(compactInput) },
      selectCompact: box(must<HTMLInputElement>(compactSelect.element, ".mtrl-text-field__input", "compact select input")).height,
      groupComfortable: box(comfortableGroup.element).height,
      groupCompact: box(compactGroup.element).height,
      drawerDense: box(must<HTMLElement>(denseDrawer.element, ".mtrl-drawer__item", "dense drawer item")).height,
    };

    clear();
    const absent = w.createButton({ text: "Save", size: "m" });
    host(null).append(absent.element);
    const invalidHost = host("12px");
    const invalid = w.createButton({ text: "Save", size: "m" });
    invalidHost.append(invalid.element);
    const overrideHost = host(-3);
    const override = w.createButton({ text: "Save", size: "m" });
    override.element.style.setProperty("--mtrl-density", "-1");
    overrideHost.append(override.element);
    const sugar3Host = document.createElement("div");
    sugar3Host.className = "mtrl-density--3";
    document.body.append(sugar3Host);
    const sugar3 = w.createButton({ text: "Save", size: "m" });
    sugar3Host.append(sugar3.element);
    const sugar5Host = document.createElement("div");
    sugar5Host.className = "mtrl-density--5";
    document.body.append(sugar5Host);
    const sugar5 = w.createButton({ text: "Save", size: "m" });
    sugar5Host.append(sugar5.element);
    const robustness = {
      absent: box(absent.element).height,
      invalid: box(invalid.element).height,
      localOverride: box(override.element).height,
      sugar3: box(sugar3.element).height,
      sugar5: box(sugar5.element).height,
    };

    // The surfaces that never densify: a page-wide value reaches their root,
    // which pins the scale at 0 for everything inside.
    const excludedMeasure = async (): Promise<Excluded> => {
      const opener = document.createElement("button");
      opener.textContent = "Open";
      document.body.append(opener);
      const menu = w.createMenu({ opener, visible: true, items: [{ id: "a", text: "Alpha" }] });
      document.body.append(menu.element);
      const dialog = w.createDialog({ title: "Title", animationDuration: 0, buttons: [{ text: "OK" }] });
      document.body.append(dialog.element);
      dialog.open();
      const snackbar = w.createSnackbar({ message: "Saved", action: "Undo", duration: 0 });
      snackbar.show();
      const picker = w.createDatePicker({ variant: "modal", label: "Date", value: "2024-01-15" });
      document.body.append(picker.element);
      picker.open();
      await settle();
      const action = snackbar.actionButton;
      if (!action) throw new Error("the snackbar has no action button");
      return {
        menuItem: box(must<HTMLElement>(menu.element, ".mtrl-menu__item", "menu item")).height,
        dialogAction: box(must<HTMLElement>(dialog.element, ".mtrl-dialog__footer .mtrl-button", "dialog action")).height,
        snackbarAction: box(action).height,
        dayCell: box(must<HTMLElement>(document, ".mtrl-datepicker__day", "date picker day")).height,
      };
    };
    clear();
    const baselineExcluded = await excludedMeasure();
    clear();
    document.documentElement.style.setProperty("--mtrl-density", "-3");
    const denseExcluded = await excludedMeasure();
    clear();

    // Touch targets, at a step that takes each control under 48px.
    const touch = async () => {
      clear();
      const buttonHost = host(-2);
      const button = w.createButton({ text: "Save", size: "s" });
      buttonHost.append(button.element);
      const buttonRect = button.element.getBoundingClientRect();
      const buttonX = buttonRect.left + buttonRect.width / 2;
      const buttonY = buttonRect.top + buttonRect.height / 2;
      const buttonTouch = {
        height: Math.round(buttonRect.height),
        top: hits(button.element, buttonX, buttonY - 23),
        bottom: hits(button.element, buttonX, buttonY + 23),
      };

      clear();
      const iconHost = host(-2);
      const iconButton = w.createIconButton({ icon, ariaLabel: "Add", size: "s" });
      iconHost.append(iconButton.element);
      const iconRect = iconButton.element.getBoundingClientRect();
      const iconX = iconRect.left + iconRect.width / 2;
      const iconY = iconRect.top + iconRect.height / 2;
      const iconTouch = {
        width: Math.round(iconRect.width),
        height: Math.round(iconRect.height),
        corners:
          hits(iconButton.element, iconX - 23, iconY - 23) &&
          hits(iconButton.element, iconX + 23, iconY - 23) &&
          hits(iconButton.element, iconX - 23, iconY + 23) &&
          hits(iconButton.element, iconX + 23, iconY + 23),
      };

      clear();
      const listHost = host(-5);
      const list = w.createList({ items: [{ id: "a", headline: "Alpha" }] });
      listHost.append(list.element);
      const row = must<HTMLElement>(list.element, ".mtrl-list__item", "list row");
      const rowRect = row.getBoundingClientRect();
      const rowX = rowRect.left + rowRect.width / 2;
      const rowY = rowRect.top + rowRect.height / 2;
      const listTouch = {
        height: Math.round(rowRect.height),
        top: hits(row, rowX, rowY - 23),
        bottom: hits(row, rowX, rowY + 23),
      };

      clear();
      const drawerHost = host(-5);
      const drawer = w.createDrawer({ open: true, items: [{ id: "a", label: "Alpha" }] });
      drawerHost.append(drawer.element);
      await settle();
      const item = must<HTMLElement>(drawer.element, ".mtrl-drawer__item", "drawer item");
      const itemRect = item.getBoundingClientRect();
      const itemX = itemRect.left + itemRect.width / 2;
      const itemY = itemRect.top + itemRect.height / 2;
      const drawerTouch = {
        height: Math.round(itemRect.height),
        top: hits(item, itemX, itemY - 23),
        bottom: hits(item, itemX, itemY + 23),
      };

      // A connected group of icon buttons: the target reaches above and below
      // each button, never sideways into the 2px between neighbours.
      clear();
      const groupHost = host(-2);
      const group = w.createButtonGroup({
        kind: "connected",
        selection: "single",
        size: "s",
        buttons: [
          { value: "one", icon, ariaLabel: "One" },
          { value: "two", icon, ariaLabel: "Two" },
        ],
      });
      groupHost.append(group.element);
      const first = group.buttons[0].element;
      const second = group.buttons[1].element;
      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      const groupX = firstRect.left + firstRect.width / 2;
      const groupY = firstRect.top + firstRect.height / 2;
      const gapX = (firstRect.right + secondRect.left) / 2;
      const groupTouch = {
        height: Math.round(firstRect.height),
        corners: hits(first, groupX, groupY - 23) && hits(first, groupX, groupY + 23),
        gapHitsButton: hits(first, gapX, groupY) || hits(second, gapX, groupY),
      };

      clear();
      return { button: buttonTouch, icon: iconTouch, list: listTouch, drawer: drawerTouch, group: groupTouch };
    };
    const touchResult = await touch();

    return { steps, aliases, robustness, excluded: { baseline: baselineExcluded, dense: denseExcluded }, touch: touchResult };
  }, ICON);

  const failures: string[] = [];
  const expect = (actual: unknown, wanted: unknown, label: string) => {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(wanted);
    if (a !== b) failures.push(`${label}: ${a} (want ${b})`);
  };
  const steps = result.steps;
  const order = ["0", "-1", "-2", "-3", "-4", "-5"];
  expect(Object.keys(steps).sort(), [...order].sort(), "the steps measured");

  // Geometry: 4px a step from the size's own base, floored at the 32px visual
  // target; a round radius moves 2px a step to its 16px floor.
  const geometry: [string, (sample: Sample) => number, number[]][] = [
    ["button m height", sample => sample.buttonM.height, [56, 52, 48, 44, 40, 36]],
    ["button m radius", sample => sample.buttonM.radius, [28, 26, 24, 22, 20, 18]],
    ["button s height", sample => sample.buttonS.height, [40, 36, 32, 32, 32, 32]],
    ["button s radius", sample => sample.buttonS.radius, [20, 18, 16, 16, 16, 16]],
    ["button xs height", sample => sample.buttonXs.height, [32, 32, 32, 32, 32, 32]],
    ["icon button s width", sample => sample.iconS.width, [40, 36, 32, 32, 32, 32]],
    ["icon button s height", sample => sample.iconS.height, [40, 36, 32, 32, 32, 32]],
    ["icon button s radius", sample => sample.iconS.radius, [20, 18, 16, 16, 16, 16]],
    ["icon button s icon size", sample => sample.iconS.icon, [24, 24, 24, 24, 24, 24]],
    ["icon button xs narrow width", sample => sample.iconXsNarrow.width, [28, 28, 28, 28, 28, 28]],
    ["button group height", sample => sample.group.height, [40, 36, 32, 32, 32, 32]],
    ["button group child height", sample => sample.group.childHeight, [40, 36, 32, 32, 32, 32]],
    ["button group child radius", sample => sample.group.childRadius, [20, 18, 16, 16, 16, 16]],
    ["list row height", sample => sample.listRow.height, [56, 52, 48, 44, 40, 36]],
    ["list row padding-top", sample => sample.listRow.paddingTop, [8, 6, 4, 2, 0, 0]],
    ["drawer item height", sample => sample.drawerItem.height, [56, 52, 48, 44, 40, 36]],
    ["text field input height", sample => sample.field.input, [56, 52, 48, 44, 40, 40]],
    ["select input height", sample => sample.select.input, [56, 52, 48, 44, 40, 40]],
  ];
  for (const [label, pick, wanted] of geometry) {
    const values = order.map(step => pick(steps[step] as Sample));
    values.forEach((value, index) => expect(value, wanted[index], `${label} at density ${order[index]}`));
  }

  // Type never moves: the same computed type at every step as at 0.
  const fonts: [string, (sample: Sample) => string][] = [
    ["button m type", sample => sample.buttonM.type],
    ["button s type", sample => sample.buttonS.type],
    ["icon button s type", sample => sample.iconS.type],
    ["list headline type", sample => sample.listRow.type],
    ["drawer item label type", sample => sample.drawerItem.type],
    ["text field input type", sample => sample.field.type],
  ];
  for (const [label, pick] of fonts) {
    for (const step of order.slice(1)) expect(pick(steps[step] as Sample), pick(steps["0"] as Sample), `${label} at density ${step}`);
  }

  // The old options are aliases of a step, not a second set of rules: the
  // compact field keeps Body Large, so only its height moves.
  expect(result.aliases.fieldCompact.input, 40, "text field compact input height");
  expect(result.aliases.fieldCompact.type, (steps["-4"] as Sample).field.type, "text field compact type");
  expect(result.aliases.selectCompact, 40, "select compact input height");
  expect(result.aliases.groupComfortable, 36, "button group comfortable height");
  expect(result.aliases.groupCompact, 32, "button group compact height");
  expect(result.aliases.drawerDense, 36, "drawer dense item height");

  // The property: absent reads 0, an invalid value falls back to the
  // registered initial value, a local declaration beats an ancestor's, and the
  // sugar classes carry the same steps.
  expect(result.robustness.absent, 56, "button m with no property");
  expect(result.robustness.invalid, 56, "button m under an invalid value");
  expect(result.robustness.localOverride, 52, "button m overriding its dense container");
  expect(result.robustness.sugar3, 44, "button m under .mtrl-density--3");
  expect(result.robustness.sugar5, 36, "button m under .mtrl-density--5");

  // A menu, a dialog, a snackbar and a picker never densify, however dense the
  // page around them is.
  expect(result.excluded.baseline, { menuItem: 48, dialogAction: 40, snackbarAction: 40, dayCell: 48 }, "excluded surfaces at density 0");
  expect(result.excluded.dense, result.excluded.baseline, "excluded surfaces under a page-wide -3");

  // Every control taken under 48px keeps a 48px tall target (an icon button
  // both ways), and a connected group never borrows its neighbour's.
  expect(result.touch.button.height, 32, "the button measured at 32px");
  expect(result.touch.button.top, true, "a 48px target above a 32px button");
  expect(result.touch.button.bottom, true, "a 48px target below a 32px button");
  expect(result.touch.icon.width, 32, "the icon button measured at 32px");
  expect(result.touch.icon.corners, true, "the 48px box's corners on a 32px icon button");
  expect(result.touch.list.height, 36, "the list row measured at 36px");
  expect(result.touch.list.top, true, "a 48px target above a 36px list row");
  expect(result.touch.list.bottom, true, "a 48px target below a 36px list row");
  expect(result.touch.drawer.height, 36, "the drawer item measured at 36px");
  expect(result.touch.drawer.top, true, "a 48px target above a 36px drawer item");
  expect(result.touch.drawer.bottom, true, "a 48px target below a 36px drawer item");
  expect(result.touch.group.height, 32, "the grouped icon button measured at 32px");
  expect(result.touch.group.corners, true, "the 48px box's vertical corners on a grouped icon button");
  expect(result.touch.group.gapHitsButton, false, "no target reaching into the group's 2px gap");

  assert.deepEqual(failures, [], `the density scale is not what the page measures:\n${failures.join("\n")}`);
  console.log(
    "density: buttons and icon buttons 4px a step (radius 2px) to 32px, button group derived at half the height, " +
    "list and drawer rows to 36px, fields to 40px; type and icons fixed; 48px targets kept; " +
    "menus, dialogs, snackbars and pickers unchanged under a page-wide -3",
  );
} finally {
  await browser.close();
}
