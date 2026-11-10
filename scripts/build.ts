#!/usr/bin/env bun
import { cp, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { buildModules, buildSSR, stripShippedModules } from "./build-modules";
import { buildStyles } from "./build-styles";
import { compareDeclarationIdentity } from "./check-declaration-identity";
import { consolidateDeclarations } from "./consolidate-declarations";
import { pruneUnreachableModules } from "./dist-modules";
import { pruneDeclarations } from "./prune-declarations";
import { stripInternalDeclarationDocs } from "./strip-internal-declaration-docs";
import { emitSvelte } from "./svelte-package";
import { generateTokenCatalogue } from "./generate-token-catalogue";

const outdir = "./dist";
const pkg = await Bun.file("package.json").json();
const banner = `/*! ${pkg.name} v${pkg.version} | MIT */`;

try {
  // Type-check before removing the previous distribution.
  // buildModules also emits declarations and rejects any compiler errors.
  const staging = await mkdtemp("./.mtrl-build-");
  const beforeDocs = await mkdtemp("./.mtrl-doc-proof-");
  try {
    console.log("Building ESM modules and declarations...");
    buildModules(staging);
    console.log("Writing the Svelte components...");
    await emitSvelte(staging);
    console.log("Building full and optional stylesheets...");
    await buildStyles(staging, banner);
    // The versioned token catalogue is generated from the final CSS outputs
    // while packing, never committed: nothing generated enters git, and the
    // build supplies the implementation commit the data records (see
    // scripts/generate-token-catalogue.ts for the provenance rule).
    const catalogue = await generateTokenCatalogue(staging, pkg.version);
    console.log(`Generated the token catalogue (${catalogue.raw} B raw, ${catalogue.gzip} B gzip)`);
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
    // The nested manifest lets the prunes below and the reachability checks
    // read the relocated export map in place. It is not a published file:
    // package.json's `files` excludes dist/package.json (`dist` inherits the
    // root `type` and `sideEffects`), and the package size check asserts it
    // stays out of the tarball.
    await writeFile(`${staging}/package.json`, JSON.stringify(manifest, null, 2) + "\n");

    // The compiler emits a declaration for every module, including the ones no
    // `exports` entry can name; ship only those a consumer import can reach.
    const pruned = await pruneDeclarations(staging, manifest.exports);
    console.log(`Pruned ${pruned.removed.length} unreachable declarations (${pruned.bytes} bytes)`);

    // Keep JSDoc on every declaration reachable from `exports` (including
    // re-exports, heritage clauses, and signature-referenced types) and strip
    // non-`@deprecated` JSDoc on strictly internal declarations.
    await cp(staging, beforeDocs, { recursive: true });
    const internalDocs = await stripInternalDeclarationDocs(staging, manifest.exports);
    if (internalDocs.declarations <= 0 || internalDocs.bytes <= 0) throw new Error("Internal declaration JSDoc strip unexpectedly removed no declarations or bytes");
    console.log(`Stripped JSDoc from ${internalDocs.declarations} internal declarations across ${internalDocs.files} files (${internalDocs.bytes} bytes)`);

    // Fold the declarations no `exports` entry names into the barrel that
    // exports their directory, so a consumer reads one file per entry instead
    // of one per module. The pass keeps each barrel's exported names exactly.
    const consolidated = await consolidateDeclarations(staging, manifest.exports);
    console.log(
      `Consolidated ${consolidated.merged} declarations into ${consolidated.groups} barrels ` +
      `(${consolidated.bytes} bytes, ${consolidated.kept.length} kept)`,
    );
    const docsProof = compareDeclarationIdentity(beforeDocs, staging);
    console.log(`Declaration documentation identity: ${docsProof.exports} exports, ${docsProof.pairs} symbol pairs; zero documentation differences`);

    // A module no export target reaches and no shipped module imports is a
    // file no consumer can load: ship the reachable tree and nothing beside it.
    const modules = await pruneUnreachableModules(staging, manifest.exports, manifest.name);
    console.log(`Pruned ${modules.removed.length} unreachable modules (${modules.bytes} bytes)`);

    // Readable, comment-stripped modules: indentation and blank lines go, tokens
    // and one line per statement stay. The prunes above have already read the emit.
    const stripped = await stripShippedModules(staging);
    console.log(`Stripped ${stripped.files} modules (${stripped.bytes} bytes)`);

    await rm(outdir, { recursive: true, force: true });
    await rename(staging, outdir);
    console.log(`Built ${pkg.name} ${pkg.version} in ${outdir}`);
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(beforeDocs, { recursive: true, force: true });
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
