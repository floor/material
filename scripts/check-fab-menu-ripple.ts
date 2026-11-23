#!/usr/bin/env bun
/**
 * A press at the centre of a FAB menu button draws its ripple on that point.
 *
 * The FAB is a grid so the icon and the close icon occupy one cell. A rule
 * that places every child in that cell also places the absolutely positioned
 * ripple, and the grid area becomes the ripple's containing block. The wave
 * is positioned from the button's box, so it lands off the pointer.
 *
 * Presses the centre, closed and open, at every FAB size, in LTR and RTL, for
 * the factory and for <m-fab-menu>. The wave's centre is the pointer within
 * 1px, and the ripple container's rect is the button's rect.
 *
 * The pressed state is a ripple at the point of input
 * (https://m3.material.io/foundations/interaction/states/applying-states,
 * Pressed, read 2026-11-23). The open list turns the FAB into the 56dp close
 * button (https://m3.material.io/components/fab-menu/specs, read 2026-11-23).
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { launchChromium } from "./browser-profile";
import * as sass from "sass";

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

const rippleCss = compile("utilities/ripple");
const fabCss = compile("components/fab");
const menuCss = compile("components/menu");
const fabMenuCss = compile("components/fab-menu");
const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75z"/></svg>';

const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineFabMenu } from ${JSON.stringify(resolve(repoRoot, "src/elements/fab-menu.ts"))};
import { registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/styles.ts"))};
registerStyles({
  ripple: ${JSON.stringify(rippleCss)},
  fab: ${JSON.stringify(fabCss)},
  menu: ${JSON.stringify(menuCss)},
  "fab-menu": ${JSON.stringify(fabMenuCss)},
});
defineFabMenu();
window.mtrl = mtrl;
`;
const bundleBuild = await Bun.build({
  entrypoints: ["fab-menu-ripple-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^fab-menu-ripple-entry\.ts$/ }, () => ({
        path: resolve(repoRoot, "fab-menu-ripple-entry.ts"),
      }));
      build.onLoad({ filter: /fab-menu-ripple-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundleBuild.success, String(bundleBuild.logs));

type Box = { x: number; y: number; width: number; height: number };
type Sample = { button: Box; container: Box; wave: Box; padding: string };
type Row = {
  route: "factory" | "element";
  size: "default" | "medium" | "large";
  dir: "ltr" | "rtl";
  state: "closed" | "open";
  pointer: { x: number; y: number };
  wave: { x: number; y: number };
  dx: number;
  dy: number;
  container: Box;
  button: Box;
  padding: string;
};

const context = await launchChromium({
  headless: true,
  viewport: { width: 900, height: 700 },
  reducedMotion: "reduce",
});
try {
  const page = context.pages()[0] ?? await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body><main id="stage" style="padding:48px"></main></body></html>');
  await page.addStyleTag({ content: `${rippleCss}\n${fabCss}\n${fabMenuCss}` });
  await page.addScriptTag({ content: await bundleBuild.outputs[0]!.text() });

  const settle = () => page.evaluate(() => new Promise<void>((done) => {
    requestAnimationFrame(() => requestAnimationFrame(() => done()));
  }));

  const mount = (route: Row["route"], size: Row["size"], dir: Row["dir"]) => page.evaluate(({ route, size, dir, icon }) => {
    document.documentElement.dir = dir;
    const stage = document.getElementById("stage")!;
    stage.replaceChildren();
    const w = window as unknown as {
      mtrl: { createFabMenu: (config: Record<string, unknown>) => { element: HTMLElement } };
    };
    if (route === "factory") {
      const menu = w.mtrl.createFabMenu({
        icon,
        ariaLabel: "Compose",
        size,
        presentation: "list",
        placement: "none",
        items: [
          { id: "reply", text: "Reply", icon },
          { id: "forward", text: "Forward" },
        ],
      });
      stage.append(menu.element);
      return;
    }
    const host = document.createElement("m-fab-menu");
    host.setAttribute("presentation", "list");
    host.setAttribute("size", size);
    host.setAttribute("aria-label", "Compose");
    host.setAttribute("icon", icon);
    for (const [value, text] of [["reply", "Reply"], ["forward", "Forward"]] as const) {
      const item = document.createElement("m-fab-menu-item");
      item.setAttribute("value", value);
      item.textContent = text;
      host.append(item);
    }
    stage.append(host);
  }, { route, size, dir, icon });

  const read = (): Promise<Sample> => page.evaluate(() => {
    const stage = document.getElementById("stage")!;
    const host = stage.firstElementChild as HTMLElement;
    const root = host.classList.contains("mtrl-fab-menu")
      ? host
      : host.shadowRoot!.querySelector(".mtrl-fab-menu") as HTMLElement;
    const button = root.querySelector(".mtrl-fab") as HTMLElement;
    const container = button.querySelector(".mtrl-ripple") as HTMLElement;
    const wave = button.querySelector(".mtrl-ripple-wave:last-of-type") as HTMLElement;
    const box = (element: HTMLElement): Box => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      button: box(button),
      container: box(container),
      wave: box(wave),
      padding: getComputedStyle(button).padding,
    };
  });

  const buttonBox = (): Promise<Box> => page.evaluate(() => {
    const stage = document.getElementById("stage")!;
    const host = stage.firstElementChild as HTMLElement;
    const root = host.classList.contains("mtrl-fab-menu")
      ? host
      : host.shadowRoot!.querySelector(".mtrl-fab-menu") as HTMLElement;
    const rect = root.querySelector(".mtrl-fab")!.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  const rows: Row[] = [];
  for (const size of ["default", "medium", "large"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      for (const route of ["factory", "element"] as const) {
        await mount(route, size, dir);
        await settle();
        const closedBox = await buttonBox();
        const closedPointer = {
          x: closedBox.x + closedBox.width / 2,
          y: closedBox.y + closedBox.height / 2,
        };
        await page.mouse.move(closedPointer.x, closedPointer.y);
        await page.mouse.down();
        await settle();
        const closed = await read();
        rows.push(rowOf(route, size, dir, "closed", closedPointer, closed));
        await page.mouse.up();
        await page.waitForFunction(() => {
          const host = document.getElementById("stage")!.firstElementChild as HTMLElement;
          const root = host.classList.contains("mtrl-fab-menu")
            ? host
            : host.shadowRoot?.querySelector(".mtrl-fab-menu");
          return root?.classList.contains("mtrl-fab-menu--open") ?? false;
        });
        await settle();
        const openBox = await buttonBox();
        const openPointer = {
          x: openBox.x + openBox.width / 2,
          y: openBox.y + openBox.height / 2,
        };
        await page.mouse.move(openPointer.x, openPointer.y);
        await page.mouse.down();
        await settle();
        const opened = await read();
        rows.push(rowOf(route, size, dir, "open", openPointer, opened));
        await page.mouse.up();
        await settle();
      }
    }
  }

  assert.equal(errors.length, 0, errors.join("\n"));
  const failures: string[] = [];
  for (const row of rows) {
    const where = `${row.route} ${row.size} ${row.dir} ${row.state}`;
    console.log(`MEASURE ${where} pointer=${row.pointer.x.toFixed(2)},${row.pointer.y.toFixed(2)} wave=${row.wave.x.toFixed(2)},${row.wave.y.toFixed(2)} dx=${row.dx.toFixed(2)} dy=${row.dy.toFixed(2)} container=${fmt(row.container)} button=${fmt(row.button)} padding=${row.padding}`);
    if (Math.abs(row.dx) > 1 || Math.abs(row.dy) > 1) failures.push(`${where}: wave centre is ${row.dx.toFixed(2)}px, ${row.dy.toFixed(2)}px from the pointer`);
    if (!same(row.container, row.button)) failures.push(`${where}: ripple container ${fmt(row.container)} is not the button ${fmt(row.button)}`);
  }
  assert.equal(failures.length, 0, failures.join("\n"));
  console.log(`fab menu ripple: ${rows.length} presses, wave on the pointer, container on the button`);
} finally {
  await context.close();
}

function rowOf(
  route: Row["route"],
  size: Row["size"],
  dir: Row["dir"],
  state: Row["state"],
  pointer: { x: number; y: number },
  sample: Sample,
): Row {
  return {
    route,
    size,
    dir,
    state,
    pointer,
    wave: { x: sample.wave.x + sample.wave.width / 2, y: sample.wave.y + sample.wave.height / 2 },
    dx: sample.wave.x + sample.wave.width / 2 - pointer.x,
    dy: sample.wave.y + sample.wave.height / 2 - pointer.y,
    container: sample.container,
    button: sample.button,
    padding: sample.padding,
  };
}

function same(a: Box, b: Box): boolean {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1
    && Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1;
}

function fmt(box: Box): string {
  return `${box.x.toFixed(2)}x${box.y.toFixed(2)} ${box.width.toFixed(2)}x${box.height.toFixed(2)}`;
}
