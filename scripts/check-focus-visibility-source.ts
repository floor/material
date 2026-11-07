/** Source runner for red/green measurements without a package build. CI also exercises the packed elements. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";
import { componentStyles } from "./style-manifest";
import { checkFocusVisibility } from "./check-focus-visibility";

const sourceRoot = resolve(process.argv[2] ?? ".");
const compile = (source: string) => sass.compileString(`@use "${source}";`, { loadPaths: [resolve(sourceRoot, "src/styles")], style: "compressed", logger: sass.Logger.silent }).css;
const css = compile("main");
const registry = Object.fromEntries(Object.entries(componentStyles).map(([name, entry]) => [name, compile(entry.source)]));
registry.ripple = compile("utilities/ripple");
const source = `import * as mtrl from ${JSON.stringify(resolve(sourceRoot, "src/index.ts"))};
import { defineAll } from ${JSON.stringify(resolve(sourceRoot, "src/elements/index.ts"))};
import { registerStyles } from ${JSON.stringify(resolve(sourceRoot, "src/elements/styles.ts"))};
registerStyles(${JSON.stringify(registry)}); defineAll(); window.mtrl=mtrl; window.ready=true;`;
const bundle = await Bun.build({ entrypoints: ["focus-entry"], target: "browser", plugins: [{ name: "focus-entry", setup(build) {
  build.onResolve({ filter: /^focus-entry$/ }, () => ({ path: "focus-entry", namespace: "focus" }));
  build.onLoad({ filter: /.*/, namespace: "focus" }, () => ({ contents: source, loader: "ts", resolveDir: process.cwd() }));
} }] });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  return new URL(request.url).pathname === "/entry.js" ? new Response(js, { headers: { "Content-Type": "text/javascript" } })
    : new Response(`<!doctype html><html data-theme="baseline"><head><style>${css}</style></head><body><main id="host"></main><script type="module" src="/entry.js"></script></body></html>`, { headers: { "Content-Type": "text/html" } });
} });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", error => console.error(error));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready: boolean }).ready);
  await checkFocusVisibility(page);
} finally {
  await browser.close(); server.stop(true);
}
