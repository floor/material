#!/usr/bin/env bun
/**
 * Whether a style-manifest edit is only ordinary component dependency edges.
 * Catalogue data lives in the same file. A dependency edge is what the build
 * requires when a component retains another at runtime, and it is not catalogue
 * data. An opt-in component entry and an optional profile are published
 * sheets, so their dependency lists stay catalogue data. Any other change in
 * the file still is.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const COMPONENT_EDGES = /dependencies:\s*\[[^\]]*\]/g;

/** The object literal that holds the dependency array at this offset. */
const entryHolding = (text: string, index: number): string => {
  const open = text.lastIndexOf("{", index);
  const close = text.indexOf("}", index);
  if (open === -1 || close === -1) return "";
  return text.slice(open, close + 1);
};

/** Blank dependency arrays of ordinary component entries, and leave the rest. */
const withoutComponentEdges = (text: string): string =>
  text.replace(COMPONENT_EDGES, (match, offset: number) => {
    const entry = entryHolding(text, offset);
    if (!entry.includes("source:") || entry.includes("optIn")) return match;
    return "dependencies: []";
  });

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
