#!/usr/bin/env bun
/**
 * The framework adapters tree-shake (FLO-327): importing one component from
 * `mtrl/react`, `mtrl/vue`, `mtrl/solid` or `mtrl/svelte` ships that
 * component's element and CSS, and the adapter's runtime, not the library.
 *
 * Measured on the packed package, installed the way an app installs it, so
 * the published `sideEffects` list is what the bundler reads. The framework
 * is external. Budget: a component's adapter import is within ADAPTER_MARGIN
 * of its element's import (`define*` from `mtrl/elements` and its CSS
 * modules), and two components ship only those two. Every component with Bun;
 * the switch and the pair with Vite (Rolldown) too.
 *
 * Build first:
 *   bun run build && bun run adapters:size
 */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { BunPlugin } from "bun";
import { compile } from "svelte/compiler";
import { build as viteBuild, type Plugin, type Rolldown } from "vite";

import { createPackageFixture } from "./package-fixture";
import { elementModules } from "./element-modules";

/** The adapter's own runtime (create.ts or runtime.js) and wrapper, gzip bytes, on top of the element. */
const ADAPTER_MARGIN = 2048;

/**
 * Named exceptions, each with its issue; every other component keeps the
 * general margin. Select costs ~800 B more than the others in every adapter,
 * and its Svelte import measured +2193 after FLO-325 (FLO-332).
 */
const MARGINS: Record<string, number> = { select: 2304 };

const pascal = (name: string): string => name.replace(/^[a-z]/, (c) => c.toUpperCase());
const FRAMEWORKS = [
  { dir: "react", component: pascal },
  { dir: "vue", component: (name: string) => `M${pascal(name)}` },
  { dir: "solid", component: pascal },
  { dir: "svelte", component: pascal },
] as const;
const EXTERNAL = /^(react|react-dom|vue|solid-js|svelte)(\/|$)/;

const svelteForBun: BunPlugin = {
  name: "svelte",
  setup(build) {
    build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
      contents: compile(await Bun.file(path).text(), { filename: path, generate: "client" }).js.code,
      loader: "js",
    }));
  },
};
const svelteForVite: Plugin = {
  name: "svelte",
  transform(code, id) {
    if (id.endsWith(".svelte")) return compile(code, { filename: id, generate: "client" }).js.code;
  },
};

const gzip = (code: string): number => gzipSync(code, { level: 9 }).length;

const fixture = await createPackageFixture();
const { directory } = fixture;
let entries = 0;

/** Writes an entry that keeps `names` alive, returning its path. */
const entry = async (code: string): Promise<string> => {
  const path = join(directory, `entry-${entries++}.js`);
  await writeFile(path, code);
  return path;
};

const withBun = async (code: string): Promise<number> => {
  const result = await Bun.build({
    entrypoints: [await entry(code)], minify: true, target: "browser", plugins: [svelteForBun],
    external: ["react", "react/*", "react-dom", "react-dom/*", "vue", "solid-js", "solid-js/*", "svelte", "svelte/*"],
  });
  assert(result.success, result.logs.map(String).join("\n"));
  return gzip((await Promise.all(result.outputs.filter((o) => o.kind === "entry-point").map((o) => o.text()))).join(""));
};

const withVite = async (code: string): Promise<number> => {
  const output = (await viteBuild({
    root: directory, logLevel: "silent", configFile: false, plugins: [svelteForVite],
    build: { write: false, minify: true, rollupOptions: { input: await entry(code), external: (id: string) => EXTERNAL.test(id) } },
  })) as Rolldown.RolldownOutput | Rolldown.RolldownOutput[];
  const chunks = (Array.isArray(output) ? output : [output]).flatMap((o) => o.output).filter((o) => o.type === "chunk");
  return gzip(chunks.map((chunk) => (chunk as Rolldown.OutputChunk).code).join(""));
};

const elementImport = (names: string[]): string => {
  const picked = elementModules.filter((element) => names.includes(element.name));
  const styles = [...new Set(picked.flatMap((element) => element.styles))];
  const defines = picked.map((element) => `define${pascal(element.name)}`);
  return `${styles.map((style) => `import "mtrl/elements/css/${style}";`).join("\n")}
import { ${defines.join(", ")} } from "mtrl/elements";
console.log(${defines.join(", ")});`;
};

const adapterImport = (framework: (typeof FRAMEWORKS)[number], names: string[]): string => {
  const components = names.map(framework.component);
  return `import { ${components.join(", ")} } from "mtrl/${framework.dir}";
console.log(${components.join(", ")});`;
};

const failures: string[] = [];
const verify = (label: string, adapter: number, element: number, margin = ADAPTER_MARGIN): string => {
  const over = adapter - element;
  if (over > margin) failures.push(`${label}: ${adapter} B gzip, ${over} B over the element's ${element} B (margin ${margin})`);
  return `${String(adapter).padStart(8)} ${`${over >= 0 ? "+" : ""}${over}`.padStart(7)}`;
};

try {
  console.log(`\n${"component".padEnd(20)}${"element".padStart(9)}${FRAMEWORKS.map((f) => f.dir.padStart(16)).join("")}   (gzip B, and over the element)`);
  for (const { name } of elementModules) {
    const element = await withBun(elementImport([name]));
    const cells: string[] = [];
    for (const framework of FRAMEWORKS) {
      cells.push(verify(`${framework.dir} ${name} (Bun)`, await withBun(adapterImport(framework, [name])), element, MARGINS[name]));
    }
    console.log(`${name.padEnd(20)}${String(element).padStart(9)}${cells.join("")}`);
  }

  const pair = ["switch", "button"];
  const pairElement = await withBun(elementImport(pair));
  const pairCells = [];
  for (const framework of FRAMEWORKS) pairCells.push(verify(`${framework.dir} ${pair.join(" + ")} (Bun)`, await withBun(adapterImport(framework, pair)), pairElement));
  console.log(`${pair.join(" + ").padEnd(20)}${String(pairElement).padStart(9)}${pairCells.join("")}`);

  for (const names of [["switch"], pair]) {
    const element = await withVite(elementImport(names));
    const cells = [];
    for (const framework of FRAMEWORKS) cells.push(verify(`${framework.dir} ${names.join(" + ")} (Vite)`, await withVite(adapterImport(framework, names)), element));
    console.log(`${`${names.join(" + ")} (Vite)`.padEnd(20)}${String(element).padStart(9)}${cells.join("")}`);
  }
} finally {
  await fixture.cleanup();
}

if (failures.length) {
  console.error(`\n${failures.length} adapter import(s) over budget:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nadapters: every component's import is within ${ADAPTER_MARGIN} B gzip of its element's (${Object.entries(MARGINS).map(([name, margin]) => `${name} ${margin}`).join(", ")} by exception)`);
