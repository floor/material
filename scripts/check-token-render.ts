#!/usr/bin/env bun
/**
 * The corners and typefaces the components read from tokens (FLO-330,
 * FLO-331) render as recorded, and follow the tokens.
 *
 * Each case renders a component from the build's factories with the full
 * stylesheet, and reads the computed corner radii and font family of every
 * element in it.
 * - Nothing set, the values must equal the recorded ones in
 *   scripts/fixtures/token-render.json: a change of how a component renders
 *   its corners or text regenerates the fixture in the same PR, which shows
 *   the difference in review.
 * - With the corner and typeface tokens set to probe values, each element
 *   recorded as following them must change, and no other: a radius or a
 *   family written past the tokens (a literal, or a value set from script)
 *   fails it, element by element. Every case has at least one.
 *
 *   bun run build && bun run tokens:check
 *   bun run build && bun run tokens:check --update   record the values again
 */
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

const FIXTURE = "scripts/fixtures/token-render.json";
const update = process.argv.includes("--update");

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';
const BLOCK = (color: string, height = 160): string => `'<div style="width:100%;height:${height}px;background:${color}"></div>'`;

/** A case: the expression that builds it (`m` is the package). */
const CASES: Record<string, { make: string }> = {
  "badge-small": { make: `m.createBadge({ variant: "small" }).element` },
  "badge-large": { make: `m.createBadge({ label: "3" }).element` },
  "badge-large-wide": { make: `m.createBadge({ label: "999" }).element` },
  tooltip: {
    make: `(() => { const t = m.createTooltip({ text: "Plain tooltip" }); t.element.style.position = "static"; t.element.classList.add("mtrl-tooltip--visible"); return t.element; })()`
  },
  "switch-off": { make: `m.createSwitch({ label: "Off" }).element` },
  "switch-on": { make: `m.createSwitch({ label: "On", checked: true }).element` },
  "list-selected": {
    make: `m.createList({ trackSelection: true, items: [{ id: "a", headline: "Alpha" }, { id: "b", headline: "Beta", selected: true }] }).element`
  },
  "list-video": {
    make: `m.createList({ items: [{ id: "v", headline: "Video", leading: { type: "video", content: ${BLOCK("#345", 56)} } }] }).element`
  },
  bar: {
    make: `m.createNavigationBar({ itemLayout: "vertical", items: [{ id: "a", label: "Home", icon: ${JSON.stringify(ICON)}, active: true, badge: "3" }, { id: "b", label: "Search", icon: ${JSON.stringify(ICON)} }, { id: "c", label: "Library", icon: ${JSON.stringify(ICON)} }] }).element`
  },
  rail: {
    make: `m.createNavigationRail({ items: [{ id: "a", label: "Inbox", icon: ${JSON.stringify(ICON)}, active: true, badge: "3" }, { id: "b", label: "Sent", icon: ${JSON.stringify(ICON)} }] }).element`
  },
  drawer: {
    make: `(() => { const d = m.createDrawer({ variant: "standard", open: true, items: [{ id: "a", label: "Inbox", active: true }, { id: "b", label: "Sent" }] }); d.element.style.position = "relative"; d.element.style.height = "240px"; return d.element; })()`
  },
  slider: { make: `m.createSlider({ value: 40, showValue: true }).element` },
  carousel: {
    make: `(() => { const w = document.createElement("div"); w.style.width = "600px"; w.style.height = "220px"; const c = m.createCarousel({ slides: [{ title: "One", content: ${BLOCK("#345")} }, { title: "Two", content: ${BLOCK("#543")} }] }); c.element.style.height = "220px"; w.append(c.element); return w; })()`
  },
  "icon-xs-square": { make: `m.createIconButton({ icon: ${JSON.stringify(ICON)}, size: "xs", shape: "square", variant: "filled", ariaLabel: "x" }).element` },
  "icon-m-square": { make: `m.createIconButton({ icon: ${JSON.stringify(ICON)}, size: "m", shape: "square", variant: "filled", ariaLabel: "x" }).element` },
  "icon-xl-square": { make: `m.createIconButton({ icon: ${JSON.stringify(ICON)}, size: "xl", shape: "square", variant: "filled", ariaLabel: "x" }).element` },
  "icon-m-square-pressed": {
    make: `(() => { const b = m.createIconButton({ icon: ${JSON.stringify(ICON)}, size: "m", shape: "square", variant: "filled", ariaLabel: "x" }); b.element.classList.add("mtrl-icon-button--active"); return b.element; })()`
  },
  "button-group": {
    make: `m.createButtonGroup({ kind: "connected", selection: "single", buttons: [{ value: "a", text: "Left", selected: true }, { value: "b", text: "Mid" }, { value: "c", text: "Right" }] }).element`
  },
  // FLO-306: the FAB menu open as a list, the close button and the pill items
  "fab-menu-list": {
    make: `(() => { const f = m.createFabMenu({ icon: ${JSON.stringify(ICON)}, ariaLabel: "Compose", presentation: "list", items: [{ id: "a", text: "Reply", icon: ${JSON.stringify(ICON)} }, { id: "b", text: "Forward" }] }); f.open(); return f.element; })()`
  },
  // FLO-304: the docked toolbar's square corners, the floating pill and its vibrant item colours
  "toolbar-docked": {
    make: `m.createToolbar({ items: [{ icon: ${JSON.stringify(ICON)}, ariaLabel: "a" }, { icon: ${JSON.stringify(ICON)}, ariaLabel: "b" }] }).element`
  },
  "toolbar-floating-vibrant": {
    make: `m.createToolbar({ variant: "floating", color: "vibrant", items: [{ icon: ${JSON.stringify(ICON)}, ariaLabel: "a", toggle: true, selected: true }, { icon: ${JSON.stringify(ICON)}, ariaLabel: "b" }] }).element`
  },
  "split-s": { make: `m.createSplitButton({ text: "Save", size: "s" }).element` },
  "split-l": { make: `m.createSplitButton({ text: "Save", size: "l" }).element` },
  search: { make: `m.createSearch({ placeholder: "Search" }).element` },
  "search-docked-view": {
    make: `(() => { const s = m.createSearch({ placeholder: "Search", variant: "contained", viewMode: "docked", suggestions: [{ text: "Apple" }, { text: "Apricot" }] }); setTimeout(() => s.expand(), 0); return s.element; })()`
  },
  // FLO-330: the typefaces, and the button and card corners
  button: { make: `m.createButton({ text: "Save" }).element` },
  "button-square": { make: `m.createButton({ text: "Square", shape: "square" }).element` },
  card: { make: `(() => { const c = m.createCard({ variant: "filled" }); c.element.style.width = "240px"; c.element.style.height = "120px"; return c.element; })()` },
  dialog: {
    make: `(() => { const d = m.createDialog({ title: "Discard draft?", content: "Your changes will be lost." }); d.open(); return d.element; })()`
  },
  "text-field": { make: `m.createTextField({ label: "Name", value: "Ada" }).element` },
};

/** The probe: every corner step the components read, and both typefaces. */
const PROBE = `:root {
  --mtrl-sys-shape-corner-none: 1px; --mtrl-sys-shape-corner-extra-small: 1px; --mtrl-sys-shape-corner-small: 1px;
  --mtrl-sys-shape-corner-medium: 1px; --mtrl-sys-shape-corner-large: 1px; --mtrl-sys-shape-corner-large-increased: 1px;
  --mtrl-sys-shape-corner-extra-large: 1px; --mtrl-sys-shape-corner-extra-large-increased: 1px;
  --mtrl-sys-shape-corner-extra-extra-large: 1px; --mtrl-sys-shape-corner-full: 1px;
  --mtrl-ref-typeface-brand: ProbeBrand; --mtrl-ref-typeface-plain: ProbePlain;
}`;

type Reading = Array<[element: string, radius: string, font: string]>;
/**
 * A reading, and whether each element's corners and its typeface follow the
 * tokens: apart, since the family is inherited and would hide a corner that
 * stopped following.
 */
type Recorded = Array<[element: string, radius: string, font: string, corners: boolean, typeface: boolean]>;

/** Each element of a case, with whether the probe changed its corners and its typeface. */
const record = (unset: Reading, probed: Reading): Recorded =>
  unset.map(([element, radius, font], index) => {
    const [, probedRadius, probedFont] = probed[index] ?? [];
    return [element, radius, font, probedRadius !== radius, probedFont !== font];
  });

const bundle = await Bun.build({
  entrypoints: ["scripts/fixtures/token-render-entry.ts"],
  target: "browser",
  format: "iife",
});
assert(bundle.success, bundle.logs.map(String).join("\n"));
const js = await bundle.outputs[0]!.text();
const css = await Bun.file("dist/styles.css").text();

/** Renders every case, with the probe or without, and reads each element. */
const read = async (page: Page, probe: boolean): Promise<Record<string, Reading>> => {
  await page.setContent(`<!doctype html><html><head><style>${css}</style>
    <style>body{margin:0;background:#fff} .box{display:inline-block;padding:24px}</style>
    <style>${probe ? PROBE : ""}</style></head><body><div id="root"></div></body></html>`);
  await page.addScriptTag({ content: js });
  const readings: Record<string, Reading> = {};
  for (const [name, { make }] of Object.entries(CASES)) {
    const built = await page.evaluate((make) => {
      const m = (window as unknown as { __m: unknown }).__m;
      const root = document.getElementById("root") as HTMLElement;
      root.replaceChildren();
      const box = document.createElement("div");
      box.className = "box";
      root.append(box);
      try {
        box.append(new Function("m", `return ${make}`)(m) as HTMLElement);
        return null;
      } catch (error) {
        return String(error);
      }
    }, make);
    assert.equal(built, null, `${name}: ${built}`);
    await page.waitForTimeout(250);
    readings[name] = await page.evaluate(() => {
      const box = document.querySelector("#root > .box") as HTMLElement;
      const nodes = [...box.querySelectorAll<HTMLElement>("*")].filter((node) => !(node instanceof SVGElement));
      return nodes.map((node, index): [string, string, string] => {
        const style = getComputedStyle(node);
        const classes = [...node.classList].filter((name) => name.startsWith("mtrl-")).slice(0, 2).join(".");
        return [
          `${index}:${node.localName}${classes ? `.${classes}` : ""}`,
          [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].join(" "),
          style.fontFamily,
        ];
      });
    });
  }
  return readings;
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const unset = await read(page, false);
  const probed = await read(page, true);
  const now = Object.fromEntries(Object.keys(CASES).map((name) => [name, record(unset[name]!, probed[name]!)]));

  if (update) {
    const none = Object.entries(now).filter(([, elements]) => !elements.some(([, , , corners, typeface]) => corners || typeface)).map(([name]) => name);
    assert.deepEqual(none, [], "a case must have an element that follows the tokens");
    await Bun.write(FIXTURE, `${JSON.stringify(now, null, 1)}\n`);
    console.log(`wrote ${FIXTURE}: ${Object.keys(now).length} cases`);
    process.exit(0);
  }

  const recorded = JSON.parse(await Bun.file(FIXTURE).text()) as Record<string, Recorded>;
  assert.deepEqual(Object.keys(now).sort(), Object.keys(recorded).sort(), "the cases and the fixture's differ: run with --update");
  const strip = (elements: Recorded): Reading => elements.map(([element, radius, font]) => [element, radius, font]);
  for (const name of Object.keys(CASES)) {
    assert.deepEqual(strip(now[name]!), strip(recorded[name]!), `${name}: renders differently from ${FIXTURE}; if intended, run with --update`);
  }
  console.log(`  ok nothing set: ${Object.keys(now).length} cases render as recorded`);

  for (const name of Object.keys(CASES)) {
    const differs = now[name]!.flatMap(([element, , , corners, typeface], index) => {
      const [, , , wasCorners, wasTypeface] = recorded[name]![index]!;
      return [
        ...(corners === wasCorners ? [] : [`${element}: its corners ${corners ? "now follow" : "no longer follow"} the tokens`]),
        ...(typeface === wasTypeface ? [] : [`${element}: its typeface ${typeface ? "now follows" : "no longer follows"} the tokens`]),
      ];
    });
    assert.deepEqual(differs, [], `${name}: the elements that follow the tokens changed; if intended, run with --update`);
  }
  const corners = Object.values(now).flat().filter(([, , , follows]) => follows).length;
  console.log(`  ok tokens set: the ${corners} elements whose corners follow them, and the typefaces, do as recorded`);
} finally {
  await browser.close();
}
