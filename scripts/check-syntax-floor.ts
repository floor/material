#!/usr/bin/env bun
// scripts/check-syntax-floor.ts
//
// Build first. Fails when a JavaScript file in the built package needs syntax
// newer than the floor README.md states, and prints each one with the position
// its parser rejects. See scripts/syntax-floor.ts for the rule.
import { checkSyntaxFloor, SYNTAX_FLOOR } from "./syntax-floor";

const dir = process.argv[2] ?? "dist";
const { files, failures } = await checkSyntaxFloor(dir);

if (failures.length > 0) {
  console.error(`✗ ${failures.length} of ${files.length} dist JS files need syntax newer than ES${SYNTAX_FLOOR}:`);
  for (const failure of failures) {
    console.error(`  ${failure.file}:${failure.line}:${failure.column}  ${failure.message}`);
  }
  console.error(`The published package must parse at ES${SYNTAX_FLOOR}, the floor README.md's Browser support section states.`);
  process.exit(1);
}

console.log(`✓ every dist JS file parses at ES${SYNTAX_FLOOR} (${files.length} files)`);
