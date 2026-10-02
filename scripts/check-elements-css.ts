#!/usr/bin/env bun
// scripts/check-elements-css.ts
/** Build first. Verify the CSS assets used by server-rendered element links. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import { elements } from "../src/elements";
import { hostStyleText } from "../src/elements/define";
import { cascadeLayerOrder } from "./build-styles";
import { resolveStyleDependencies } from "./style-manifest";

const dir = "dist/elements/css";
const names = ["ripple", ...resolveStyleDependencies(Object.values(elements).flatMap(element => [...element.spec.styles]))];
const files = await readdir(dir);
assert.deepEqual(
  files.filter(file => file.endsWith(".js") && file !== "index.js").sort(),
  names.map(name => `${name}.js`).sort(),
  "Every element style and dependency must have a JS module",
);

for (const name of names) {
  const js = await readFile(join(dir, `${name}.js`), "utf8");
  const css = await readFile(join(dir, `${name}.css`), "utf8");
  assert(css.length > 0, `${name}.css is empty`);
  assert(
    js.includes(`registerStyles({ ${JSON.stringify(name)}: ${JSON.stringify(css)} });`),
    `${name}.css differs from the registered CSS string`,
  );
  assert(!js.includes("registerPreupgrade"), `${name} still registers pre-upgrade rules`);
  assert.equal(
    import.meta.resolve(`mtrl/elements/css/${name}.css`),
    pathToFileURL(resolve(dir, `${name}.css`)).href,
    `${name}.css export must resolve to the CSS file`,
  );
  assert.equal(
    import.meta.resolve(`mtrl/elements/css/${name}`),
    pathToFileURL(resolve(dir, `${name}.js`)).href,
    `${name} must keep resolving to the JS registration module`,
  );
}

for (const { spec } of Object.values(elements)) {
  const file = join(dir, "hosts", `${spec.name}.css`);
  assert.equal(
    await readFile(file, "utf8"),
    hostStyleText(spec),
    `${spec.name} host CSS differs from the browser's registered string`,
  );
  assert.equal(
    import.meta.resolve(`mtrl/elements/css/hosts/${spec.name}.css`),
    pathToFileURL(resolve(file)).href,
    `${spec.name} host export must resolve to the CSS file`,
  );
}

const specs = Object.values(elements).map(element => element.spec.name);
const inner = (sheet: string): string => {
  const marker = "@layer mtrl.preupgrade{";
  const start = sheet.indexOf(marker);
  assert(start > -1 && sheet.endsWith("}\n"), "A pre-upgrade file is not one mtrl.preupgrade layer");
  return sheet.slice(start + marker.length, -2);
};
const pieces: string[] = [];
for (const name of specs) {
  const file = join("dist/elements/preupgrade", `${name}.css`);
  const sheet = await readFile(file, "utf8");
  assert(sheet.includes("@layer mtrl.preupgrade{"), `${name} is not wrapped in the pre-upgrade layer`);
  assert(!sheet.includes("registerPreupgrade"), `${name} file is a script`);
  pieces.push(inner(sheet));
  assert.equal(
    import.meta.resolve(`mtrl/elements/preupgrade/${name}.css`),
    pathToFileURL(resolve(file)).href,
    `${name} pre-upgrade export must resolve to its CSS file`,
  );
}
const whole = await readFile("dist/elements/preupgrade.css", "utf8");
assert.equal(pieces.join(""), inner(whole), "Per-element rules differ from preupgrade.css");
const order = cascadeLayerOrder();
const base = await readFile("dist/styles/base.css", "utf8");
assert(base.includes(order), "base.css does not declare the shared layer order");
assert(order.startsWith("@layer mtrl.preupgrade,mtrl.base,"), "pre-upgrade is not first in the layer order");
const button = await readFile("dist/elements/preupgrade/button.css", "utf8");
assert(!button.includes("@layer mtrl.preupgrade,mtrl.base"), "a per-element file redeclares the layer order");
assert.equal(
  import.meta.resolve("mtrl/elements/preupgrade.css"),
  pathToFileURL(resolve("dist/elements/preupgrade.css")).href,
);
assert.equal(
  import.meta.resolve("mtrl/elements/preupgrade"),
  pathToFileURL(resolve("dist/elements/preupgrade.js")).href,
);

// The consumer check bundles with Vite. A dev-server resolve of the JS entry
// rewrites it through the dependency optimizer, so this uses the SSR resolver,
// which reads the export map the production build reads.
const consumer = mkdtempSync(join(tmpdir(), "mtrl-preupgrade-"));
mkdirSync(join(consumer, "node_modules"));
symlinkSync(resolve("."), join(consumer, "node_modules/mtrl"));
writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "app", private: true }));
writeFileSync(join(consumer, "app.js"), "");
const server = await createServer({
  root: consumer, configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
});
try {
  const importer = join(consumer, "app.js");
  const specifiers = [
    ["mtrl/elements/preupgrade/button.css", "dist/elements/preupgrade/button.css"],
    ["mtrl/elements/preupgrade.css", "dist/elements/preupgrade.css"],
    ["mtrl/elements/preupgrade", "dist/elements/preupgrade.js"],
  ] as const;
  for (const [specifier, target] of specifiers) {
    const resolved = await server.pluginContainer.resolveId(specifier, importer, { ssr: true });
    assert.equal(realpathSync(resolved?.id ?? ""), realpathSync(resolve(target)), specifier);
  }
} finally {
  await server.close();
}

console.log(`elements-css:check: ${names.length} CSS modules, ${specs.length} host files and ${specs.length} pre-upgrade files; Node and Vite exports resolve`);
