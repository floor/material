#!/usr/bin/env bun
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { buildModules, buildSSR } from "./build-modules";
import { buildStyles } from "./build-styles";
import { pruneDeclarations } from "./prune-declarations";
import { emitSvelte } from "./svelte-package";

const outdir = "./dist";
const pkg = await Bun.file("package.json").json();
const banner = `/*! ${pkg.name} v${pkg.version} | MIT */`;

try {
  // Type-check before removing the previous distribution.
  // buildModules also emits declarations and rejects any compiler errors.
  const staging = await mkdtemp("./.mtrl-build-");
  try {
    console.log("Building ESM modules and declarations...");
    buildModules(staging);
    console.log("Writing the Svelte components...");
    await emitSvelte(staging);
    console.log("Building full and optional stylesheets...");
    await buildStyles(staging, banner);
    console.log("Bundling the server-only SSR entry...");
    await buildSSR(staging);

    // Keep the nested manifest in sync, including CSS side effects and exports.
    const relocate = (value: unknown): unknown => {
      if (typeof value === "string") return value.replace(/^\.\/dist\//, "./");
      if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, relocate(item)]));
      }
      return value;
    };
    // The published manifest: no development-only fields (scripts, tool settings).
    const { scripts, devDependencies, files, eslintConfig, typedocOptions, ...distribution } = pkg;
    const manifest = {
      ...distribution,
      main: relocate(pkg.main), module: relocate(pkg.module), types: relocate(pkg.types),
      exports: relocate(pkg.exports),
    };
    await writeFile(`${staging}/package.json`, JSON.stringify(manifest, null, 2) + "\n");

    // The compiler emits a declaration for every module, including the ones no
    // `exports` entry can name; ship only those a consumer import can reach.
    const pruned = await pruneDeclarations(staging, manifest.exports);
    console.log(`Pruned ${pruned.removed.length} unreachable declarations (${pruned.bytes} bytes)`);

    await rm(outdir, { recursive: true, force: true });
    await rename(staging, outdir);
    console.log(`Built ${pkg.name} ${pkg.version} in ${outdir}`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
