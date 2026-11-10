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
  // types, then workerd, then worker, then browser. Export-object order is the match order.
  // A consumer that sets worker gets the server entry even when browser is also set.
  const ssrExport = (file: string) => ({
    types: `./dist/ssr/${file}.d.ts`,
    workerd: `./dist/ssr/${file}.js`,
    worker: `./dist/ssr/${file}.js`,
    browser: "./dist/ssr/browser.js",
    node: `./dist/ssr/${file}.js`,
    default: `./dist/ssr/${file}.js`,
  });
  const ssrPaths: Record<string, string> = {
    "./ssr": "index",
    "./ssr/react": "react",
    "./ssr/svelte": "svelte",
    "./ssr/vue": "vue",
    "./ssr/solid": "solid",
  };
  for (const [key, file] of Object.entries(ssrPaths)) {
    assert.deepEqual(manifest.exports[key], ssrExport(file), key);
    assert.deepEqual(Object.keys(manifest.exports[key]), ["types", "workerd", "worker", "browser", "node", "default"], key);
  }
  const files = pack.files.filter((file: { path: string }) => file.path.startsWith("dist/ssr/"));
  assert.deepEqual(files.map((file: { path: string }) => file.path).sort(), [
    "dist/ssr/browser.js", "dist/ssr/index.d.ts", "dist/ssr/index.js", "dist/ssr/react.d.ts", "dist/ssr/react.js",
    "dist/ssr/solid.d.ts", "dist/ssr/solid.js", "dist/ssr/svelte.d.ts", "dist/ssr/svelte.js", "dist/ssr/vue.d.ts", "dist/ssr/vue.js",
  ]);
  console.log("Packed SSR files:");
  console.table(files);
  assert.match(await Bun.file(join(installed, "dist/ssr/index.js")).text(), /Bundled dependency notices\n[\s\S]*linkedom@/);

  const smoke = join(directory, "server.mjs");
  await writeFile(smoke, String.raw`
    import assert from 'node:assert/strict';
    import * as ssr from 'material/ssr';
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
  // workerd or worker is listed before browser, so either one wins over browser.
  // Node still has its own node condition; the added conditions are what an edge bundler sets.
  for (const condition of ["workerd", "worker"]) {
    console.log(`${condition}+browser: ${(await run(["node", `--conditions=${condition}`, "--conditions=browser", smoke], directory)).trim()}`);
  }

  const resolveSmoke = join(directory, "resolve.mjs");
  await writeFile(resolveSmoke, String.raw`
    import assert from 'node:assert/strict';
    import { fileURLToPath } from 'node:url';
    const mode = process.argv[2];
    const specs = {
      'material/ssr': 'index.js',
      'material/ssr/react': 'react.js',
      'material/ssr/svelte': 'svelte.js',
      'material/ssr/vue': 'vue.js',
      'material/ssr/solid': 'solid.js',
    };
    for (const [spec, file] of Object.entries(specs)) {
      const resolved = fileURLToPath(import.meta.resolve(spec));
      const expected = mode === 'browser' ? 'browser.js' : file;
      assert.ok(resolved.endsWith('/dist/ssr/' + expected), spec + ' -> ' + resolved);
      if (mode === 'browser') {
        const module = await import(spec);
        assert.throws(() => module.renderElement('m-button'), { message: 'material/ssr is server-only' });
      }
    }
    console.log(mode);
  `);
  const resolverRows: Array<{ conditions: string[]; mode: string }> = [
    { conditions: [], mode: "server" },
    { conditions: ["browser", "node"], mode: "browser" },
    { conditions: ["workerd", "browser"], mode: "server" },
    { conditions: ["worker", "browser"], mode: "server" },
    { conditions: ["not-a-real-runtime"], mode: "server" },
  ];
  for (const runtime of ["node", "bun"]) for (const row of resolverRows) {
    await run([runtime, ...row.conditions.map(condition => `--conditions=${condition}`), resolveSmoke, row.mode], directory);
    console.log(`${runtime}: all five SSR paths resolve under [${row.conditions.join(", ") || "ordinary"}]`);
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
    import { renderElement, type RenderAttributes, type RenderOptions } from 'material/ssr';
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
    for (const row of resolverRows) for (const [key, file] of Object.entries(ssrPaths)) {
      const resolution = ts.resolveModuleName("material" + key.slice(1), types, {
        module: mode === "NodeNext" ? ts.ModuleKind.NodeNext : ts.ModuleKind.ESNext,
        moduleResolution: mode === "NodeNext" ? ts.ModuleResolutionKind.NodeNext : ts.ModuleResolutionKind.Bundler,
        customConditions: row.conditions,
      }, ts.sys, undefined, undefined, ts.ModuleKind.ESNext).resolvedModule;
      assert.equal(resolution?.resolvedFileName, join(installed, "dist/ssr", file + ".d.ts"), `${mode} ${key} [${row.conditions}]`);
    }
    console.log(`${mode}: all five SSR declarations resolve under all five condition sets`);
  }

  const browserSmoke = join(directory, "browser.mjs");
  await writeFile(browserSmoke, `
    import assert from 'node:assert/strict';
    import { renderElement } from 'material/ssr';
    assert.throws(() => renderElement('m-button'), { message: 'material/ssr is server-only' });
  `);
  // browser is listed before node, so browser wins when both are set.
  await run(["node", "--conditions=browser", "--conditions=node", browserSmoke], directory);

  for (const [name, code, specifier] of [
    ["side-effect", 'import "material/ssr"; console.log("browser import is safe");', "material/ssr"],
    ["react-side-effect", 'import "material/ssr/react"; console.log("browser import is safe");', "material/ssr/react"],
    ["solid-side-effect", 'import "material/ssr/solid"; console.log("browser import is safe");', "material/ssr/solid"],
    ["svelte-side-effect", 'import "material/ssr/svelte"; console.log("browser import is safe");', "material/ssr/svelte"],
    ["vue-side-effect", 'import "material/ssr/vue"; console.log("browser import is safe");', "material/ssr/vue"],
    ["call", 'import { renderElement } from "material/ssr"; export { renderElement };', "material/ssr"],
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
      assert.match(output, /material\/ssr is server-only/);
      const stub = await import(path + `?check=${Date.now()}`);
      assert.throws(() => stub.renderElement("m-button"), { message: "material/ssr is server-only" });
    }
    console.log(`Vite ${name}: ${specifier} -> ${resolved}; ${Buffer.byteLength(output)} bytes, no linkedom`);
  }

  // Framework peers stay external. This check does not install them.
  const frameworkPeers = ["react", "react-dom", "vue", "svelte", "solid-js"];
  const externalFrameworkPeers = /^(?:react|react-dom|vue|svelte|solid-js)(?:\/.*)?$/;
  const bundleSsr = async (
    name: string,
    code: string,
    expected: Record<string, string>,
    conditions: string[] | undefined,
  ): Promise<string> => {
    const entry = join(directory, `${name}.mjs`);
    await writeFile(entry, code);
    const resolved = new Map<string, string>();
    const loaded = new Set<string>();
    const result = await build({
      root: directory, configFile: false, envFile: false, logLevel: "error",
      plugins: [{
        name: "assert-ssr-condition",
        enforce: "pre",
        async resolveId(id, importer, options: { ssr?: boolean }) {
          if (!(id in expected) || !options?.ssr) return;
          const resolution = await this.resolve(id, importer, { skipSelf: true });
          assert(resolution, `${name} ${id}`);
          resolved.set(id, resolution.id);
          assert.equal(resolution.id, join(installed, "dist/ssr", expected[id]), `${name} ${id}`);
          return resolution;
        },
        load(id) { loaded.add(id); },
      }],
      ssr: {
        target: "webworker",
        noExternal: ["material"],
        external: frameworkPeers,
        ...(conditions ? { resolve: { conditions } } : {}),
      },
      build: { ssr: entry, write: false, minify: false, rollupOptions: { external: externalFrameworkPeers } },
    });
    assert(!("on" in result));
    const chunks = (Array.isArray(result) ? result : [result]).flatMap(item => item.output)
      .filter(output => output.type === "chunk");
    assert.equal(resolved.size, Object.keys(expected).length, `${name} resolved ${resolved.size}`);
    for (const path of resolved.values()) assert(loaded.has(path), `${name}: actually loaded ${path}`);
    return chunks.map(chunk => chunk.code).join("\n");
  };

  const allEntries = Object.fromEntries(Object.entries(ssrPaths).map(([key, file]) => ["material" + key.slice(1), file + ".js"]));
  const allImports = Object.keys(allEntries).map(specifier => `import ${JSON.stringify(specifier)};`).join("\n");

  // Webworker defaults include browser and not workerd/worker, so the stub still wins
  // until the consumer sets those conditions on ssr.resolve.conditions.
  const stubBundle = await bundleSsr(
    "webworker-default",
    allImports + '\nexport { renderElement } from "material/ssr";',
    Object.fromEntries(Object.keys(allEntries).map(specifier => [specifier, "browser.js"])),
    undefined,
  );
  assert.match(stubBundle, /material\/ssr is server-only/);
  assert.doesNotMatch(stubBundle, /linkedom/);

  const renderEntry = String.raw`
    import { renderElement } from 'material/ssr';
    const html = renderElement('m-button', { variant: 'filled' }, 'Save');
    if (!html.includes('<template shadowrootmode="open"')) throw new Error('no declarative root');
    if (!html.includes('Save')) throw new Error('no label');
    console.log(html);
  `;
  const workerBundle = await bundleSsr(
    "workerd-worker",
    renderEntry,
    { "material/ssr": "index.js" },
    ["workerd", "worker", "browser"],
  );
  assert.doesNotMatch(workerBundle, /material\/ssr is server-only/);
  assert.match(workerBundle, /linkedom|shadowrootmode/);
  const workerOut = join(artifacts, "workerd-worker.mjs");
  await writeFile(workerOut, workerBundle);
  const rendered = (await run(["node", workerOut])).trim();
  assert.match(rendered, /<template shadowrootmode="open"/);
  assert.match(rendered, /Save/);
  console.log(`Vite workerd+worker resolver bundle: Node control rendered ${rendered.length} chars; ssr-worker:check owns real workerd execution`);

  const adapterBundle = await bundleSsr(
    "workerd-adapters",
    [
      'import "material/ssr/react";',
      'import "material/ssr/svelte";',
      'import "material/ssr/vue";',
      'import "material/ssr/solid";',
    ].join("\n"),
    {
      "material/ssr/react": "react.js",
      "material/ssr/svelte": "svelte.js",
      "material/ssr/vue": "vue.js",
      "material/ssr/solid": "solid.js",
    },
    ["workerd", "worker", "browser"],
  );
  assert.doesNotMatch(adapterBundle, /material\/ssr is server-only/);
  assert.doesNotMatch(adapterBundle, /__vite-optional-peer-dep:/);
  for (const peer of ["react-dom/server", "svelte/server", "vue/server-renderer", "solid-js/web"]) {
    assert.match(adapterBundle, new RegExp(peer), `adapterBundle retains external ${peer}`);
  }

  // An unknown condition falls through to default, which is the server entry.
  for (const condition of ["workerd", "worker", "not-a-real-runtime"]) {
    const fallbackBundle = await bundleSsr(
      `matrix-${condition}`, allImports, allEntries,
      condition === "not-a-real-runtime" ? [condition] : [condition, "browser"],
    );
    assert.doesNotMatch(fallbackBundle, /material\/ssr is server-only/);
    assert.match(fallbackBundle, /linkedom|shadowrootmode/);
  }
  console.log("ssr-consumer: packed Node/Bun rendering, declarations, browser isolation and worker conditions passed");
} finally {
  await fixture.cleanup();
}
