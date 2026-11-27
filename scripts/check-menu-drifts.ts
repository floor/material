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
  baseline?: { element: HTMLElement; open: () => void; close: () => void; setSelected: (id: string | null) => void };
  vertical?: { element: HTMLElement; open: () => void; close: () => void; setSelected: (id: string | null) => void };
  disabled?: { element: HTMLElement; open: () => void; close: () => void };
  extra?: { element: HTMLElement; open: () => void; close: () => void; setSelected: (id: string | null) => void };
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
          { id: "y", text: "Save changes and exit", icon, supportingText: "Selected line" },
          { id: "z", text: "Save changes and exit", icon, hasSubmenu: true, submenu: [{ id: "z1", text: "Deep" }] },
        ],
      });
      lab.extra = lab.mtrl.createMenu({
        opener: document.getElementById("opener")!,
        variant: "baseline",
        items: [
          { id: "es", text: "Save changes and exit", icon, shortcut: "Ctrl+S", supportingText: "Selected shortcut" },
          { id: "em", text: "Save changes and exit", icon, shortcut: "Ctrl+M", hasSubmenu: true, submenu: [{ id: "e1", text: "Deep" }] },
        ],
      });
      lab.extra.setSelected("es");
      (lab.baseline as unknown as { setSelected: (id: string | null) => void }).setSelected("y");
      lab.vertical = lab.mtrl.createMenu({
        opener: document.getElementById("opener")!,
        variant: "vertical",
        items: [
          { id: "vs", text: "Vertical selected", icon },
          { id: "vm", text: "Vertical more", icon, hasSubmenu: true, submenu: [{ id: "v1", text: "Deep" }] },
        ],
      });
      (lab.vertical as unknown as { setSelected: (id: string | null) => void }).setSelected("vs");
      lab.disabled = lab.mtrl.createMenu({
        opener: document.getElementById("opener")!,
        variant: "vertical",
        color: "vibrant",
        items: [{ id: "d", text: "Disabled", icon, disabled: true }],
      });
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

    // Baseline: every item's end padding is 12dp, the content row reserves the
    // mark's room once, and a shortcut stays clear of the check or the arrow --
    // in both directions. Main's sizes are the reference: at 240px with an
    // icon and a supporting line, the label is 152px beside the check and
    // 144px beside the arrow, and the shortcut clears them by 10 and 12px.
    const geometryOf = (menuName: "baseline" | "extra") => page.evaluate((menuName) => {
      const lab = window as unknown as Lab;
      const menu = (lab[menuName]!.element);
      menu.style.width = "240px";
      const rtl = getComputedStyle(menu).direction === "rtl";
      const items = [...menu.querySelectorAll<HTMLElement>(".mtrl-menu__item")];
      const row = (item: HTMLElement) => {
        const itemBox = item.getBoundingClientRect();
        const label = (item.querySelector(".mtrl-menu__item-label") ?? item.querySelector(".mtrl-menu__item-text")) as HTMLElement;
        const labelBox = label.getBoundingClientRect();
        const shortcut = item.querySelector<HTMLElement>(".mtrl-menu__item-shortcut");
        const shortcutBox = shortcut?.getBoundingClientRect();
        const markWidth = item.classList.contains("mtrl-menu__item--submenu") ? 36 : 30;
        // The mark box: the last markWidth px of the item, ending in the 12dp
        // end padding.
        const markInner = rtl ? itemBox.left + markWidth : itemBox.right - markWidth;
        const shortcutClearance = shortcutBox
          ? Math.round(rtl ? shortcutBox.left - markInner : markInner - shortcutBox.right)
          : null;
        const boxToEnd = rtl ? labelBox.left - itemBox.left : itemBox.right - labelBox.right;
        return {
          padding: getComputedStyle(item).paddingInlineEnd,
          contentPadding: getComputedStyle(item.querySelector<HTMLElement>(".mtrl-menu__item-content")!).paddingInlineEnd,
          labelWidth: Math.round(labelBox.width),
          shortcutClearance,
          boxToEnd: Math.round(boxToEnd * 10) / 10,
        };
      };
      return { direction: rtl ? "rtl" : "ltr", rows: items.map(row) };
    }, menuName);
    for (const direction of ["ltr", "rtl"]) {
      await page.evaluate((direction) => {
        document.documentElement.dir = direction;
        (window as unknown as Lab).baseline!.open();
      }, direction);
      await page.waitForTimeout(400);
      const geometry = await geometryOf("baseline");
      try {
        assert.equal(geometry.direction, direction);
        const [plain, selected, submenu] = geometry.rows;
        for (const [key, row] of [["plain", plain], ["selected", selected], ["submenu", submenu]] as const) {
          assert.equal(row!.padding, "12px", `${direction} ${key}: item end padding is ${row!.padding}`);
        }
        // The label sits inside the content row: its end is the item's 12dp
        // padding plus the content's reservation (no shortcut shifts it).
        for (const [key, row] of [["plain", plain], ["selected", selected], ["submenu", submenu]] as const) {
          const expected = 12 + parseFloat(row!.contentPadding);
          assert.equal(row!.boxToEnd, expected, `${direction} ${key}: label box ends ${row!.boxToEnd} from the item end, expected ${expected}`);
        }
        assert.equal(plain!.contentPadding, "0px", `plain content reserves ${plain!.contentPadding}`);
        assert.equal(selected!.contentPadding, "28px", `selected content reserves ${selected!.contentPadding} (18dp check + 10dp)`);
        assert.equal(submenu!.contentPadding, "36px", `submenu content reserves ${submenu!.contentPadding} (24dp arrow + 12dp)`);
        // Main's label sizes at 240px: no double reservation. (Main's RTL
        // submenu label is 4px narrower: its RTL start padding was 16dp where
        // the spec, and this fix, use 12dp on both sides.)
        assert.equal(selected!.labelWidth, 152, `selected label is ${selected!.labelWidth}px, main's 152px`);
        assert.equal(submenu!.labelWidth, 144, `submenu label is ${submenu!.labelWidth}px, main's 144px`);
        passed.push(`${name} baseline geometry ${direction}`);
      } catch (error) {
        failures.push(`${name} baseline geometry ${direction}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      // Shortcut clearance, main's 10 and 12px, and main's label sizes.
      await page.evaluate(() => (window as unknown as Lab).extra!.open());
      await page.waitForTimeout(400);
      const extra = await geometryOf("extra");
      const [extraSelected, extraSubmenu] = extra.rows;
      try {
        assert.equal(extraSelected!.contentPadding, "28px", `${direction} selected+shortcut reserves ${extraSelected!.contentPadding}`);
        assert.equal(extraSubmenu!.contentPadding, "36px", `${direction} submenu+shortcut reserves ${extraSubmenu!.contentPadding}`);
        // Main's clearances: 10 and 12 in LTR, 22 and 24 in RTL (the check
        // mirrors to the inline start and the shortcut's start margin grows).
        const expected = direction === "ltr" ? [10, 12] : [22, 24];
        assert.equal(extraSelected!.shortcutClearance, expected[0], `${direction} selected+shortcut clearance is ${extraSelected!.shortcutClearance}, main's ${expected[0]}`);
        assert.equal(extraSubmenu!.shortcutClearance, expected[1], `${direction} submenu+shortcut clearance is ${extraSubmenu!.shortcutClearance}, main's ${expected[1]}`);
        passed.push(`${name} shortcut clearance ${direction}`);
      } catch (error) {
        failures.push(`${name} shortcut clearance ${direction}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // The vertical menu keeps its own padding and marks: the reservation is
    // the baseline menu's only.
    await page.evaluate(() => (window as unknown as Lab).vertical!.open());
    await page.waitForTimeout(400);
    const vertical = await page.evaluate(() => {
      const lab = window as unknown as Lab;
      const items = [...lab.vertical!.element.querySelectorAll<HTMLElement>(".mtrl-menu__item")];
      return items.map((item) => ({
        padding: getComputedStyle(item).paddingInlineEnd,
        contentPadding: getComputedStyle(item.querySelector<HTMLElement>(".mtrl-menu__item-content")!).paddingInlineEnd,
        labelWidth: Math.round((item.querySelector(".mtrl-menu__item-label") ?? item.querySelector(".mtrl-menu__item-text"))!.getBoundingClientRect().width),
      }));
    });
    try {
      assert.deepEqual(vertical, [
        { padding: "16px", contentPadding: "0px", labelWidth: 134 },
        { padding: "48px", contentPadding: "0px", labelWidth: 102 },
      ], `vertical items changed: ${JSON.stringify(vertical)}`);
      passed.push(`${name} vertical variants unchanged`);
    } catch (error) {
      failures.push(`${name} vertical variants unchanged: ${error instanceof Error ? error.message : String(error)}`);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // A disabled vibrant item takes no hover colour.
    await page.evaluate(() => (window as unknown as Lab).disabled!.open());
    await page.waitForTimeout(400);
    const disabledReading = () => page.evaluate(() => {
      const lab = window as unknown as Lab;
      const item = lab.disabled!.element.querySelector<HTMLElement>(".mtrl-menu__item")!;
      const icon = item.querySelector<HTMLElement>(".mtrl-menu__item-icon")!;
      return { color: getComputedStyle(icon).color, box: item.getBoundingClientRect().toJSON() };
    });
    try {
      const before = await disabledReading();
      await page.mouse.move(before.box.x + before.box.width / 2, before.box.y + before.box.height / 2);
      await page.waitForTimeout(200);
      const after = await disabledReading();
      assert.equal(after.color, before.color, `disabled vibrant icon on hover is ${after.color}, at rest ${before.color}`);
      assert.notEqual(after.color, tokens.tertiary, "the disabled icon must not take the hover colour");
      passed.push(`${name} disabled vibrant unchanged on hover`);
    } catch (error) {
      failures.push(`${name} disabled vibrant unchanged on hover: ${error instanceof Error ? error.message : String(error)}`);
    }
    await page.mouse.move(1, 1);
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
