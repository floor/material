#!/usr/bin/env bun
// scripts/check-search-trailing-space.ts
// The space between the search bar's text and its end edge, with and without
// trailing actions, in Chromium and WebKit.
//
//   bun run scripts/check-search-trailing-space.ts
//
// Compose Material 3 at the pinned androidx-main 08ec699d (SearchBarTokens.kt,
// tokens 41.1.19): ContainedNoActionsTrailingSpace = Space200 = 16dp, and
// ContainedTrailingSpace = Space50 = 4dp when the bar has a trailing action.
//
// Every case is a 420px bar with a leading icon, contained and divided, LTR
// and RTL. "end" is the distance from the input wrapper's end to the bar's end.
//
// 1. The default configuration (the clear button on, no trailing items), in
//    the factory and in <m-search>: empty, the end is 16px; after typing, the
//    clear button shows and ends 4px from the edge; after a click on it, the
//    value is empty and the end is 16px again. The typed sequence turns
//    expand-on-focus off so the bar stays a bar while the input has focus.
//    Before this check an empty default bar measured 56px: the hidden clear
//    button kept its 48px box.
// 2. The factory with the clear button off and no trailing items: 16px.
// 3. The factory with a trailing icon button: the button ends 4px from the edge.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { compileString } from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

const repoRoot = resolve(import.meta.dir, "..");
const compile = (source: string): string =>
  compileString(`@use "${source}";`, { loadPaths: [resolve(repoRoot, "src/styles")], style: "expanded" }).css;
const css = [compile("themes/baseline"), compile("components/search")].join("\n");
// The shadow root adopts the search's component sheet and the ripple base.
const sheets = { search: compile("components/search"), ripple: compile("utilities/ripple") };

const at = (path: string): string => JSON.stringify(resolve(repoRoot, path));
const bundle = await Bun.build({
  entrypoints: ["search-trailing-space-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^search-trailing-space-entry\.ts$/ }, () => ({
        path: resolve(repoRoot, "search-trailing-space-entry.ts"),
      }));
      build.onLoad({ filter: /search-trailing-space-entry\.ts$/ }, () => ({
        contents: [
          `import createSearch from ${at("src/components/search/index.ts")};`,
          `import { defineSearch } from ${at("src/elements/search.ts")};`,
          `import { registerStyles } from ${at("src/elements/styles.ts")};`,
          `registerStyles(${JSON.stringify(sheets)});`,
          `defineSearch();`,
          `window.createSearch = createSearch;`,
        ].join("\n"),
        loader: "ts",
      }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();
assert(js.length > 0, "the search bundle is empty");

const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
type Form = "factory" | "element";
type Reading = { end: number; clear: number | null; clearShown: boolean; value: string };

/** Mounts one bar in #stage and returns nothing; the helpers below read it. */
const mount = (page: Page, form: Form, variant: string, dir: string, config: Record<string, unknown>) =>
  page.evaluate(({ form, variant, dir, config, icon }) => {
    const win = window as unknown as { createSearch: (c: object) => { element: HTMLElement; destroy: () => void }; current?: { destroy: () => void } };
    win.current?.destroy();
    win.current = undefined;
    document.body.replaceChildren();
    const stage = document.createElement("div");
    stage.id = "stage";
    stage.dir = dir;
    stage.style.width = "420px";
    document.body.append(stage);
    if (form === "element") {
      const host = document.createElement("m-search");
      host.setAttribute("variant", variant);
      host.setAttribute("full-width", "");
      host.setAttribute("leading-icon", icon);
      host.setAttribute("placeholder", "Search records");
      if (config.expandOnFocus === false) host.setAttribute("no-expand-on-focus", "");
      if (config.collapseOnBlur === false) host.setAttribute("no-collapse-on-blur", "");
      stage.append(host);
    } else {
      const search = win.createSearch({ variant, fullWidth: true, leadingIcon: icon, placeholder: "Search records", ...config });
      win.current = search;
      stage.append(search.element);
    }
  }, { form, variant, dir, config, icon });

const read = (page: Page, dir: string): Promise<Reading> =>
  page.evaluate((dir) => {
    const host = document.querySelector("#stage m-search");
    const root: ParentNode = host?.shadowRoot ?? document;
    const bar = root.querySelector(".mtrl-search__container")!.getBoundingClientRect();
    const wrap = root.querySelector(".mtrl-search__input-wrapper")!.getBoundingClientRect();
    const clearElement = root.querySelector<HTMLElement>(".mtrl-search__clear-button");
    const clearBox = clearElement?.getBoundingClientRect();
    const clearShown = !!clearElement && clearBox!.width > 0 && getComputedStyle(clearElement).visibility === "visible" && getComputedStyle(clearElement).opacity !== "0";
    const rtl = dir === "rtl";
    return {
      end: Math.round(rtl ? wrap.left - bar.left : bar.right - wrap.right),
      clear: clearShown ? Math.round(rtl ? clearBox!.left - bar.left : bar.right - clearBox!.right) : null,
      clearShown,
      value: root.querySelector<HTMLInputElement>(".mtrl-search__input")!.value,
    };
  }, dir);

const input = (page: Page) => page.locator("#stage .mtrl-search__input");
const frame = (page: Page) => page.evaluate(() => new Promise(requestAnimationFrame));
// The clear button fades: wait until it is fully shown, or no longer shown,
// and read whatever is there after a second so a failure still measures.
const settle = async (page: Page, shown: boolean): Promise<void> => {
  await page.waitForFunction((shown) => {
    const host = document.querySelector("#stage m-search");
    const clear = (host?.shadowRoot ?? document).querySelector<HTMLElement>(".mtrl-search__clear-button");
    if (!clear) return true;
    const style = getComputedStyle(clear);
    const visible = style.display !== "none" && style.visibility === "visible";
    return shown ? visible && style.opacity === "1" : !visible;
  }, shown, { timeout: 1000 }).catch(() => undefined);
  await frame(page);
};

const rows: string[] = [];
const failures: string[] = [];
const expect = (id: string, actual: unknown, wanted: unknown, what: string) => {
  rows.push(`${id}: ${what} ${JSON.stringify(actual)}`);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) failures.push(`${id}: ${what} is ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
};

for (const [engine, launcher] of [["chromium", chromium], ["webkit", webkit]] as const) {
  const browser: Browser = await launcher.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 520, height: 400 }, reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(`<!doctype html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body style="margin:24px"></body></html>`);
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: js });

    for (const form of ["factory", "element"] as const) {
      for (const variant of ["contained", "divided"]) {
        for (const dir of ["ltr", "rtl"]) {
          const id = `${engine}/${form}/${variant}/${dir}`;
          // 1a. The default configuration, empty.
          await mount(page, form, variant, dir, {});
          await frame(page);
          const empty = await read(page, dir);
          expect(`${id}/default-empty`, [empty.end, empty.clearShown], [16, false], "end, clear shown");
          // 1b. Typed, then cleared with the clear button.
          await mount(page, form, variant, dir, { expandOnFocus: false, collapseOnBlur: false });
          await frame(page);
          const before = await read(page, dir);
          expect(`${id}/typed-sequence-empty`, [before.end, before.clearShown], [16, false], "end, clear shown");
          await input(page).click();
          await page.keyboard.type("Notes");
          await settle(page, true);
          const typed = await read(page, dir);
          expect(`${id}/typed`, [typed.value, typed.clearShown, typed.clear, typed.end], ["Notes", true, 4, 56], "value, clear shown, clear end, end");
          await page.locator("#stage .mtrl-search__clear-button").click();
          await settle(page, false);
          const cleared = await read(page, dir);
          expect(`${id}/cleared`, [cleared.value, cleared.end, cleared.clearShown], ["", 16, false], "value, end, clear shown");
          if (form === "factory") {
            // 2. The clear button off.
            await mount(page, form, variant, dir, { showClearButton: false });
            await frame(page);
            expect(`${id}/no-clear`, (await read(page, dir)).end, 16, "end");
            // 3. A trailing icon button.
            await mount(page, form, variant, dir, { trailingItems: [{ id: "settings", content: icon, ariaLabel: "Settings" }] });
            await frame(page);
            const trailing = await page.evaluate((dir) => {
              const bar = document.querySelector(".mtrl-search__container")!.getBoundingClientRect();
              const button = document.querySelector(".mtrl-search__trailing-icon")!.getBoundingClientRect();
              return Math.round(dir === "rtl" ? button.left - bar.left : bar.right - button.right);
            }, dir);
            expect(`${id}/trailing-icon`, trailing, 4, "trailing button end");
          }
        }
      }
    }
    assert.deepEqual(errors, [], `${engine}: page errors`);
  } finally {
    await browser.close();
  }
}

console.log(rows.join("\n"));
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`Search trailing space check passed (${rows.length} readings).`);
