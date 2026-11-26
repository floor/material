#!/usr/bin/env bun
// scripts/check-search-trailing-space.ts
// The space between the search bar's text and its end edge, with and without
// trailing actions.
//
//   bun run scripts/check-search-trailing-space.ts
//
// Compose Material 3 at the pinned androidx-main 08ec699d (SearchBarTokens.kt,
// tokens 41.1.19): ContainedNoActionsTrailingSpace = Space200 = 16dp, and
// ContainedTrailingSpace = Space50 = 4dp when the bar has a trailing action.
// Before this check the input wrapper ended 8px from the bar's end with no
// trailing action (the bar's 4px padding plus the wrapper's 4px margin).
//
// Each case mounts a 420px bar in light DOM, contained and divided, LTR and
// RTL, and measures from the input wrapper's end to the bar's end:
//
// 1. no clear button and no trailing items: 16px;
// 2. a trailing icon button: the button's 48px target ends 4px from the edge;
// 3. a visible clear button and no trailing items: the clear button ends 4px
//    from the edge.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { compileString } from "sass";
import { launchChromium } from "./browser-profile";

const repoRoot = resolve(import.meta.dir, "..");
const compile = (source: string): string =>
  compileString(`@use "${source}";`, { loadPaths: [resolve(repoRoot, "src/styles")], style: "expanded" }).css;
const css = [compile("themes/baseline"), compile("components/search")].join("\n");

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
        contents: `import createSearch from ${JSON.stringify(resolve(repoRoot, "src/components/search/index.ts"))};\nwindow.createSearch = createSearch;\n`,
        loader: "ts",
      }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();
assert(js.length > 0, "the search bundle is empty");

type Kind = "none" | "icon" | "clear";
interface Row { id: string; kind: Kind; end: number; control: number | null }

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 520, height: 400 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body style="margin:24px"></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });

  const rows: Row[] = await page.evaluate(() => {
    type Search = { element: HTMLElement; destroy: () => void };
    const create = (window as unknown as { createSearch: (config: object) => Search }).createSearch;
    const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
    const out: { id: string; kind: "none" | "icon" | "clear"; end: number; control: number | null }[] = [];
    for (const variant of ["contained", "divided"]) {
      for (const dir of ["ltr", "rtl"]) {
        for (const kind of ["none", "icon", "clear"] as const) {
          document.documentElement.dir = dir;
          const host = document.createElement("div");
          host.style.width = "420px";
          document.body.append(host);
          const search = create({
            variant, fullWidth: true, leadingIcon: icon, placeholder: "Search records",
            value: kind === "clear" ? "Notes" : "",
            showClearButton: kind === "clear",
            trailingItems: kind === "icon" ? [{ id: "settings", content: icon, ariaLabel: "Settings" }] : [],
          });
          host.append(search.element);
          const bar = search.element.querySelector(".mtrl-search__container")!.getBoundingClientRect();
          const wrap = search.element.querySelector(".mtrl-search__input-wrapper")!.getBoundingClientRect();
          const controlElement = search.element.querySelector(kind === "clear" ? ".mtrl-search__clear-button" : ".mtrl-search__trailing-icon");
          const c = kind === "none" ? null : controlElement!.getBoundingClientRect();
          const rtl = dir === "rtl";
          out.push({
            id: `${variant}/${dir}/${kind}`, kind,
            end: Math.round(rtl ? wrap.left - bar.left : bar.right - wrap.right),
            control: c ? Math.round(rtl ? c.left - bar.left : bar.right - c.right) : null,
          });
          search.destroy();
          host.remove();
        }
      }
    }
    return out;
  });

  console.log(JSON.stringify(rows));
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 12);
  for (const row of rows) {
    if (row.kind === "none") {
      assert.equal(row.end, 16, `${row.id}: no trailing action leaves 16dp at the end (ContainedNoActionsTrailingSpace), measured ${row.end}px`);
    } else {
      assert.equal(row.control, 4, `${row.id}: the trailing control ends 4dp from the edge (ContainedTrailingSpace), measured ${row.control}px`);
    }
  }
  console.log("Search trailing space check passed.");
} finally {
  await browser.close();
}
