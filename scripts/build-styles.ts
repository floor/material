import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import * as sass from "sass";
import {
  componentStyles, fullOnlyStyles, themeStyles, baseStyles, utilityStyles,
  resolveStyleDependencies,
} from "./style-manifest";

/** Verify CSS dependencies against the emitted JS, including lazy imports. */
async function validateRuntimeDependencies(outdir: string) {
  const missing = new Set<string>();
  for (const name of Object.keys(componentStyles)) {
    // A source map lists modules retained by the bundler, unlike a raw import
    // graph which also includes unused re-exports from shared feature barrels.
    // Keep splitting off so lazy dependencies are checked too. Maps stay in memory.
    const result = await Bun.build({
      entrypoints: [resolve(outdir, "components", name, "index.js")],
      target: "browser", format: "esm", minify: true, sourcemap: "external",
    });
    assert(result.success, `Cannot check ${name}: ${result.logs}`);
    const map = result.outputs.find(output => output.kind === "sourcemap");
    assert(map, `Missing dependency information for ${name}`);
    const { sources } = await map.json() as { sources: string[] };
    const provided = new Set(resolveStyleDependencies([name]));
    for (const source of sources) {
      const parts = relative(resolve(outdir), resolve(source)).split(sep);
      if (parts[0] === "components" && parts[1] !== name) {
        if (!provided.has(parts[1])) missing.add(`${name} uses ${parts[1]} at runtime but its CSS dependency is missing`);
      }
    }
  }
  assert.equal(missing.size, 0, [...missing].join("\n"));
}

export async function buildStyles(outdir: string, banner: string) {
  resolveStyleDependencies(Object.keys(componentStyles));
  await validateRuntimeDependencies(outdir);
  const options: sass.StringOptions<"sync"> = {
    loadPaths: [resolve("src/styles")], style: "compressed", logger: sass.Logger.silent,
  };
  const use = (sources: string[]) => sources.map((source, i) => `@use "${source}" as entry${i};`).join("\n");
  const full = sass.compileString(await readFile("src/styles/main.scss", "utf8"), options);

  // Use Sass's parsed dependency graph, not text matching, to detect manifest drift.
  const loaded = full.loadedUrls.map(url => relative(resolve("src/styles"), fileURLToPath(url)).split(sep).join("/"));
  const components = loaded.filter(path => path.startsWith("components/")).sort();
  const declared = [...Object.values(componentStyles).map(entry => entry.source), ...fullOnlyStyles]
    .map(source => source.replace(/\/([^/]+)$/, "/_$1.scss")).sort();
  assert.deepEqual(components, declared, "Component CSS manifest differs from the full stylesheet");
  const themes = loaded.filter(path => path.startsWith("themes/") && !["themes/_index.scss", "themes/_base-theme.scss"].includes(path)).sort();
  assert.deepEqual(themes, themeStyles.map(name => `themes/_${name}.scss`).sort(), "Theme CSS manifest differs from the full stylesheet");

  async function emit(path: string, sources: string[], dependencies: string[] = []) {
    const css = sass.compileString(use(sources), options).css;
    if (path.startsWith("styles/")) {
      const name = path.slice("styles/".length);
      // Vite can hoist shared CSS ahead of (or after) its consumer. Declare the
      // same cascade order in EVERY asset so the first loaded asset establishes
      // it, even when the base asset is loaded later. App CSS stays unlayered.
      const layers = ["base", "utilities", ...resolveStyleDependencies(Object.keys(componentStyles))];
      const order = `@layer ${layers.map(layer => `mtrl.${layer}`).join(",")};`;
      await writeFile(`${outdir}/${path}.css`, `${banner}\n${order}@layer mtrl.${name}{${css}}\n`);
      // JS module edges are deduplicated across entries. Nested CSS @imports
      // can be independently inlined by Vite and duplicate shared styles.
      await writeFile(`${outdir}/${path}.js`, dependencies.map(dependency => `import "./${dependency}.js";`).join("\n") +
        `\nimport "./${name}.css";\n`);
      await writeFile(`${outdir}/${path}.d.ts`, "export {};\n");
    } else {
      await writeFile(`${outdir}/${path}.css`, `${banner}\n${css}\n`);
    }
  }
  await mkdir(`${outdir}/styles`, { recursive: true });
  await mkdir(`${outdir}/themes`, { recursive: true });
  await writeFile(`${outdir}/styles.css`, `${banner}\n${full.css}\n`);
  // `import 'mtrl/styles'` resolves through the types condition under NodeNext,
  // as the per-component entries do
  await writeFile(`${outdir}/styles.d.ts`, "export {};\n");
  await emit("styles/base", baseStyles);
  await emit("styles/utilities", utilityStyles);
  for (const [name, entry] of Object.entries(componentStyles)) {
    await emit(`styles/${name}`, [entry.source], entry.dependencies);
  }
  for (const name of themeStyles) await emit(`themes/${name}`, [`themes/${name}`]);
  await emitElementStyles(outdir, options);
}

/**
 * CSS for the elements' shadow roots, as modules that register it: importing
 * `mtrl/elements/css/switch` registers the switch's CSS and its dependencies.
 * Emitted for the components that have an element; importing the module
 * also proves the elements import without a DOM.
 * The shadow base (`ripple`) is what the global base stylesheet gives a
 * component in light DOM and a shadow root does not inherit.
 */
async function emitElementStyles(outdir: string, options: sass.StringOptions<"sync">) {
  const dir = `${outdir}/elements/css`;
  await mkdir(dir, { recursive: true });
  const write = async (name: string, source: string, imports: string[]) => {
    const css = sass.compileString(`@use "${source}";`, options).css;
    await writeFile(`${dir}/${name}.js`,
      imports.map(dependency => `import "./${dependency}.js";`).join("\n") +
      `\nimport { registerStyles } from "../styles.js";\nregisterStyles({ ${JSON.stringify(name)}: ${JSON.stringify(css)} });\n`);
    await writeFile(`${dir}/${name}.d.ts`, "export {};\n");
  };
  await write("ripple", "utilities/ripple", []);
  // Only components that have an element, and what their CSS depends on.
  const { elements } = await import("../src/elements");
  const names = resolveStyleDependencies(Object.values(elements).flatMap(element => [...element.spec.styles]));
  for (const name of names) await write(name, componentStyles[name].source, ["ripple", ...componentStyles[name].dependencies]);
  await writeFile(`${dir}/index.js`, names.map(name => `import "./${name}.js";`).join("\n") + "\n");
  await writeFile(`${dir}/index.d.ts`, "export {};\n");
}
