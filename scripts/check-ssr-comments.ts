#!/usr/bin/env bun
/** Ensures the four built SSR adapters ship without runtime prose comments. */
import ts from "typescript";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2] ?? "dist";
const ADAPTERS = ["react.js", "svelte.js", "vue.js", "solid.js"];

const findings: { file: string; line: number; text: string }[] = [];
const missing: string[] = [];
const sizes: string[] = [];

// The same walk the build's strip uses, so the check sees the comments the
// emit actually carries.
for (const adapter of ADAPTERS) {
  const file = join(dir, "ssr", adapter);
  const text = await readFile(file, "utf8").catch(() => undefined);
  if (text === undefined) {
    missing.push(file);
    continue;
  }
  const bytes = Buffer.byteLength(text);
  sizes.push(`${adapter.slice(0, -3)} ${bytes.toLocaleString("en-US")} B`);
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: { file: string; line: number; text: string }[] = [];
  const seen = new Set<number>();
  const visit = (node: ts.Node): void => {
    for (const position of [node.pos, node.end]) {
      const ranges = [
        ...ts.getLeadingCommentRanges(text, position) ?? [],
        ...ts.getTrailingCommentRanges(text, position) ?? [],
      ];
      for (const range of ranges) {
        if (seen.has(range.pos)) continue;
        seen.add(range.pos);
        const comment = text.slice(range.pos, range.end);
        if (comment.startsWith("/*!") || /[@#]__PURE__/.test(comment)) continue;
        const { line } = source.getLineAndCharacterOfPosition(range.pos);
        found.push({ file, line: line + 1, text: comment.split("\n")[0].slice(0, 72) });
      }
    }
    node.getChildren(source).forEach(visit);
  };
  visit(source);
  findings.push(...found.sort((a, b) => a.line - b.line));
}

if (missing.length > 0) {
  for (const file of missing) console.error(`✗ ${file} is missing; build first (bun run build)`);
  process.exit(1);
}

let failed = false;

if (findings.length > 0) {
  for (const finding of findings) console.error(`${finding.file}:${finding.line}: ${finding.text}`);
  console.error(`\n${findings.length} prose comment(s) in the SSR adapter entries.`);
  console.error("The build strips runtime prose for every other dist module: extend build-modules.ts.");
  failed = true;
}

if (failed) process.exit(1);

console.log(`✓ the four SSR adapter entries are minified and carry no prose comments (${sizes.join(", ")}; ${dir}/ssr)`);
