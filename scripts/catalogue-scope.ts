#!/usr/bin/env bun
/**
 * Whether a style-manifest edit is only ordinary component dependency edges.
 * Catalogue data lives in the same file. A dependency edge is what the build
 * requires when a component retains another at runtime, and it is not catalogue
 * data. An optional profile's dependency list is catalogue data: that profile
 * is a published sheet. Any other change in the file still is.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const COMPONENT_EDGES = /dependencies:\s*\[[^\]]*\]/g;
const PROFILES = "export const optionalStyleProfiles";

/** Blank `dependencies` arrays in the component section, and leave the rest. */
const withoutComponentEdges = (text: string): string => {
  const at = text.indexOf(PROFILES);
  if (at === -1) return text.replace(COMPONENT_EDGES, "dependencies: []");
  return text.slice(0, at).replace(COMPONENT_EDGES, "dependencies: []") + text.slice(at);
};

/** True when the two manifests differ only inside component `dependencies` arrays. */
export function styleManifestDependenciesOnly(before: string, after: string): boolean {
  return withoutComponentEdges(before) === withoutComponentEdges(after);
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
