#!/usr/bin/env bun
/**
 * Browser measure of two paints, outside any site:
 * the toolbar overflow icon follows the button's color, and a card header
 * that is the card's last child keeps the 16px padding the other sides use.
 * Cards whose header is followed by content or actions keep a zero bottom pad.
 */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import * as sass from "sass";

const artifacts = resolve(process.argv.find(arg => arg.startsWith("--out="))?.slice(6) ?? "analysis/toolbar-card");
await mkdir(artifacts, { recursive: true });

const css = sass.compileString(`
@use "base/tokens";
@use "base/reset";
@use "base/typography";
@use "themes/baseline";
@use "components/button";
@use "components/icon-button";
@use "components/toolbar";
@use "components/card";
`, { loadPaths: [resolve("src/styles")], style: "expanded", logger: sass.Logger.silent }).css;

const directory = await mkdtemp(join(tmpdir(), "mtrl-toolbar-card-"));
const entry = join(directory, "entry.ts");
await writeFile(entry, `
import createToolbar from ${JSON.stringify(resolve("src/components/toolbar/index.ts"))};
import createButton from ${JSON.stringify(resolve("src/components/button/index.ts"))};
import { createCard, createCardHeader, createCardMedia, createCardContent, createCardActions } from ${JSON.stringify(resolve("src/components/card/index.ts"))};
Object.assign(window, { createToolbar, createButton, createCard, createCardHeader, createCardMedia, createCardContent, createCardActions });
`);
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "iife" });
assert(bundle.success, String(bundle.logs));

const icon = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;

type Paint = { label: string | null; attr: string | null; fill: string; color: string };
type HeaderMeasure = { id: string; paddingTop: string; paddingBottom: string; lastChild: boolean; gap: number };
type Side = { paint: Paint[]; headers: HeaderMeasure[] };

const mount = (page: Page, mode: "light" | "dark") => page.evaluate(({ mode, icons }) => {
  const w = window as unknown as {
    createToolbar: (config: object) => { element: HTMLElement };
    createButton: (config: object) => { element: HTMLElement };
    createCard: (config: object) => {
      element: HTMLElement;
      addMedia: (el: HTMLElement) => void;
      setHeader: (el: HTMLElement) => void;
      addContent: (el: HTMLElement) => void;
      setActions: (el: HTMLElement) => void;
    };
    createCardHeader: (config: object) => HTMLElement;
    createCardMedia: (config: object) => HTMLElement;
    createCardContent: (config: object) => HTMLElement;
    createCardActions: (config: object) => HTMLElement;
  };
  document.documentElement.setAttribute("data-theme", "baseline");
  document.documentElement.setAttribute("data-theme-mode", mode);
  document.body.replaceChildren();
  document.body.style.cssText = "margin:0;padding:24px;background:var(--mtrl-sys-color-surface);color:var(--mtrl-sys-color-on-surface)";
  const media = () => {
    const block = document.createElement("div");
    block.style.cssText = "width:100%;height:100%;background:#c4c7c5";
    return w.createCardMedia({ element: block, aspectRatio: "1:1" });
  };
  const toolbar = w.createToolbar({
    variant: "floating",
    color: "standard",
    orientation: "horizontal",
    elevated: true,
    ariaLabel: "Page actions",
    items: [
      { icon: icons.back, ariaLabel: "Back" },
      { icon: icons.forward, ariaLabel: "Forward" },
      { icon: icons.tab, ariaLabel: "New tab", variant: "filled", width: "wide" },
      { icon: icons.tabs, ariaLabel: "Tabs" },
    ],
    overflow: () => null,
  });
  toolbar.element.id = "toolbar";
  document.body.append(toolbar.element);
  const specs = [
    { id: "podcast-episode", variant: "outlined", title: "90th minute", subtitle: "4.31 MB", content: false, action: "" },
    { id: "concert-tour", variant: "elevated", title: "Summer tour", subtitle: "Twelve cities", content: false, action: "Tickets" },
    { id: "showtime-tickets", variant: "outlined", title: "Showtime", subtitle: "Tonight", content: true, action: "Tickets" },
    { id: "default", variant: "elevated", title: "Title", subtitle: "Subhead", content: true, action: "Action" },
  ];
  for (const spec of specs) {
    const card = w.createCard({ variant: spec.variant });
    card.element.id = spec.id;
    card.element.style.cssText = "width:340px;margin-top:24px";
    card.addMedia(media());
    card.setHeader(w.createCardHeader({ title: spec.title, subtitle: spec.subtitle }));
    if (spec.content) card.addContent(w.createCardContent({ text: "Supporting copy" }));
    if (spec.action) card.setActions(w.createCardActions({ actions: [w.createButton({ text: spec.action }).element], align: "end" }));
    document.body.append(card.element);
  }
}, {
  mode,
  icons: {
    back: icon("M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"),
    forward: icon("M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"),
    tab: icon("M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"),
    tabs: icon("M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"),
  },
});

const read = (page: Page): Promise<Side> => page.evaluate(() => {
  const paint = [...document.querySelectorAll("#toolbar button")].map(button => {
    const svg = button.querySelector("svg");
    const path = svg?.querySelector("path");
    return {
      label: button.getAttribute("aria-label"),
      attr: svg?.getAttribute("fill") ?? null,
      fill: path ? getComputedStyle(path).fill : "",
      color: getComputedStyle(button).color,
    };
  });
  const headers = ["podcast-episode", "concert-tour", "showtime-tickets", "default"].map(id => {
    const card = document.getElementById(id)!;
    const header = card.querySelector(".mtrl-card__header") as HTMLElement;
    const subtitle = card.querySelector(".mtrl-card__header-subtitle") as HTMLElement;
    const style = getComputedStyle(header);
    const gap = card.getBoundingClientRect().bottom - subtitle.getBoundingClientRect().bottom;
    return {
      id,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      lastChild: header === card.lastElementChild,
      gap: Math.round(gap * 10) / 10,
    };
  });
  return { paint, headers };
});

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 880, height: 1200 }, reducedMotion: "reduce" });
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: await bundle.outputs[0].text() });
  const report: Record<"dark" | "light", Side> = { dark: { paint: [], headers: [] }, light: { paint: [], headers: [] } };
  for (const mode of ["dark", "light"] as const) {
    await mount(page, mode);
    report[mode] = await read(page);
    await page.screenshot({ path: join(artifacts, `stage-${mode}.png`), fullPage: true, animations: "disabled" });
    await page.locator("#toolbar").screenshot({ path: join(artifacts, `toolbar-${mode}.png`), animations: "disabled" });
    await page.locator("#podcast-episode").screenshot({ path: join(artifacts, `podcast-${mode}.png`), animations: "disabled" });
    await page.locator("#concert-tour").screenshot({ path: join(artifacts, `concert-${mode}.png`), animations: "disabled" });
    await page.locator("#showtime-tickets").screenshot({ path: join(artifacts, `showtime-${mode}.png`), animations: "disabled" });
    await page.locator("#default").screenshot({ path: join(artifacts, `default-${mode}.png`), animations: "disabled" });
  }
  console.log(JSON.stringify(report, null, 2));
  for (const mode of ["dark", "light"] as const) {
    const side = report[mode];
    const overflow = side.paint.find(row => row.label === "More options");
    const back = side.paint.find(row => row.label === "Back");
    assert(overflow, `${mode}: overflow button missing`);
    assert(back, `${mode}: back button missing`);
    assert.equal(overflow.attr, "currentColor", `${mode}: overflow fill attribute is ${overflow.attr}; computed fill ${overflow.fill}; color ${overflow.color}`);
    assert.equal(overflow.fill, overflow.color, `${mode}: overflow paints ${overflow.fill} against color ${overflow.color}`);
    assert.equal(back.attr, "currentColor");
    assert.equal(back.fill, back.color, `${mode}: back paints ${back.fill} against color ${back.color}`);
    const only = side.headers.find(row => row.id === "podcast-episode")!;
    assert.equal(only.lastChild, true);
    assert.equal(only.paddingTop, "16px");
    assert.equal(only.paddingBottom, "16px", `${mode}: header-only padding-bottom ${only.paddingBottom}, subtitle gap ${only.gap}px`);
    assert.ok(only.gap >= 12, `${mode}: subtitle is ${only.gap}px from the card edge`);
    for (const id of ["concert-tour", "showtime-tickets", "default"]) {
      const row = side.headers.find(item => item.id === id)!;
      assert.equal(row.lastChild, false, id);
      assert.equal(row.paddingBottom, "0px", `${mode}: ${id} padding-bottom is ${row.paddingBottom}`);
    }
  }
  assert.notEqual(report.dark.paint.find(row => row.label === "More options")!.fill, "rgb(0, 0, 0)");
  console.log("Passed: overflow icon follows the toolbar color; a header-only card keeps 16px under the subtitle; cards with content or actions keep a flush header.");
} finally {
  await browser.close();
}
