#!/usr/bin/env bun
/**
 * The navigation drawer's divider geometry against the specs.
 * https://m3.material.io/components/navigation-drawer/specs (Measurements,
 * Padding and margins, read 2026-11-27): 16dp between a divider and the rows
 * around it, and a divider inset 28dp on each side. Compose's
 * HorizontalDivider is a bare rule with no surrounding space and no inset
 * (Divider.kt), so the spec governs here.
 *
 * On main the space is 8px in the standard and modal drawers, and the
 * standard drawer's end inset is 29px: its sheet's 1px inline-end border sits
 * outside the content box the divider is measured in.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { webkit, type Browser, type Page } from "playwright";
import { compileString } from "sass";

import { launchChromium } from "./browser-profile";

const repoRoot = resolve(import.meta.dir, "..");
const css = compileString(`@use "themes/baseline"; @use "components/drawer";`, {
  loadPaths: [resolve(repoRoot, "src/styles")],
  style: "expanded",
}).css;

const bundle = await Bun.build({
  entrypoints: ["drawer-divider-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^drawer-divider-entry\.ts$/ }, () => ({ path: "drawer-divider-entry.ts", namespace: "drawer-divider" }));
      build.onLoad({ filter: /.*/, namespace: "drawer-divider" }, () => ({
        contents: `import createDrawer from ${JSON.stringify(resolve(repoRoot, "src/components/drawer/index.ts"))};
import { defineDrawer } from ${JSON.stringify(resolve(repoRoot, "src/elements/drawer.ts"))};
import { registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/styles.ts"))};
window.createDrawer = createDrawer;
window.defineDrawer = defineDrawer;
window.registerStyles = registerStyles;`,
        loader: "ts",
      }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();

const mount = () => {
  const createDrawer = (window as unknown as {
    createDrawer: (config: object) => { element: HTMLElement };
  }).createDrawer;
  document.body.style.cssText = "margin:0";
  // A live element host: its direction changes after it is mounted, so the
  // sheet's border must follow the direction rather than the mount.
  (window as unknown as { registerStyles: (css: Record<string, string>) => void }).registerStyles({
    drawer: (window as unknown as { DRAWER_CSS: string }).DRAWER_CSS,
  });
  (window as unknown as { defineDrawer: () => string }).defineDrawer();
  const elementWrapper = document.createElement("div");
  elementWrapper.id = "element-wrapper";
  elementWrapper.setAttribute("dir", "ltr");
  elementWrapper.style.cssText = "position:relative;height:400px";
  elementWrapper.innerHTML = `
    <m-drawer open value="one">
      <m-drawer-item value="one">One</m-drawer-item>
      <m-drawer-item type="divider"></m-drawer-item>
      <m-drawer-item value="two">Two</m-drawer-item>
    </m-drawer>`;
  document.body.append(elementWrapper);
  // The sheet's border is on the logical end edge in both positions, so the
  // divider's end margin is read in LTR and RTL alike.
  for (const direction of ["ltr", "rtl"] as const) {
    for (const position of ["start", "end"] as const) {
      for (const variant of ["standard", "modal"] as const) {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("dir", direction);
        wrapper.style.cssText = "position:relative;height:400px";
        const drawer = createDrawer({
          variant,
          open: true,
          position,
          headline: "Drawer",
          items: [
            { id: "one", label: "One" },
            { type: "divider" },
            { id: "two", label: "Two" },
          ],
        });
        drawer.element.id = `${variant}/${direction}/${position}`;
        wrapper.append(drawer.element);
        document.body.append(wrapper);
      }
    }
  }
};

const snapshot = (page: Page) => page.evaluate(() => {
  const read = (id: string) => {
    const root = document.getElementById(id) as HTMLElement;
    const box = (selector: string) => {
      const element = root.querySelector(selector) as HTMLElement;
      return element.getBoundingClientRect();
    };
    const sheet = box(".mtrl-drawer__sheet");
    const divider = box(".mtrl-drawer__divider");
    const before = box('.mtrl-drawer__item[data-id="one"]');
    const after = box('.mtrl-drawer__item[data-id="two"]');
    const round = (value: number) => Math.round(value * 100) / 100;
    return {
      gapBefore: round(divider.y - (before.y + before.height)),
      gapAfter: round(after.y - (divider.y + divider.height)),
      insetStart: round(divider.x - sheet.x),
      insetEnd: round(sheet.x + sheet.width - (divider.x + divider.width)),
    };
  };
  const readings: Record<string, ReturnType<typeof read>> = {};
  for (const direction of ["ltr", "rtl"]) {
    for (const position of ["start", "end"]) {
      for (const variant of ["standard", "modal"]) {
        readings[`${variant}/${direction}/${position}`] = read(`${variant}/${direction}/${position}`);
      }
    }
  }
  return readings;
});

const run = async (page: Page, engine: string) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline" data-theme-mode="light"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: `${js}\nwindow.DRAWER_CSS = ${JSON.stringify(css)};` });
  await page.evaluate(mount);
  const geometry = await snapshot(page);
  for (const [id, reading] of Object.entries(geometry)) {
    const variant = id.split("/")[0];
    assert.equal(reading.gapBefore, 16, `${engine}: navigation-drawer/divider-top-space/${variant}/rest (${id}) — the space above the divider`);
    assert.equal(reading.gapAfter, 16, `${engine}: navigation-drawer/divider-top-space/${variant}/rest (${id}) — the space below the divider`);
    assert.equal(reading.insetStart, 28, `${engine}: navigation-drawer/divider-side-inset/${variant}/rest (${id}) — the start inset`);
    assert.equal(reading.insetEnd, 28, `${engine}: navigation-drawer/divider-side-inset/${variant}/rest (${id}) — the end inset`);
  }
  // A live element host, toggled after its mount: the sheet's border must
  // follow the direction, not the side it was mounted under.
  const elementGeometry = () => page.evaluate(() => {
    const host = document.querySelector("m-drawer") as HTMLElement | null;
    const root = host?.shadowRoot as ShadowRoot | null;
    if (!root) return null;
    const box = (selector: string) => (root.querySelector(selector) as HTMLElement).getBoundingClientRect();
    const sheet = box(".mtrl-drawer__sheet");
    const divider = box(".mtrl-drawer__divider");
    const before = box('.mtrl-drawer__item[data-id="one"]');
    const after = box('.mtrl-drawer__item[data-id="two"]');
    const round = (value: number) => Math.round(value * 100) / 100;
    const style = getComputedStyle(root.querySelector(".mtrl-drawer__sheet") as HTMLElement);
    return {
      gapBefore: round(divider.y - (before.y + before.height)),
      gapAfter: round(after.y - (divider.y + divider.height)),
      insetStart: round(divider.x - sheet.x),
      insetEnd: round(sheet.x + sheet.width - (divider.x + divider.width)),
      borderLeft: style.borderLeftWidth,
      borderRight: style.borderRightWidth,
    };
  });
  const toggle = (direction: string) => page.evaluate((value) => {
    (document.getElementById("element-wrapper") as HTMLElement).setAttribute("dir", value);
  }, direction);
  for (const direction of ["ltr", "rtl", "ltr"]) {
    await toggle(direction);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const reading = await elementGeometry();
    assert.ok(reading, `${engine}: the element host has no shadow root`);
    assert.equal(reading.gapBefore, 16, `${engine}: element host (${direction}) — the space above the divider`);
    assert.equal(reading.gapAfter, 16, `${engine}: element host (${direction}) — the space below the divider`);
    assert.equal(reading.insetStart, 28, `${engine}: element host (${direction}) — the start inset`);
    assert.equal(reading.insetEnd, 28, `${engine}: element host (${direction}) — the end inset`);
    // The separator border faces the page: the right in LTR, the left in RTL.
    assert.equal(reading.borderRight, direction === "ltr" ? "1px" : "0px", `${engine}: element host (${direction}) — the border on the right`);
    assert.equal(reading.borderLeft, direction === "rtl" ? "1px" : "0px", `${engine}: element host (${direction}) — the border on the left`);
  }
  assert.deepEqual(errors, [], `${engine}: ${errors.join("\n")}`);
  console.log(`${engine}: divider 16 above and below, inset 28/28 in the standard and modal drawers, and a live element host keeps it through a direction toggle`);
};

const pageOptions = { viewport: { width: 800, height: 700 }, reducedMotion: "no-preference" as const };

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

console.log("The drawer divider matches the navigation drawer specs.");
