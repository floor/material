#!/usr/bin/env bun
// Fails when any tracked file names a seat or a persona.
//
// check-internal-ids.ts keeps the tracker's ids out of the tracked files; this
// keeps the team's own names out of them too. The names, and the one file
// allowed to spell them, are in public-names.ts.
//
//   bun run public-names:check
import { scanTrackedTree } from "./public-names";

const ROOT = new URL("..", import.meta.url).pathname;

const findings = scanTrackedTree(ROOT);

if (findings.length > 0) {
  for (const f of findings) {
    console.error(`${f.file}:${f.line}: ${f.text}`);
  }
  console.error(`\n${findings.length} public name(s) in the repository.`);
  process.exit(1);
}

console.log("check-public-names: no seat or persona names in the tracked files");
