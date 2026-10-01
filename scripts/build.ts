#!/usr/bin/env bun
import { copyFile, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { buildModules, buildSSR } from "./build-modules";
import { buildStyles } from "./build-styles";
import { emitSvelte } from "./svelte-package";

const outdir = "./dist";
const pkg = await Bun.file("package.json").json();
const banner = `/*! mtrl v${pkg.version} | MIT */`;

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
    await writeFile(`${staging}/package.json`, JSON.stringify({
      ...distribution,
      main: relocate(pkg.main), module: relocate(pkg.module), types: relocate(pkg.types),
      exports: relocate(pkg.exports),
    }, null, 2) + "\n");
    await copyFile("README.md", `${staging}/README.md`);
    await copyFile("LICENSE", `${staging}/LICENSE`);

    await rm(outdir, { recursive: true, force: true });
    await rename(staging, outdir);
    console.log(`Built mtrl ${pkg.version} in ${outdir}`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
