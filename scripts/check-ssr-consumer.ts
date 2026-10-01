#!/usr/bin/env bun
// scripts/check-ssr-consumer.ts
/** Build first. Exercise only the installed tarball, without runtime dependencies. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "vite";
import ts from "typescript";
import { createPackageFixture, run } from "./package-fixture";

const fixture = await createPackageFixture();
const { directory, installed, pack } = fixture;
const artifacts = resolve("analysis/ssr-consumer");
await mkdir(artifacts, { recursive: true });
try {
  const manifest = await Bun.file(join(installed, "package.json")).json();
  assert.deepEqual(Object.keys(manifest.dependencies ?? {}), [], "No runtime dependencies");
  assert.deepEqual(manifest.exports["./ssr"], {
    types: "./dist/ssr/index.d.ts",
    browser: "./dist/ssr/browser.js",
    node: "./dist/ssr/index.js",
    default: "./dist/ssr/index.js",
  });
  assert.deepEqual(Object.keys(manifest.exports["./ssr"]), ["types", "browser", "node", "default"]);
  const files = pack.files.filter((file: { path: string }) => file.path.startsWith("dist/ssr/"));
  assert.deepEqual(files.map((file: { path: string }) => file.path).sort(), [
    "dist/ssr/browser.js", "dist/ssr/index.d.ts", "dist/ssr/index.js", "dist/ssr/react.d.ts", "dist/ssr/react.js",
    "dist/ssr/svelte.d.ts", "dist/ssr/svelte.js", "dist/ssr/vue.d.ts", "dist/ssr/vue.js",
  ]);
  console.log("Packed SSR files:");
  console.table(files);
  assert.match(await Bun.file(join(installed, "dist/ssr/index.js")).text(), /Bundled dependency notices\n[\s\S]*linkedom@/);

  const smoke = join(directory, "server.mjs");
  await writeFile(smoke, String.raw`
    import assert from 'node:assert/strict';
    import * as ssr from 'mtrl/ssr';
    assert.deepEqual(Object.keys(ssr), ['renderElement']);
    const html = ssr.renderElement('m-button', { variant: 'filled' }, 'Save');
    assert.match(html, /<template shadowrootmode="open"/);
    assert.match(html, /<style>[^<]+<\/style>/);
    assert.match(html, /\.mtrl-button/);
    assert.match(html, /Save/);
    console.log(html.slice(0, 300));
  `);
  for (const runtime of ["node", "bun"]) {
    const version = (await run([runtime, "--version"])).trim();
    if (runtime === "node") assert.match(version, /^v22\./, "Run with Node 22, as in CI");
    console.log(`${runtime} ${version}: ${(await run([runtime, smoke], directory)).trim()}`);
  }

  // The declaration is self-contained, with exactly the three public names.
  const declaration = join(installed, "dist/ssr/index.d.ts");
  const program = ts.createProgram([declaration], { strict: true, noEmit: true, types: [], lib: ["lib.es2022.d.ts"] });
  const source = program.getSourceFile(declaration)!;
  const checker = program.getTypeChecker();
  assert.deepEqual(checker.getExportsOfModule(checker.getSymbolAtLocation(source)!).map(s => s.name).sort(),
    ["RenderAttributes", "RenderOptions", "renderElement"]);
  assert.equal(ts.getPreEmitDiagnostics(program).length, 0, "SSR declarations must work without DOM or linkedom types");
  const types = join(directory, "types.ts");
  await writeFile(types, `
    import { renderElement, type RenderAttributes, type RenderOptions } from 'mtrl/ssr';
    const attributes: RenderAttributes = { variant: 'filled' };
    const options: RenderOptions = { styles: 'inline' };
    const html: string = renderElement('m-button', attributes, 'Save', options);
    void html;
    // @ts-expect-error link mode requires cssBase
    renderElement('m-button', {}, '', { styles: 'link' });
  `);
  for (const mode of ["NodeNext", "Bundler"]) {
    console.log(await run(["node", resolve("node_modules/typescript/bin/tsc"), types, "--noEmit", "--strict",
      "--module", mode === "NodeNext" ? mode : "ESNext", "--moduleResolution", mode,
      "--target", "ES2022", "--lib", "ES2022", "--typeRoots", join(directory, "empty-types")]));
  }

  const browserSmoke = join(directory, "browser.mjs");
  await writeFile(browserSmoke, `
    import assert from 'node:assert/strict';
    import { renderElement } from 'mtrl/ssr';
    assert.throws(() => renderElement('m-button'), { message: 'mtrl/ssr is server-only' });
  `);
  // Both browser and node conditions are active here: browser must win.
  await run(["node", "--conditions=browser", browserSmoke], directory);

  for (const [name, code, specifier] of [
    ["side-effect", 'import "mtrl/ssr"; console.log("browser import is safe");', "mtrl/ssr"],
    ["react-side-effect", 'import "mtrl/ssr/react"; console.log("browser import is safe");', "mtrl/ssr/react"],
    ["svelte-side-effect", 'import "mtrl/ssr/svelte"; console.log("browser import is safe");', "mtrl/ssr/svelte"],
    ["vue-side-effect", 'import "mtrl/ssr/vue"; console.log("browser import is safe");', "mtrl/ssr/vue"],
    ["call", 'import { renderElement } from "mtrl/ssr"; export { renderElement };', "mtrl/ssr"],
  ]) {
    const entry = join(directory, `${name}.js`);
    await writeFile(entry, code);
    const loaded = new Set<string>();
    let resolved = "";
    const result = await build({
      root: directory, configFile: false, envFile: false, logLevel: "error",
      plugins: [{
        name: "assert-ssr-boundary",
        enforce: "pre",
        async resolveId(id, importer) {
          if (id !== specifier) return;
          const resolution = await this.resolve(id, importer, { skipSelf: true });
          assert(resolution);
          resolved = resolution.id;
          assert.equal(resolved, join(installed, "dist/ssr/browser.js"));
          return resolution;
        },
        load(id) {
          loaded.add(id);
          assert(!/linkedom|\/ssr\/(?!browser\.js)/.test(id), `Server module reached Vite: ${id}`);
        },
      }],
      build: { write: false, minify: true, lib: { entry, formats: ["es"] } },
    });
    assert(!("on" in result));
    const chunks = (Array.isArray(result) ? result : [result]).flatMap(result => result.output)
      .filter(output => output.type === "chunk");
    const output = chunks.map(chunk => chunk.code).join("\n");
    assert(resolved, "Vite must actually resolve the stub");
    if (name === "call") assert(loaded.has(resolved), "Vite must load the called stub");
    assert.doesNotMatch(output, /linkedom|DOMParser|shadowrootdelegatesfocus|SSR element nesting/);
    const path = join(artifacts, `${name}.js`);
    await writeFile(path, output);
    if (name === "call") {
      assert.match(output, /mtrl\/ssr is server-only/);
      const stub = await import(path + `?check=${Date.now()}`);
      assert.throws(() => stub.renderElement("m-button"), { message: "mtrl/ssr is server-only" });
    }
    console.log(`Vite ${name}: ${specifier} -> ${resolved}; ${Buffer.byteLength(output)} bytes, no linkedom`);
  }
  console.log("ssr-consumer: packed Node/Bun rendering, declarations and browser isolation passed");
} finally {
  await fixture.cleanup();
}
