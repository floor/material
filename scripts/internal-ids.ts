import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The public-history rule: internal ticket references never ship. Comments in
 * src are copied into dist's .d.ts, .svelte and .scss files, so the guard that
 * keeps them out walks the packed files (see check-package-size.ts). The same
 * rule covers the repository everyone reads, which check-internal-ids.ts walks
 * over the tracked files.
 *
 * The pattern catches the lowercase and the hyphenless spellings too: the
 * tracker spells a ticket one way, code and labels had drifted to the others
 * (and `\b` keeps words like `floor` or `float` out of it).
 */
const INTERNAL_ID = /\bflo-?\d+/gi;

/** Every internal ticket reference in `text`, in the order they appear. */
export function internalIdRefs(text: string): string[] {
  return text.match(INTERNAL_ID) ?? [];
}

export interface IdFinding {
  file: string;
  line: number;
  text: string;
}

/** References in one file's text. */
export function scanInternalIds(file: string, text: string): IdFinding[] {
  const findings: IdFinding[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (internalIdRefs(lines[i]).length === 0) continue;
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
