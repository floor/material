#!/usr/bin/env bun
// Fails when any tracked file carries an internal ticket reference.
//
// check-package-size.ts guards the packed files, but the repository itself is
// public too: README, CHANGELOG and the comments in test/ and scripts/ are read
// by everyone. One exception, named in internal-ids.ts: the text-field rename
// table's `old` values quote the trees the rename tool rewrites byte for byte.
//
//   bun run ids:check
import { scanTrackedTree } from "./internal-ids";

const ROOT = new URL("..", import.meta.url).pathname;

const findings = scanTrackedTree(ROOT);

if (findings.length > 0) {
  for (const f of findings) {
    console.error(`${f.file}:${f.line}: ${f.text}`);
  }
  console.error(`\n${findings.length} internal reference(s) in the repository.`);
  process.exit(1);
}

console.log("check-internal-ids: no internal references in the tracked files");
