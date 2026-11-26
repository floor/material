#!/usr/bin/env bun
/**
 * The keyboard focus ring is 3px, in Secondary, at the offset the inventory
 * records. m3.material.io/foundations/interaction/states/applying-states,
 * "Keyboard focus indicator", read 2026-11-26.
 *
 * Drift rows and the two Search parts that had no author ring are focused
 * with Tab. Matching rows are the no-change guard: the same width, colour
 * and offset. On main the drift rows are 2px, or have no author ring, so
 * this fails there. Run on main and on the branch, Chromium and WebKit:
 *
 *   bun run scripts/check-focus-ring-m3.ts
 */
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as sass from "sass";
import { webkit, type Browser, type Page } from "playwright";

import { launchChromium } from "./browser-profile";
import { directionArmsPrelude, sassOptions } from "./build-styles";

type Row = { name: string; selector: string; offset: "2px" | "-3px"; pseudo?: "::before" | "::after"; guard?: boolean };

// One element per drifting paint rule, then the two Search parts, then one
// element per matching outline rule. Rows that share a rule are covered by
// that rule's element.
const rows: Row[] = [
  { name: "card", selector: ".mtrl-card", offset: "2px" },
  { name: "icon button", selector: ".mtrl-icon-button", offset: "2px" },
  { name: "fab", selector: ".mtrl-fab", offset: "2px" },
  { name: "extended fab", selector: ".mtrl-extended-fab", offset: "2px" },
  { name: "date input", selector: ".mtrl-datepicker__input", offset: "-3px" },
  { name: "date mode toggle", selector: ".mtrl-datepicker__mode-toggle", offset: "-3px" },
  { name: "date month", selector: ".mtrl-datepicker__month", offset: "2px", pseudo: "::before" },
  { name: "time hours", selector: ".mtrl-time-picker__hours", offset: "-3px" },
  { name: "time period", selector: ".mtrl-time-picker__period-am", offset: "-3px" },
  { name: "time mode switch", selector: ".mtrl-time-picker__toggle-type", offset: "2px" },
  { name: "time cancel", selector: ".mtrl-time-picker__cancel", offset: "2px" },
  { name: "slider handle", selector: ".mtrl-slider__handle", offset: "2px", pseudo: "::before" },
  { name: "dialog close", selector: ".mtrl-dialog__header-close", offset: "2px" },
  { name: "list action", selector: ".mtrl-list__action", offset: "-3px" },
  { name: "list option", selector: ".mtrl-list__item", offset: "-3px" },
  { name: "rail toggle", selector: ".mtrl-navigation-rail__toggle", offset: "-3px" },
  { name: "field trailing icon", selector: ".mtrl-text-field__trailing-icon", offset: "2px" },
  { name: "search expanded input", selector: ".mtrl-search--view .mtrl-search__input", offset: "2px" },
  { name: "search avatar", selector: ".mtrl-search__avatar", offset: "2px" },
  { name: "button", selector: ".mtrl-button", offset: "2px", guard: true },
  { name: "sheet surface", selector: ".mtrl-bottom-sheet__container", offset: "-3px", guard: true },
  { name: "sheet handle", selector: ".mtrl-bottom-sheet__handle", offset: "-3px", guard: true },
  { name: "carousel link", selector: ".mtrl-carousel__button", offset: "2px", guard: true },
  { name: "checkbox", selector: ".mtrl-checkbox__icon", offset: "2px", pseudo: "::before", guard: true },
  { name: "chip", selector: ".mtrl-chip__action", offset: "2px", guard: true },
  { name: "date day", selector: ".mtrl-datepicker__day", offset: "2px", pseudo: "::after", guard: true },
  { name: "drawer item", selector: ".mtrl-drawer__item", offset: "2px", guard: true },
  { name: "listbox option", selector: ".mtrl-listbox__option", offset: "-3px", guard: true },
  { name: "menu item", selector: ".mtrl-menu__item", offset: "-3px", guard: true },
  { name: "menu surface", selector: ".mtrl-menu", offset: "-3px", guard: true },
  { name: "search clear", selector: ".mtrl-search__clear-button", offset: "2px", guard: true },
  { name: "search suggestion", selector: ".mtrl-search__suggestion-item", offset: "-3px", guard: true },
  { name: "side sheet", selector: ".mtrl-side-sheet__container", offset: "-3px", guard: true },
  { name: "side sheet close", selector: ".mtrl-side-sheet__close", offset: "2px", guard: true },
  { name: "switch", selector: ".mtrl-switch__track", offset: "2px", guard: true },
  { name: "dial number", selector: ".mtrl-time-picker__dial-number", offset: "2px", guard: true },
];

const css = sass.compileString(
  directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()),
  sassOptions(),
).css;

const controls = rows.map((row, index) => {
  const className = row.selector.replace(/^\./, "").replace(/\./g, " ");
  if (row.name === "search expanded input") {
    return `<span class="mtrl-search mtrl-search--view"><input class="mtrl-search__input" data-i="${index}" aria-label="${row.name}"></span>`;
  }
  if (row.name === "time hours") {
    return `<input type="number" class="mtrl-time-picker__hours" data-i="${index}" aria-label="${row.name}">`;
  }
  if (row.name === "list option") {
    return `<div id="list-option" data-i="${index}"></div>`;
  }
  if (row.name === "checkbox") {
    return `<div id="checkbox" data-i="${index}"></div>`;
  }
  return `<button type="button" class="${className}" data-i="${index}">${row.name}</button>`;
}).join("\n");

const listDir = await mkdtemp(join(tmpdir(), "focus-ring-list-"));
const listEntry = join(listDir, "entry.ts");
await writeFile(listEntry, `
import createList, { withSingleSelectListbox } from ${JSON.stringify(join(import.meta.dir, "../src/components/list/index.ts"))};
import createCheckbox from ${JSON.stringify(join(import.meta.dir, "../src/components/checkbox/index.ts"))};
const slot = document.querySelector<HTMLElement>("#list-option");
const listIndex = slot?.dataset.i ?? "";
const list = withSingleSelectListbox(createList({ ariaLabel: "Options", items: [{ headline: "One" }] }));
slot?.replaceWith(list.element);
const option = list.element.querySelector<HTMLElement>("[role=option]");
if (option) option.dataset.i = listIndex;
const box = document.querySelector<HTMLElement>("#checkbox");
const boxIndex = box?.dataset.i ?? "";
const checkbox = createCheckbox({ label: "Agree" });
box?.replaceWith(checkbox.element);
const icon = checkbox.element.querySelector<HTMLElement>(".mtrl-checkbox__icon");
if (icon) icon.dataset.i = boxIndex;
`);
const listBuild = await Bun.build({ entrypoints: [listEntry], target: "browser", format: "esm" });
if (!listBuild.success) throw new Error(String(listBuild.logs));
const listJs = await listBuild.outputs[0]!.text();

const html = `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body>
<span id="secondary" style="color: var(--mtrl-sys-color-secondary)"></span>
${controls}
<script type="module" src="/list.js"></script>
</body></html>`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    if (path === "/list.js") return new Response(listJs, { headers: { "Content-Type": "text/javascript" } });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  },
});

const readRing = (page: Page, index: number, pseudo?: string) => page.evaluate(({ index, pseudo }) => {
  const host = document.querySelector<HTMLElement>(`[data-i="${index}"]`)!;
  const target = pseudo ? host : host;
  const style = getComputedStyle(target, pseudo ?? undefined);
  return {
    width: style.outlineWidth,
    style: style.outlineStyle,
    color: style.outlineColor,
    offset: style.outlineOffset,
    secondary: getComputedStyle(document.querySelector("#secondary")!).color,
  };
}, { index, pseudo });

const run = async (page: Page, engine: string) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto(`http://127.0.0.1:${server.port}/`);
  for (const [index, row] of rows.entries()) {
    await page.keyboard.press("Tab");
    const ring = await readRing(page, index, row.pseudo);
    const where = `${engine} ${row.guard ? "guard" : "drift"} ${row.name}`;
    assert.equal(ring.width, "3px", `${where} width ${ring.width}`);
    assert.equal(ring.style, "solid", `${where} style ${ring.style}`);
    assert.equal(ring.color, ring.secondary, `${where} colour ${ring.color}, secondary ${ring.secondary}`);
    assert.equal(ring.offset, row.offset, `${where} offset ${ring.offset}`);
  }
  console.log(`${engine}: ${rows.length} focus rings are 3px Secondary at the recorded offset`);
};

const chromium = await launchChromium({ headless: true });
const webkitBrowser: Browser = await webkit.launch({ headless: true });
try {
  await run(await chromium.newPage(), "chromium");
  await run(await webkitBrowser.newPage(), "webkit");
} finally {
  await chromium.close();
  await webkitBrowser.close();
  server.stop();
}

console.log("Passed: drift rows and the matching guard use the M3 focus ring.");
