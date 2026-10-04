import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The public-history rule: internal ticket references never ship. Comments in
 * src are copied into dist's .d.ts, .svelte and .scss files, so the guard that
 * keeps them out walks the packed files (see check-package-size.ts). The same
 * rule covers the repository everyone reads, which check-internal-ids.ts walks
 * over the tracked files.
 */
const INTERNAL_ID = /FLO-\d+/g;

/** Every internal ticket reference in `text`, in the order they appear. */
export function internalIdRefs(text: string): string[] {
  return text.match(INTERNAL_ID) ?? [];
}

/**
 * Lines one file is exempt on, and why. The text-field rename table's `old`
 * values must byte-match the trees scripts/rename-text-field.ts rewrites, so
 * the references those trees carry have to stay; its `new` and `reason` values
 * follow the rule like any other text.
 */
export const ID_EXEMPT_LINES = new Map<string, RegExp>([
  ["scripts/text-field-rename-entries.ts", /^\s*old: /],
]);

export interface IdFinding {
  file: string;
  line: number;
  text: string;
}

/** References in one file's text, skipping the lines the file is exempt on. */
export function scanInternalIds(file: string, text: string): IdFinding[] {
  const exempt = ID_EXEMPT_LINES.get(file);
  const findings: IdFinding[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (internalIdRefs(lines[i]).length === 0) continue;
    if (exempt?.test(lines[i])) continue;
    findings.push({ file, line: i + 1, text: lines[i].trim() });
  }
  return findings;
}

/**
 * References in every tracked file under `root`. The repository is its tracked
 * files: `.git` and the build output (dist/, node_modules/) are not part of it.
 */
export function scanTrackedTree(root: string): IdFinding[] {
  const files = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const findings: IdFinding[] = [];
  for (const file of files) {
    const bytes = readFileSync(resolve(root, file));
    if (bytes.includes(0)) continue; // a binary file
    findings.push(...scanInternalIds(file, bytes.toString("utf8")));
  }
  return findings;
}
