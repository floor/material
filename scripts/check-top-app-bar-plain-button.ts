#!/usr/bin/env bun
/**
 * A bare button in a top app bar's leading or trailing slot gets a pressed
 * state layer and a 48px hit target, at desktop and small-screen widths, for
 * the factory and for <m-top-app-bar>.
 *
 * The resting border box stays under 48px, the resting background matches a
 * button outside the bar, and the small-screen 8px padding stays on the
 * factory buttons that rule already covers. A button whose class contains the
 * library prefix keeps its own layers.
 *
 * Prints one MEASURE line per button, then fails if any row is off.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

const entrySource = `
import { createTopAppBar } from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineAll, registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/index.ts"))};
registerStyles({ "top-app-bar": ${JSON.stringify(compile("components/top-app-bar"))} });
defineAll();
window.api = { createTopAppBar };
`;
const bundleBuild = await Bun.build({
  entrypoints: ["top-app-bar-plain-button-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^top-app-bar-plain-button-entry\.ts$/ }, () => ({
        path: resolve(repoRoot, "top-app-bar-plain-button-entry.ts"),
      }));
      build.onLoad({ filter: /top-app-bar-plain-button-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundleBuild.success, String(bundleBuild.logs));

type Side = { top: string; right: string; bottom: string; left: string };
type Layer = { content: string; opacity: string; background: string };
type Row = {
  kind: "factory" | "element";
  viewport: number;
  dir: "ltr" | "rtl";
  slot: "leading" | "trailing";
  box: { width: number; height: number };
  padding: Side;
  outsidePadding: Side;
  background: string;
  outsideBackground: string;
  beforeRest: Layer;
  beforePressed: Layer & { active: boolean };
  after: { content: string; width: string; height: string };
  hit: boolean;
  hitName: string;
  onSurface: string;
  decoyBefore: string;
  decoyAfter: string;
};

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: compile("main") });
  await page.addScriptTag({ content: await bundleBuild.outputs[0]!.text() });

  const read = async (kind: Row["kind"], viewport: number, dir: Row["dir"]): Promise<Row[]> => {
    await page.setViewportSize({ width: viewport, height: 600 });
    const centers = await page.evaluate(async ({ kind, dir }) => {
      const settle = () => new Promise((resolve) => setTimeout(resolve, 60));
      document.body.replaceChildren();
      document.documentElement.dir = dir;

      const icon = (): SVGSVGElement => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M4 4h16v16H4z");
        svg.append(path);
        return svg;
      };
      const bare = (slot: string): HTMLButtonElement => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.slot = slot;
        button.dataset.probe = slot;
        button.setAttribute("aria-label", slot);
        button.append(icon());
        return button;
      };
      const leading = bare("leading");
      const trailing = bare("trailing");
      const decoy = bare("decoy");
      decoy.className = "mtrl-decoy";
      decoy.dataset.probe = "decoy";

      if (kind === "factory") {
        const api = (window as unknown as { api: { createTopAppBar: (config: { title: string }) => {
          element: HTMLElement;
          addLeadingElement: (element: HTMLElement) => void;
          addTrailingElement: (element: HTMLElement) => void;
        } } }).api;
        const bar = api.createTopAppBar({ title: "Title" });
        document.body.append(bar.element);
        bar.addLeadingElement(leading);
        bar.addTrailingElement(decoy);
        bar.addTrailingElement(trailing);
      } else {
        const host = document.createElement("m-top-app-bar");
        host.setAttribute("headline", "Title");
        leading.slot = "leading";
        trailing.slot = "trailing";
        decoy.slot = "trailing";
        host.append(leading, decoy, trailing);
        document.body.append(host);
        await settle();
      }

      const outside = document.createElement("button");
      outside.type = "button";
      outside.dataset.probe = "outside";
      outside.append(icon());
      document.body.append(outside);

      const probe = document.createElement("span");
      probe.style.color = "var(--mtrl-sys-color-on-surface)";
      document.body.append(probe);
      const onSurface = getComputedStyle(probe).color;
      probe.remove();

      const center = (button: HTMLButtonElement) => {
        const box = button.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      };
      return {
        onSurface,
        leading: center(leading),
        trailing: center(trailing),
      };
    }, { kind, dir });

    const press = async (slot: "leading" | "trailing"): Promise<Row["beforePressed"]> => {
      const point = centers[slot];
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      const reading = await page.evaluate((slot) => {
        const button = document.querySelector<HTMLButtonElement>(`[data-probe="${slot}"]`);
        if (!button) return { active: false, content: "missing", opacity: "missing", background: "missing" };
        const before = getComputedStyle(button, "::before");
        return {
          active: button.matches(":active"),
          content: before.content,
          opacity: before.opacity,
          background: before.backgroundColor,
        };
      }, slot);
      await page.mouse.up();
      return reading;
    };

    const pressed = {
      leading: await press("leading"),
      trailing: await press("trailing"),
    };

    const rest = await page.evaluate(() => {
      const side = (style: CSSStyleDeclaration) => ({
        top: style.paddingTop,
        right: style.paddingRight,
        bottom: style.paddingBottom,
        left: style.paddingLeft,
      });
      const layer = (button: Element, pseudo: "::before" | "::after") => {
        const style = getComputedStyle(button, pseudo);
        return { content: style.content, opacity: style.opacity, background: style.backgroundColor, width: style.width, height: style.height };
      };
      const outside = document.querySelector<HTMLButtonElement>('[data-probe="outside"]')!;
      const outsideStyle = getComputedStyle(outside);
      const decoy = document.querySelector<HTMLButtonElement>('[data-probe="decoy"]')!;
      const readButton = (slot: string) => {
        const button = document.querySelector<HTMLButtonElement>(`[data-probe="${slot}"]`)!;
        const box = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        const direction = style.direction;
        const sign = slot === "leading" ? (direction === "rtl" ? 1 : -1) : (direction === "rtl" ? -1 : 1);
        const dx = sign * (box.width / 2 + 1.5);
        const x = box.left + box.width / 2 + dx;
        const y = box.top + box.height / 2;
        const target = document.elementFromPoint(x, y);
        const before = layer(button, "::before");
        const after = layer(button, "::after");
        return {
          box: { width: Math.round(box.width), height: Math.round(box.height) },
          padding: side(style),
          background: style.backgroundColor,
          beforeRest: { content: before.content, opacity: before.opacity, background: before.background },
          after: { content: after.content, width: after.width, height: after.height },
          hit: target === button || (target !== null && button.contains(target)),
          hitName: target ? `${target.tagName.toLowerCase()}${target.className ? "." + String(target.className).split(" ")[0] : ""}` : "null",
        };
      };
      return {
        outsidePadding: side(outsideStyle),
        outsideBackground: outsideStyle.backgroundColor,
        decoyBefore: layer(decoy, "::before").content,
        decoyAfter: layer(decoy, "::after").content,
        leading: readButton("leading"),
        trailing: readButton("trailing"),
      };
    });

    return (["leading", "trailing"] as const).map((slot) => ({
      kind,
      viewport,
      dir,
      slot,
      ...rest[slot],
      outsidePadding: rest.outsidePadding,
      outsideBackground: rest.outsideBackground,
      beforePressed: pressed[slot],
      onSurface: centers.onSurface,
      decoyBefore: rest.decoyBefore,
      decoyAfter: rest.decoyAfter,
    }));
  };

  const rows: Row[] = [];
  for (const viewport of [800, 400] as const) {
    for (const kind of ["factory", "element"] as const) {
      rows.push(...await read(kind, viewport, "ltr"));
    }
  }
  rows.push(...await read("factory", 800, "rtl"));
  rows.push(...await read("element", 800, "rtl"));

  for (const row of rows) console.log(`MEASURE ${JSON.stringify(row)}`);

  const failures: string[] = [];
  const same = (label: string, actual: unknown, expected: unknown) => {
    if (actual !== expected) failures.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  };
  const sameSide = (label: string, actual: Side, expected: Side) => {
    same(`${label} top`, actual.top, expected.top);
    same(`${label} right`, actual.right, expected.right);
    same(`${label} bottom`, actual.bottom, expected.bottom);
    same(`${label} left`, actual.left, expected.left);
  };
  for (const row of rows) {
    const name = `${row.kind} ${row.dir} ${row.viewport} ${row.slot}`;
    if (!(row.box.width < 48 && row.box.height < 48)) {
      failures.push(`${name} rest box is ${row.box.width}x${row.box.height}, not under 48`);
    }
    same(`${name} rest background`, row.background, row.outsideBackground);
    if (row.kind === "factory" && row.viewport === 400) {
      sameSide(`${name} padding`, row.padding, { top: "8px", right: "8px", bottom: "8px", left: "8px" });
    } else {
      sameSide(`${name} padding`, row.padding, row.outsidePadding);
    }
    same(`${name} rest ::before opacity`, row.beforeRest.opacity, "0");
    if (row.beforeRest.content === "none") failures.push(`${name} rest ::before content is none`);
    same(`${name} pressed :active`, row.beforePressed.active, true);
    same(`${name} pressed ::before opacity`, row.beforePressed.opacity, "0.1");
    same(`${name} pressed ::before background`, row.beforePressed.background, row.onSurface);
    if (row.beforePressed.content === "none") failures.push(`${name} pressed ::before content is none`);
    same(`${name} ::after width`, row.after.width, "48px");
    same(`${name} ::after height`, row.after.height, "48px");
    if (row.after.content === "none") failures.push(`${name} ::after content is none`);
    same(`${name} hit outside the border box`, row.hit, true);
    if (!row.hit) failures.push(`${name} elementFromPoint hit ${row.hitName}`);
    same(`${name} library-classed ::before`, row.decoyBefore, "none");
    same(`${name} library-classed ::after`, row.decoyAfter, "none");
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(failures, [], `top app bar plain button:\n  ${failures.join("\n  ")}`);
  console.log(`Passed top app bar plain buttons: ${rows.length} buttons in Chromium.`);
} finally {
  await browser.close();
}
