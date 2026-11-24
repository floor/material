#!/usr/bin/env bun
/**
 * Every hand-written theme declares the shadow and scrim color roles, and
 * the effects built from them really paint.
 *
 * m3.material.io/styles/color/roles (read 2026-11-24): shadow and scrim are
 * color roles of the scheme. A theme that omits them leaves every
 * box-shadow and every scrim background (also inside color-mix()) invalid
 * at computed-value time, so elevation disappears and modal surfaces do not
 * dim. The generated themes carry both; the hand-written ones drifted.
 *
 *   bun run scripts/check-theme-roles.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { launchChromium } from "./browser-profile";
import * as sass from "sass";

const repoRoot = resolve(import.meta.dir, "..");
const compile = (source: string): string =>
  sass.compileString(`@use "${source}";`, { loadPaths: [resolve(repoRoot, "src/styles")], style: "compressed", logger: sass.Logger.silent }).css;

const themeCss = [
  compile("themes/baseline"),
  compile("themes/ocean"),
  compile("themes/forest"),
  compile("themes/spring"),
  compile("themes/sunset"),
  compile("themes/autumn"),
  compile("themes/desert"),
  compile("components/dialog"),
].join("\n");

const entrySource = `
import { createDialog } from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
window.api = { createDialog };
window.ready = true;
`;
const bundle = await Bun.build({
  entrypoints: ["theme-roles-entry.ts"],
  target: "browser",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^theme-roles-entry\.ts$/ }, () => ({ path: resolve(repoRoot, "theme-roles-entry.ts") }));
      build.onLoad({ filter: /theme-roles-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));

const bundleJs = await bundle.outputs[0]!.text();
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/bundle.js") return new Response(bundleJs, { headers: { "Content-Type": "text/javascript" } });
    return new Response(`<!doctype html><html data-theme="baseline"><head><meta charset="utf-8"><style id="themes">${themeCss}</style></head><body></body></html>`, { headers: { "Content-Type": "text/html" } });
  },
});

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 900, height: 700 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.addScriptTag({ content: await bundle.outputs[0]!.text() });
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);

  const themes = ["ocean", "forest", "spring", "sunset", "autumn", "desert"] as const;
  for (const mode of ["light", "dark"] as const) {
    for (const theme of themes) {
      const state = await page.evaluate(({ theme, mode }) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.themeMode = mode;
        const rootStyle = getComputedStyle(document.documentElement);
        const dialog = (window as unknown as { api: { createDialog: (c?: object) => { element: HTMLElement; open: () => void; destroy: () => void } } }).api.createDialog({ headline: "Roles" });
        document.body.append(dialog.element);
        dialog.open();
        const scrim = dialog.element.querySelector(".mtrl-dialog__scrim") as HTMLElement | null;
        const scrimColor = scrim ? getComputedStyle(scrim).backgroundColor : "missing";
        dialog.destroy();
        return {
          shadow: rootStyle.getPropertyValue("--mtrl-sys-color-shadow").trim(),
          scrim: rootStyle.getPropertyValue("--mtrl-sys-color-scrim").trim(),
          scrimColor,
        };
      }, { theme, mode });
      const label = `${theme}/${mode}`;
      assert.equal(state.shadow, "#000000", `${label}: --mtrl-sys-color-shadow is "${state.shadow}"`);
      assert.equal(state.scrim, "#000000", `${label}: --mtrl-sys-color-scrim is "${state.scrim}"`);
      assert.ok(!/rgba\(0, 0, 0, 0\)|transparent|^none$/.test(state.scrimColor), `${label}: the open dialog's scrim paints (${state.scrimColor})`);
    }
  }
  assert.deepEqual(errors, [], "no page errors");
  console.log("theme roles: shadow and scrim declared and painting in all six themes, light and dark");
} finally {
  await browser.close();
  server.stop(true);
}
