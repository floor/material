#!/usr/bin/env bun
// scripts/check-component-sheets.ts
//
// The five factory component sheets that used to rely on the base reset stand
// alone: with material/styles/base-lite plus utilities/ripple and no reset,
// they keep the full-base geometry. Chromium measures the shipped dist
// sheets: the text-field input (and the select that uses it) is 56px high,
// the small top app bar fits a 600px box, the bottom app bar is 80px, the
// checkbox and a radio label are 48px, and the date picker's month and year
// buttons keep no UA padding.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import type createBottomAppBar from "../src/components/bottom-app-bar";
import type createCheckbox from "../src/components/checkbox";
import type createDatePicker from "../src/components/datepicker";
import type createRadios from "../src/components/radios";
import type createSelect from "../src/components/select";
import type createTextField from "../src/components/text-field";
import type createTopAppBar from "../src/components/top-app-bar";

// base-lite, the ripple utilities, then each family's own selective sheet —
// and no base/reset, which is the point of the measure.
const sheets = [
  "styles/base-lite",
  "elements/css/ripple",
  "styles/text-field",
  "styles/select",
  "styles/top-app-bar",
  "styles/bottom-app-bar",
  "styles/checkbox",
  "styles/radios",
  "styles/datepicker",
];
for (const sheet of sheets) {
  assert(existsSync(`dist/${sheet}.css`), `dist/${sheet}.css is missing: the build emits no such sheet`);
}
const css = sheets.map(sheet => readFileSync(`dist/${sheet}.css`, "utf8")).join("\n");

// The built factories, so the check reads the shipped package.
const entry = `
import createTextField from ${JSON.stringify(resolve("dist/components/text-field/index.js"))};
import createSelect from ${JSON.stringify(resolve("dist/components/select/index.js"))};
import createTopAppBar from ${JSON.stringify(resolve("dist/components/top-app-bar/index.js"))};
import createBottomAppBar from ${JSON.stringify(resolve("dist/components/bottom-app-bar/index.js"))};
import createCheckbox from ${JSON.stringify(resolve("dist/components/checkbox/index.js"))};
import createRadios from ${JSON.stringify(resolve("dist/components/radios/index.js"))};
import createDatePicker from ${JSON.stringify(resolve("dist/components/datepicker/index.js"))};
Object.assign(window, { createTextField, createSelect, createTopAppBar, createBottomAppBar, createCheckbox, createRadios, createDatePicker });
`;
const directory = await mkdtemp(join(tmpdir(), "mtrl-component-sheets-"));
const entryFile = join(directory, "entry.js");
await writeFile(entryFile, entry);
const bundle = await Bun.build({ entrypoints: [entryFile], target: "browser", format: "iife" });
assert(bundle.success, String(bundle.logs));

type SidePadding = { top: string; right: string; bottom: string; left: string };
type Measure = {
  bodyBoxSizing: string;
  textField: number;
  textFieldInput: number;
  selectInput: number | null;
  topAppBar: number;
  topAppBarBox: number;
  bottomAppBar: number;
  checkbox: number;
  radioLabel: number;
  monthPadding: SidePadding;
  yearPadding: SidePadding;
};

type SheetWindow = Window & {
  createTextField: typeof createTextField;
  createSelect: typeof createSelect;
  createTopAppBar: typeof createTopAppBar;
  createBottomAppBar: typeof createBottomAppBar;
  createCheckbox: typeof createCheckbox;
  createRadios: typeof createRadios;
  createDatePicker: typeof createDatePicker;
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, reducedMotion: "reduce" });
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: await bundle.outputs[0].text() });

  const measure = await page.evaluate((): Measure => {
    const w = window as unknown as SheetWindow;
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };
    const padding = (element: Element): SidePadding => {
      const style = getComputedStyle(element);
      return { top: style.paddingTop, right: style.paddingRight, bottom: style.paddingBottom, left: style.paddingLeft };
    };
    document.documentElement.setAttribute("data-theme", "baseline");
    document.documentElement.setAttribute("data-theme-mode", "light");
    document.body.replaceChildren();
    const root = document.createElement("div");
    root.style.cssText = "display:flex;flex-direction:column;gap:16px;width:700px";
    document.body.append(root);

    const field = w.createTextField({ label: "Name", value: "Ada" });
    root.append(field.element);
    const select = w.createSelect({ label: "Fruit", options: [{ id: "apple", text: "Apple" }, { id: "pear", text: "Pear" }] });
    root.append(select.element);

    // Both bars are absolutely positioned edge to edge: a 600px relative box
    // is their containing block, so their width or height is theirs to keep.
    const topBox = document.createElement("div");
    topBox.style.cssText = "position:relative;width:600px;height:64px";
    const top = w.createTopAppBar({ type: "small", title: "Title" });
    topBox.append(top.element);
    root.append(topBox);
    const bottomBox = document.createElement("div");
    bottomBox.style.cssText = "position:relative;width:600px;height:80px";
    const bottom = w.createBottomAppBar({});
    bottomBox.append(bottom.element);
    root.append(bottomBox);

    const checkbox = w.createCheckbox({ label: "Agree" });
    root.append(checkbox.element);
    const radios = w.createRadios({ name: "choice", options: [{ value: "one", label: "One" }, { value: "two", label: "Two" }] });
    root.append(radios.element);

    const fieldInput = field.element.querySelector(".mtrl-text-field__input");
    const selectInput = select.element.querySelector(".mtrl-text-field__input");
    const radioLabel = radios.element.querySelector(".mtrl-radios__label");
    const textField = box(field.element).height;
    const textFieldInput = fieldInput ? box(fieldInput).height : -1;
    const selectInputHeight = selectInput ? box(selectInput).height : null;
    const topAppBar = box(top.element).width;
    const topAppBarBox = box(topBox).width;
    const bottomAppBar = box(bottom.element).height;
    const checkboxHeight = box(checkbox.element).height;
    const radioLabelHeight = radioLabel ? box(radioLabel).height : -1;

    // The date picker's header menus render only while it is open.
    const picker = w.createDatePicker({ variant: "modal", label: "Date", value: "2024-01-15" });
    document.body.append(picker.element);
    picker.open();
    picker.calendar.showMonthView();
    const month = document.querySelector(".mtrl-datepicker__month");
    if (!month) throw new Error("the date picker shows no month button");
    const monthPadding = padding(month);
    picker.calendar.showYearView();
    const year = document.querySelector(".mtrl-datepicker__year");
    if (!year) throw new Error("the date picker shows no year button");
    const yearPadding = padding(year);

    return {
      bodyBoxSizing: getComputedStyle(document.body).boxSizing,
      textField,
      textFieldInput,
      selectInput: selectInputHeight,
      topAppBar,
      topAppBarBox,
      bottomAppBar,
      checkbox: checkboxHeight,
      radioLabel: radioLabelHeight,
      monthPadding,
      yearPadding,
    };
  });

  const failures: string[] = [];
  const expect = (actual: string | number | null, wanted: string | number, label: string) => {
    if (actual !== wanted) failures.push(`${label}: ${String(actual)} (want ${String(wanted)})`);
  };
  // The page has no reset: its box model is the browser's own.
  expect(measure.bodyBoxSizing, "content-box", "the page carries no base reset");
  expect(measure.textField, 56, "text-field height");
  expect(measure.textFieldInput, 56, "text-field input height");
  expect(measure.selectInput, 56, "select input height");
  expect(measure.topAppBarBox, 600, "the top app bar's 600px box");
  expect(measure.topAppBar, 600, "top app bar width");
  expect(measure.bottomAppBar, 80, "bottom app bar height");
  expect(measure.checkbox, 48, "checkbox height");
  expect(measure.radioLabel, 48, "radio label height");
  for (const [name, padding] of [["month", measure.monthPadding], ["year", measure.yearPadding]] as const) {
    for (const side of ["top", "right", "bottom", "left"] as const) {
      expect(padding[side], "0px", `date picker ${name} button padding-${side}`);
    }
  }
  assert.deepEqual(failures, [], `the component sheets are not self-contained:\n${failures.join("\n")}`);
  console.log(
    "component sheets alone: text-field 56px (input and select), top app bar 600px in a 600px box, " +
    "bottom app bar 80px, checkbox and radio label 48px, date picker month/year padding 0",
  );
} finally {
  await browser.close();
}
