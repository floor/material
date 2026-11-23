#!/usr/bin/env bun
/**
 * Whether a style-manifest edit is only component dependency edges.
 * Catalogue data lives in the same file. A dependency edge is what the build
 * requires when a component retains another at runtime, and it is not catalogue
 * data. Any other change in the file still is.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** True when the two manifests differ only inside `dependencies` arrays. */
export function styleManifestDependenciesOnly(before: string, after: string): boolean {
  const edges = (text: string): string => text.replace(/dependencies:\s*\[[^\]]*\]/g, "dependencies: []");
  return edges(before) === edges(after);
}

if (import.meta.main) {
  const base = process.argv[2];
  if (!base) {
    console.error("usage: catalogue-scope.ts <base-revision>");
    process.exit(2);
  }
  const before = execFileSync("git", ["show", `${base}:scripts/style-manifest.ts`], { encoding: "utf8" });
  const after = readFileSync("scripts/style-manifest.ts", "utf8");
  process.exit(styleManifestDependenciesOnly(before, after) ? 0 : 1);
}
