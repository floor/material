#!/usr/bin/env bun
// scripts/check-dist-modules.ts
//
// Build first. Fails when the built dist ships a JavaScript module that no
// consumer import can reach, and prints it with its size. The rule is the one
// `scripts/dist-modules.ts` uses to prune: an exports target names the module,
// or a module that ships imports it.
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { walkDistModules } from "./dist-modules";

const dir = process.argv[2] ?? "dist";
const manifest = await Bun.file(join(dir, "package.json")).json();
const { reachable, unreachable } = await walkDistModules(dir, manifest.exports, manifest.name);

if (unreachable.length > 0) {
  console.error(`✗ ${unreachable.length} dist JS modules no exports target reaches:`);
  let bytes = 0;
  for (const file of unreachable) {
    const size = (await stat(join(dir, file))).size;
    bytes += size;
    console.error(`  ${file}  ${size} B`);
  }
  console.error(`  ${unreachable.length} modules, ${bytes} bytes in all`);
  console.error("Ship only what the nested manifest reaches: extend the build prune.");
  process.exit(1);
}

console.log(`✓ every dist JS module is reachable from the nested manifest (${reachable.length} modules)`);
