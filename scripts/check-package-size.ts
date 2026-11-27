#!/usr/bin/env bun
/** Build first. Measure actual packed consumers, not source-only imports. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, basename, dirname } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import { createPackageFixture, run } from "./package-fixture";
import { internalIdRefs } from "./internal-ids";
import { measureConsumerSizes, measureSlider } from "./size-fixtures";
import { NON_COMPONENT_ENTRIES } from "./component-exports";
import type { SizeRow } from "./size-policy";

const fixture = await createPackageFixture();
const { directory: temporary, pack } = fixture;

// The packed size depends on the packer: npm's gzip differs between Node and npm
// versions (#325: one dist packed to 998,498 B under Node 26 / npm 11 and to
// 1,000,150 B under CI's Node 22 / npm 10). CI's figure is the one that counts.
const CI_NODE_MAJOR = 22;
const versionOf = (command: string): string => Bun.spawnSync([command, "--version"]).stdout.toString().trim();
const packer = { node: versionOf("node"), npm: versionOf("npm") };
if (Number(packer.node.replace(/^v/, "").split(".")[0]) !== CI_NODE_MAJOR) {
  console.warn(
    `\n!! Packed with Node ${packer.node} / npm ${packer.npm}, not CI's Node ${CI_NODE_MAJOR}: the packed size\n` +
      `!! below is only indicative, and CI's is authoritative. For CI's figure, run\n` +
      `!!   npx -y -p node@${CI_NODE_MAJOR} -p npm@10 -- bun run size:check\n`,
  );
}
const rows: SizeRow[] = [];
const sizes: Record<string, { raw: number; gzip: number; brotli: number }> = {};
function measure(data: Uint8Array) {
  return { raw: data.length, gzip: gzipSync(data, { level: 9 }).length, brotli: brotliCompressSync(data).length };
}
try {
  assert(!pack.files.some((file: { path: string }) => file.path.endsWith(".map")), "Unexpected source maps in npm package");
  assert(pack.files.some((file: { path: string }) => file.path === "dist/ssr/index.js"), "Missing SSR bundle");
  // The build writes dist/package.json so its module and declaration prunes
  // read the export map in place. It is not an export target and has no
  // runtime role (`dist` inherits the root `type` and `sideEffects`), so the
  // manifest's `files` excludes it from the tarball. This asserts the real
  // packed list: dropping the exclusion, or writing the file elsewhere, fails
  // here with the tarball CI would publish.
  assert(
    !pack.files.some((file: { path: string }) => file.path === "dist/package.json"),
    "The build's nested manifest is packed; it has no export or runtime role",
  );
  // Which README and manifest ship. The fixture packs what publish.yml's step
  // makes of the tree, so these hold for a release: npm's page shows the short
  // README, the repository's long one stays on GitHub, and the manifest carries
  // nothing only the repository uses.
  const paths = (pack.files as { path: string }[]).map(file => file.path);
  assert.deepEqual(paths.filter(path => /readme/i.test(path)), ["README.md"], "The package ships one README, at its root");
  const shipped = await Bun.file(join(fixture.installed, "README.md")).text();
  assert.equal(shipped, await Bun.file("npm-readme.md").text(), "The packed README.md is not npm-readme.md");
  assert.notEqual(shipped, await Bun.file("README.md").text(), "npm-readme.md and README.md are the same file");
  const published = await Bun.file(join(fixture.installed, "package.json")).json() as Record<string, unknown>;
  for (const key of ["scripts", "eslintConfig", "typedocOptions"]) {
    assert(!(key in published), `The packed manifest still has "${key}"`);
  }
  // The public-history rule: no internal ticket reference may reach a shipped
  // file. Comments in src are copied verbatim into dist's .d.ts, .svelte and
  // .scss files, so this walks everything the tarball actually carries.
  for (const file of pack.files as { path: string }[]) {
    const refs = internalIdRefs(await Bun.file(join(fixture.installed, file.path)).text());
    assert.equal(refs.length, 0, `${file.path} ships internal ticket references: ${refs.join(", ")}`);
  }
  // The SSR bundle owns linkedom; every other shipped module (including its
  // browser stub) must remain outside the server graph. Resolve relative paths
  // as well as public subpaths, so ../ssr/index.js cannot bypass the guard.
  for (const file of pack.files as { path: string }[]) {
    if (!file.path.startsWith("dist/") || !/\.(?:[cm]?[jt]sx?|svelte)$/.test(file.path)) continue;
    const source = await Bun.file(join(fixture.installed, file.path)).text();
    const server = file.path.startsWith("dist/ssr/") && file.path !== "dist/ssr/browser.js";
    const parsed = ts.createSourceFile(file.path, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      let specifier: ts.Node | undefined;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require"))) specifier = node.arguments[0];
      if (specifier && ts.isStringLiteralLike(specifier)) {
        const name = specifier.text;
        assert(!/^linkedom(?:\/|$)/.test(name), `Unbundled linkedom in ${file.path}: ${name}`);
        const target = name.startsWith(".") ? resolve(dirname(file.path), name) : name;
        if (!server) {
          assert(!/(?:^|\/)ssr(?:\/|$|\.)/.test(target), `Client imports SSR in ${file.path}: ${name}`);
        } else {
          const peer = (file.path === "dist/ssr/react.js" && ["react", "react-dom/server"].includes(name))
            || (file.path === "dist/ssr/svelte.js" && ["svelte", "svelte/server"].includes(name))
            || (file.path === "dist/ssr/vue.js" && ["vue", "vue/server-renderer"].includes(name))
            || (file.path === "dist/ssr/solid.js" && ["solid-js", "solid-js/web"].includes(name));
          assert(name.startsWith(".") || name.startsWith("node:") || peer, `Unbundled SSR dependency in ${file.path}: ${name}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
    if (!server) assert(!source.includes("linkedom"), `linkedom code in client module: ${file.path}`);
  }
  sizes.ssr = measure(new Uint8Array(await Bun.file(join(fixture.installed, "dist/ssr/index.js")).arrayBuffer()));
  console.log(`SSR entry: ${sizes.ssr.raw} bytes raw, ${sizes.ssr.gzip} gzip (shared mtrl modules/CSS excluded)`);
  rows.push({ name: "SSR entry raw", bytes: sizes.ssr.raw }, { name: "SSR entry gzip", bytes: sizes.ssr.gzip });
  // What a server-rendered page weighs, by style mode. No other check asserts it.
  // The page: 30 buttons, 10 icon buttons and 4 chip sets of 5 chips, 44 roots, the
  // scenario whose size moves most with the number of elements.
  // - inline (the default): each root carries the CSS its markup can match as
  //   text in a <style>: the host rules, the ripple, the element's stylesheet
  //   and its dependencies' (4,507 B for a button, 5,801 for an icon button,
  //   6,159 for a chip set; a select, the largest root, 16,402). Nothing is
  //   shared between roots, so the raw size is the sum over the roots.
  // - link: each root carries one <link> per stylesheet and no CSS text.
  // A ceiling fails when a root's CSS grows, or when link mode starts to carry CSS.
  // A floor fails when the page shrinks by more than the headroom: deduplication
  // gained, or a stylesheet lost, is then looked at and the budget set again.
  // Ceilings by the rule at the top of scripts/size.ts (measured plus 1% or 100
  // bytes, whichever is more, rounded up to 50); floors mirror it.
  {
    const { renderElement } = await import(pathToFileURL(join(fixture.installed, "dist/ssr/index.js")).href) as {
      renderElement: (tag: string, attributes?: Record<string, string>, content?: string, options?: object) => unknown;
    };
    const icon = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 21 3 12l9-9 9 9z"/></svg>';
    const chips = Array.from({ length: 5 }, () => '<m-chip value="v">Vegetarian</m-chip>').join("");
    const page = (options: object): Uint8Array => new TextEncoder().encode([
      ...Array.from({ length: 30 }, () => String(renderElement("m-button", {}, "Save", options))),
      ...Array.from({ length: 10 }, () => String(renderElement("m-icon-button", { icon, "aria-label": "Favourite" }, "", options))),
      ...Array.from({ length: 4 }, () => String(renderElement("m-chips", { "aria-label": "Diet" }, chips, options))),
    ].join("\n"));
    const modes = { inline: {}, link: { styles: "link", cssBase: "/css" } };
    for (const [mode, options] of Object.entries(modes)) {
      const size = measure(page(options));
      sizes[`ssr-page-${mode}`] = size;
      console.log(`SSR page, ${mode}: ${size.raw} bytes raw, ${size.gzip} gzip, ${size.brotli} brotli (44 roots)`);
      for (const metric of ["raw", "gzip"] as const) rows.push({ name: `SSR page ${mode} ${metric}`, bytes: size[metric] });
    }
  }
  console.log(`npm package: ${pack.size} bytes compressed, ${pack.unpackedSize} unpacked, ${pack.entryCount} files (packed with Node ${packer.node} / npm ${packer.npm})`);
  rows.unshift({ name: "Tarball compressed", gate: "packed", bytes: pack.size },
    { name: "Package unpacked", bytes: pack.unpackedSize });

  // The component entries the probe imports, and how many package.json exports,
  // counted another way: every "./components/<name>" key. Which keys those must
  // be is test/component-exports.test.ts's check, so the number is read, not written here.
  const exportKeys = Object.keys(JSON.parse(await Bun.file("package.json").text()).exports);
  // An opt-in entry ships a sheet and an enhancer, not a factory: it is
  // imported by name below, and it is not one of the factory entries this
  // count compares.
  const isComponentKey = (k: string) => k.split("/").length === 3 && !k.endsWith("constants") && !NON_COMPONENT_ENTRIES.has(k.slice("./components/".length));
  const componentKeys = exportKeys.filter(k => k.startsWith("./components/") && isComponentKey(k));
  const componentEntryCount = exportKeys.filter(k => /^\.\/components\/[^/]+$/.test(k) && isComponentKey(k)).length;
  assert(componentEntryCount > 0, "package.json exports no component entry");

  // Resolve and execute the installed ESM/CJS APIs in Node, not Bun's permissive resolver.
  const smoke = join(temporary, "smoke.mjs");
  await writeFile(smoke, `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import * as esm from 'material';
    import { createButton, createTextField, createCard } from 'material';
    import button from 'material/components/button';
    import rail from 'material/components/navigation-rail';
    import { BUTTON_VARIANTS } from 'material/components/button/constants';
    import { addClass } from 'material/core/dom';
    import { JSDOM } from ${JSON.stringify(pathToFileURL(resolve("node_modules/jsdom/lib/api.js")).href)};
    assert.equal(button, createButton);
    assert.equal(rail, esm.createNavigationRail);
    // 3.0.0: the core helpers are at their subpath only, not on the root
    assert.equal(esm.addClass, undefined);
    // 3.0.0 is ESM-only: no require condition, so require('material') does not resolve
    assert.throws(() => createRequire(import.meta.url)('material'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });

    // The opt-in entry exports the enhancer by name and is not on the root.
    const { textFieldChips } = await import('material/components/text-field-chips');
    assert.equal(typeof textFieldChips, 'function', 'material/components/text-field-chips must export textFieldChips');
    assert.equal(esm.textFieldChips, undefined, 'the opt-in entry must not be on the root');

    const componentKeys = ${JSON.stringify(componentKeys)};
    // A filter that matches nothing would loop over nothing and pass
    assert.equal(componentKeys.length, ${componentEntryCount}, 'the component entries checked are not the component entries package.json exports');
    // The entries the design ships rootless: public at their subpath only, kept
    // out of every barrel. The assertion below still holds each one out of the
    // root, so a stray root export fails rather than riding the exception.
    const rootless = new Set(['listbox', 'bottom-app-bar-toolbar']);
    for (const key of componentKeys) {
      const name = key.slice(13); // remove "./components/"
      const module = await import(\`material/components/\${name}\`);
      assert.equal(typeof module.default, "function", \`\${key} default is not a function\`);
      // A component names its factory at least once, and a deprecated name
      // is the same binding, so a subpath may export several names equal to
      // default; each is checked against the root.
      const namedExports = Object.keys(module).filter(k => k !== "default" && module[k] === module.default);
      assert(namedExports.length >= 1, \`\${key} exports none of its default by name\`);
      for (const k of namedExports) {
        if (rootless.has(name)) {
          assert.equal(esm[k], undefined, \`\${key} is rootless by design but the root exports \${k}\`);
        } else {
          assert.equal(esm[k], module.default, \`\${key} named export \${k} must match root export\`);
        }
      }
    }

    const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
    for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Event', 'CustomEvent', 'MutationObserver']) {
      globalThis[key] = dom.window[key];
    }
    globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
    globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
    // No canvas rendering in JSDOM; exercise the lazy module and DOM lifecycle.
    dom.window.HTMLCanvasElement.prototype.getContext = () => null;
    const b = button({ text: 'Save', variant: BUTTON_VARIANTS.FILLED });
    document.body.append(b.element);
    // addClass takes the name as given. This asserts it from the
    // packaged build, which is where a consumer meets it.
    addClass(b.element, 'smoke');
    assert(b.element.classList.contains('smoke'));
    assert(!b.element.classList.contains('mtrl-smoke'));
    // The component's own classes still carry the prefix, via getClass.
    assert(b.element.classList.contains('mtrl-button'));
    assert(b.element.textContent.includes('Save'));
    const navigation = rail({ items: [{ id: 'home', label: 'Home', icon: '<svg></svg>' }] });
    document.body.append(navigation.element); navigation.expand(); assert(navigation.isExpanded()); navigation.destroy();
    const field = createTextField({ label: 'Name' });
    field.setValue('Ada');
    assert.equal(field.getValue(), 'Ada');
    const loading = button({ text: 'Upload', progress: { indeterminate: false } });
    document.body.append(loading.element);
    await loading.showProgress();
    assert(loading.element.querySelector('canvas'), 'Lazy progress module did not load');
    await loading.hideProgress();
    const card = createCard({ buttons: [{ text: 'Action' }] });
    document.body.append(card.element);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert(card.element.querySelector('button')?.textContent.includes('Action'), 'Lazy card button did not load');
    card.destroy(); loading.destroy(); b.destroy(); field.destroy(); dom.window.close();

    // Every export key and wildcard expansion in the packed manifest must resolve
    // in Node to a file that ships in the tarball.
    import { existsSync, readFileSync } from 'node:fs';
    import { fileURLToPath } from 'node:url';
    import { dirname, join as joinPath } from 'node:path';
    const rootFile = fileURLToPath(import.meta.resolve('material'));
    const pkgRoot = joinPath(dirname(rootFile), '..');
    const pkgJson = JSON.parse(readFileSync(joinPath(pkgRoot, 'package.json'), 'utf8'));
    const packedPaths = ${JSON.stringify(paths)};
    let resolvedExportCount = 0;
    for (const [key, value] of Object.entries(pkgJson.exports)) {
      if (key === './react/jsx' || key === './solid/jsx') {
        const typesRel = value.types.slice(2);
        assert(packedPaths.includes(typesRel) && existsSync(joinPath(pkgRoot, typesRel)), \`Missing types target for \${key}: \${typesRel}\`);
        resolvedExportCount += 1;
        continue;
      }
      if (!key.includes('*')) {
        const spec = key === '.' ? 'material' : \`material/\${key.slice(2)}\`;
        const resolved = fileURLToPath(import.meta.resolve(spec));
        assert(existsSync(resolved), \`Export \${spec} resolved to missing file \${resolved}\`);
        if (typeof value === 'object' && value !== null && 'types' in value) {
          const typesRel = value.types.slice(2);
          assert(packedPaths.includes(typesRel) && existsSync(joinPath(pkgRoot, typesRel)), \`Missing types target for \${key}: \${typesRel}\`);
        }
        resolvedExportCount += 1;
        continue;
      }
      const targetPattern = typeof value === 'string' ? value : (value.import ?? value.default);
      const [tPre, tSuf] = targetPattern.slice(2).split('*');
      const [kPre, kSuf] = key.slice(2).split('*');
      const matches = packedPaths.filter(p => p.startsWith(tPre) && p.endsWith(tSuf) && !p.slice(tPre.length, p.length - tSuf.length).includes('/'));
      assert(matches.length > 0, \`Wildcard export \${key} matched no packed files\`);
      for (const match of matches) {
        const star = match.slice(tPre.length, match.length - tSuf.length);
        const spec = \`material/\${kPre}\${star}\${kSuf}\`;
        const resolved = fileURLToPath(import.meta.resolve(spec));
        assert(existsSync(resolved), \`Wildcard export \${spec} resolved to missing file \${resolved}\`);
        resolvedExportCount += 1;
      }
    }
    assert(resolvedExportCount >= 240, \`Expected at least 240 resolved export specifiers, got \${resolvedExportCount}\`);
  `);
  await run(["node", smoke], temporary);
  console.log(`component entries: ${componentKeys.length} default exports, each name matched to the root except the declared rootless entries; all package.json exports resolve from the packed tarball`);

  // Check declaration resolution using strict NodeNext semantics.
  const typeFixture = join(temporary, "types.ts");
  await writeFile(typeFixture, `
    import 'material/styles';
    import 'material/styles/button';
    import 'material/elements/css';
    import 'material/elements/css/button';
    import { createButton, type ButtonConfig, type NavigationRailConfig, type NavigationRailComponent } from 'material';
    import { createScheme, applyScheme, tonalSpot, vibrant, expressive, fidelity, content, neutral, monochrome, Hct, type DynamicScheme } from 'material/theme';
    import { createSchemeByName } from 'material/theme/variants';
    import { sourceColorFromImage } from 'material/theme/image';
    import rail from 'material/components/navigation-rail';
    const railConfig: NavigationRailConfig = { expanded: true, layout: 'modal', items: [] };
    const navigation: NavigationRailComponent = rail(railConfig);
    navigation.on('select', event => event.originalEvent.preventDefault());
    import button from 'material/components/button';
    import { BUTTON_VARIANTS } from 'material/components/button/constants';
    import { createElementConfig } from 'material/core';
    import { addClass } from 'material/core/dom';
    const config: ButtonConfig = { text: 'Save', variant: BUTTON_VARIANTS.FILLED };
    const a: ReturnType<typeof createButton> = button(config);
    addClass(a.element, 'ready');
    const elementConfig = createElementConfig({ style: { color: 'red' } }, { tag: 'div' });
    elementConfig.style!.length = 0;
    const scheme: DynamicScheme = createScheme('#6750a4', { variant: tonalSpot });
    const primaryArgb: number = scheme.primary;
    const existingPublicMember = scheme.colors;
    void [vibrant, expressive, fidelity, content, neutral, monochrome, Hct, createSchemeByName, sourceColorFromImage, applyScheme, primaryArgb, existingPublicMember, elementConfig];
  `);
  await run(["node", resolve("node_modules/typescript/bin/tsc"), typeFixture,
    "--noEmit", "--strict", "--module", "NodeNext", "--moduleResolution", "NodeNext",
    // Side-effect imports are unchecked by default; this is the setting under
    // which `import 'material/styles'` needs its types condition
    "--noUncheckedSideEffectImports",
    "--target", "ES2020", "--types", "node", "--typeRoots", resolve("node_modules/@types")]);

  const fixtures = [
    { name: "addClass", code: "export { addClass } from 'material/core/dom';" },
    { name: "button", code: "export { createButton } from 'material';" },
    { name: "slider", code: "export { createSlider } from 'material';" },
    { name: "navigation-rail", code: "export { createNavigationRail } from 'material';" },
    { name: "navigation-rail-css", code: "import 'material/styles/base'; import 'material/styles/navigation-rail';" },
    { name: "text-field", code: "export { createTextField } from 'material';" },
    { name: "form", code: "export { createButton, createTextField, createCheckbox } from 'material';" },
    { name: "all-js", code: "export * from 'material';" },
    { name: "base-css", code: "import 'material/styles/base';" },
    { name: "base-lite-css", code: "import 'material/styles/base-lite';" },
    { name: "base-elements-css", code: "import 'material/styles/base-elements';" },
    { name: "button-css", code: "import 'material/styles/base'; import 'material/styles/button';" },
    { name: "select-css", code: "import 'material/styles/base'; import 'material/styles/select';" },
    { name: "slider-css", code: "import 'material/styles/base'; import 'material/styles/slider';" },
    { name: "full-css", code: "import 'material/styles';" },
  ];
  for (const fixture of fixtures) {
    const entry = join(temporary, `${fixture.name}.ts`);
    await writeFile(entry, fixture.code);
    const result = await Bun.build({ entrypoints: [entry], format: "esm", target: "browser", minify: true });
    assert(result.success, String(result.logs));
    const css = fixture.name.endsWith("-css");
    const outputs = result.outputs.filter(output => output.path.endsWith(css ? ".css" : ".js"));
    assert.equal(outputs.length, 1, `${fixture.name}: expected one ${css ? "CSS" : "JS"} output`);
    const bytes = new Uint8Array(await outputs[0].arrayBuffer());
    sizes[fixture.name] = measure(bytes);
    rows.push({ name: `Packed ${fixture.name} gzip`, bytes: sizes[fixture.name].gzip });
    if (css) {
      const text = new TextDecoder().decode(bytes);
      assert(text.includes("--mtrl-sys-color-primary"), "CSS base theme was discarded");
      if (fixture.name === "base-lite-css") {
        assert(text.includes("--mtrl-ref-typeface-plain") && text.includes("--mtrl-sys-shape-corner-"), "base-lite tokens were discarded");
        assert(text.includes("prefers-reduced-motion"), "base-lite lost the global reduced-motion switch");
        assert(!text.includes(".mtrl-ripple") && !text.includes("prefers-contrast") && !text.includes("box-sizing"),
          "base-lite carries a group it promises to drop");
      } else if (fixture.name === "base-elements-css") {
        assert(text.includes("prefers-contrast") && text.includes("box-sizing"), "element base lost contrast or reset");
        assert(!text.includes(".mtrl-ripple") && !text.includes("[data-ripple"), "element base retains global ripple rules");
        assert(sizes[fixture.name].gzip < sizes["base-css"].gzip, "element base is not smaller than the full base");
      } else {
        assert(text.includes(".mtrl-"), "CSS side-effect import was discarded");
      }
      if (fixture.name === "button-css") {
        assert(text.includes(".mtrl-button") && text.includes(".mtrl-progress"));
        assert(!text.includes(".mtrl-text-field"), "Unrelated component CSS retained");
      }
      if (fixture.name === "select-css") assert(text.includes(".mtrl-menu") && text.includes(".mtrl-text-field"));
    }
  }

  // Sum the entry's static dependency graph, not just its tiny re-export stub.
  // Built with a relative entrypoint from the fixture's own directory: the
  // bundler derives chunk names from the module path it is handed, and an
  // absolute path in a fresh fixture moved the measured bytes a few gzipped
  // bytes every run (floor/material#131).
  const splitDir = join(temporary, "split");
  const splitCwd = process.cwd();
  process.chdir(temporary);
  let split;
  try {
    split = await Bun.build({ entrypoints: ["button.ts"], outdir: splitDir,
      format: "esm", target: "browser", minify: true, splitting: true });
  } finally {
    process.chdir(splitCwd);
  }
  assert(split.success, String(split.logs));
  const byPath = new Map(split.outputs.map(output => [output.path, output]));
  const initial = new Set<string>();
  const deferred = new Set<string>();
  const visit = async function visit(path: string) {
    if (initial.has(path)) return;
    initial.add(path);
    const output = byPath.get(path);
    assert(output, `Missing chunk ${path}`);
    const file = ts.createSourceFile(path, await output.text(), ts.ScriptTarget.Latest, true);
    const dependencies: string[] = [];
    function walk(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        dependencies.push(resolve(dirname(path), node.moduleSpecifier.text));
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
        deferred.add(resolve(dirname(path), node.arguments[0].text));
      }
      ts.forEachChild(node, walk);
    }
    walk(file);
    for (const dependency of dependencies) await visit(dependency);
  }
  const entry = split.outputs.find(output => basename(output.path) === "button.js");
  assert(entry);
  await visit(entry.path);
  assert([...deferred].some(path => !initial.has(path)), "Progress is no longer deferred");
  sizes["button-initial"] = { raw: 0, gzip: 0, brotli: 0 };
  for (const path of initial) {
    const chunk = measure(new Uint8Array(await byPath.get(path)!.arrayBuffer()));
    for (const metric of ["raw", "gzip", "brotli"] as const) sizes["button-initial"][metric] += chunk[metric];
  }
  rows.push({ name: "Packed button-initial gzip", bytes: sizes["button-initial"].gzip });
  for (const adapter of ["react", "svelte", "vue", "solid"]) {
    const bytes = Bun.file(join(fixture.installed, "dist", "ssr", `${adapter}.js`)).size;
    rows.push({ name: `SSR adapter ${adapter} raw`, bytes });
  }
  const { size: slider } = await measureSlider();
  rows.push({ name: "Slider inline gzip", bytes: slider.gzip });
  rows.push(...(await measureConsumerSizes(temporary)).rows);

  console.table(sizes);
  await mkdir("analysis", { recursive: true });
  await writeFile("analysis/package-size.json", JSON.stringify({ rows, sizes, package: {
    size: pack.size, unpackedSize: pack.unpackedSize, entryCount: pack.entryCount,
  } }, null, 2) + "\n");
} finally {
  await fixture.cleanup();
}
