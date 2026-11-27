#!/usr/bin/env bun
/**
 * The menu's two drifts against the M3 menu specs (read 2026-11-27):
 *
 * 1. The vibrant menu's leading icon is Tertiary as the item is hovered,
 *    focused or pressed (owner decision; the vibrant mapping is
 *    tertiary-based, m3.material.io/components/menus/specs).
 * 2. A baseline menu item's end padding is 12dp on every item; a trailing
 *    mark (the selected check, the submenu arrow) sits in that padding and the
 *    label reserves its room plus the 12dp between elements
 *    (m3.material.io/components/menus/specs, "Baseline menu padding and size
 *    measurements": left/right padding 12dp, with-icon too, padding between
 *    elements 12dp).
 *
 * Run from a checkout whose src/ is the version under test:
 *   bun run scripts/check-menu-drifts.ts [repoRoot]
 * Without an argument the working tree is used. Chromium and WebKit.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";
import * as sass from "sass";

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;
const entrySource = `import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))}; window.mtrl = mtrl;`;
const bundle = await Bun.build({
  entrypoints: ["menu-drifts-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^menu-drifts-entry\.ts$/ }, () => ({ path: resolve(repoRoot, "menu-drifts-entry.ts") }));
      build.onLoad({ filter: /menu-drifts-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const bundleJs = await bundle.outputs[0]!.text();
const stylesheet = compile("main");
const icon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>';

interface Lab {
  mtrl: { createMenu: (config: Record<string, unknown>) => { element: HTMLElement; open: () => void; close: () => void; setSelected: (id: string | null) => void } };
  vibrant?: { element: HTMLElement; open: () => void; close: () => void };
  baseline?: { element: HTMLElement; open: () => void; close: () => void };
  direction?: string;
}

type Engine = "chromium" | "webkit";
const failures: string[] = [];
const passed: string[] = [];

const run = async (name: Engine, launcher: typeof chromium | typeof webkit): Promise<void> => {
  const browser = await launcher.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(`<!doctype html><html lang="en" data-theme="baseline" data-theme-mode="light"><head><meta charset="utf-8"></head><body><main id="stage"><button id="opener" type="button">Open</button></main></body></html>`);
    await page.addStyleTag({ content: stylesheet });
    await page.addScriptTag({ content: bundleJs });
    await page.evaluate((icon) => {
      const lab = window as unknown as Lab;
      const probe = (id: string, token: string) => {
        const span = document.createElement("span");
        span.id = id;
        span.style.cssText = `position:absolute;left:-9999px;color:var(${token})`;
        span.textContent = "t";
        document.body.append(span);
      };
      probe("tertiary", "--mtrl-sys-color-tertiary");
      probe("on-tertiary-container", "--mtrl-sys-color-on-tertiary-container");
      lab.vibrant = lab.mtrl.createMenu({
        opener: document.getElementById("opener")!,
        variant: "vertical",
        color: "vibrant",
        items: [
          { id: "a", text: "Alpha", icon },
          { id: "b", text: "Beta", icon },
          { id: "c", text: "Gamma", icon },
        ],
      });
      lab.baseline = lab.mtrl.createMenu({
        opener: document.getElementById("opener")!,
        variant: "baseline",
        items: [
          { id: "x", text: "Cut", icon },
          { id: "y", text: "Zebra crossing", icon },
          { id: "z", text: "More", icon, hasSubmenu: true, submenu: [{ id: "z1", text: "Deep" }] },
        ],
      });
      (lab.baseline as unknown as { setSelected: (id: string | null) => void }).setSelected("y");
    }, icon);
    const tokens = await page.evaluate(() => ({
      tertiary: getComputedStyle(document.getElementById("tertiary")!).color,
      onTertiaryContainer: getComputedStyle(document.getElementById("on-tertiary-container")!).color,
    }));
    const iconReading = () => page.evaluate(() => {
      const lab = window as unknown as Lab;
      const item = lab.vibrant!.element.querySelector(".mtrl-menu__item") as HTMLElement;
      const icon = item.querySelector(".mtrl-menu__item-icon") as HTMLElement;
      return { color: getComputedStyle(icon).color, box: item.getBoundingClientRect().toJSON() };
    });
    const check = async (label: string, action: () => Promise<void>, expected: string) => {
      try {
        await action();
        const reading = await iconReading();
        assert.equal(reading.color, expected, `${label}: icon is ${reading.color}, expected ${expected}`);
        passed.push(`${name} ${label}`);
      } catch (error) {
        failures.push(`${name} ${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Rest: the vibrant item's own supporting colour (on-tertiary-container).
    await page.evaluate(() => (window as unknown as Lab).vibrant!.open());
    await page.waitForTimeout(400);
    await check("vibrant leading icon at rest", async () => {}, tokens.onTertiaryContainer);
    const box = (await iconReading()).box;

    await check("vibrant leading icon on hover", async () => {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
    }, tokens.tertiary);

    await check("vibrant leading icon on press", async () => {
      await page.mouse.down();
      await page.waitForTimeout(150);
    }, tokens.tertiary);
    await page.mouse.up();
    await page.mouse.move(1, 1);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    await check("vibrant leading icon on keyboard focus", async () => {
      await page.evaluate(() => (window as unknown as Lab).vibrant!.open());
      await page.waitForTimeout(350);
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(200);
    }, tokens.tertiary);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Baseline: the item's end padding is 12dp, in both directions, and the
    // label reserves the mark's room.
    const baselineGeometry = () => page.evaluate(() => {
      const lab = window as unknown as Lab;
      const menu = lab.baseline!.element;
      const rtl = getComputedStyle(menu).direction === "rtl";
      const items = [...menu.querySelectorAll<HTMLElement>(".mtrl-menu__item")];
      const row = (item: HTMLElement) => {
        const text = item.querySelector<HTMLElement>(".mtrl-menu__item-text")!;
        const itemBox = item.getBoundingClientRect();
        const textBox = text.getBoundingClientRect();
        // The label box ends where the item's 12dp end padding begins; the
        // label's own end padding is the room it reserves for a mark.
        const boxToEnd = rtl ? textBox.left - itemBox.left : itemBox.right - textBox.right;
        return {
          padding: getComputedStyle(item).paddingInlineEnd,
          textPadding: getComputedStyle(text).paddingInlineEnd,
          boxToEnd: Math.round(boxToEnd * 10) / 10,
        };
      };
      return { direction: rtl ? "rtl" : "ltr", plain: row(items[0]!), selected: row(items[1]!), submenu: row(items[2]!) };
    });
    for (const direction of ["ltr", "rtl"]) {
      await page.evaluate((direction) => {
        document.documentElement.dir = direction;
        const lab = window as unknown as Lab;
        lab.baseline!.open();
      }, direction);
      await page.waitForTimeout(400);
      await page.evaluate(() => (window as unknown as Lab).mtrl && (window as unknown as Lab));
      const geometry = await baselineGeometry();
      try {
        assert.equal(geometry.direction, direction);
        for (const key of ["plain", "selected", "submenu"] as const) {
          const row = geometry[key];
          assert.equal(row.padding, "12px", `${direction} ${key}: item end padding is ${row.padding}`);
          assert.equal(row.boxToEnd, 12, `${direction} ${key}: label box ends ${row.boxToEnd} from the item end`);
        }
        assert.equal(geometry.plain.textPadding, "0px", `plain label reserves ${geometry.plain.textPadding}`);
        assert.equal(geometry.selected.textPadding, "30px", `selected label reserves ${geometry.selected.textPadding} (18dp check + 12dp)`);
        assert.equal(geometry.submenu.textPadding, "36px", `submenu label reserves ${geometry.submenu.textPadding} (24dp arrow + 12dp)`);
        passed.push(`${name} baseline geometry ${direction}`);
      } catch (error) {
        failures.push(`${name} baseline geometry ${direction}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    assert.deepEqual(errors, [], `${name}: no page errors`);
  } finally {
    await browser.close();
  }
};

await run("chromium", chromium);
await run("webkit", webkit);
for (const line of passed) console.log(`ok ${line}`);
assert.deepEqual(failures, [], `menu drifts:\n  ${failures.join("\n  ")}`);
console.log(`Passed menu drifts: ${passed.length} readings in Chromium and WebKit.`);
