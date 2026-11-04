#!/usr/bin/env bun
// scripts/check-ssr-comments.ts
//
// Build first. Fails when a dist/ssr adapter entry is over its minified byte
// ceiling or ships a comment other than a licence banner (`/*!`) or a
// tree-shaking annotation. The adapters are TypeScript emits rather than
// bundles, the packed package carries them, and the build minifies them, so a
// readable emit or a stray prose comment here is a byte every install
// downloads.
//
//   bun run build && bun run ssr-comments:check
import ts from "typescript";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SSR_ADAPTER_BYTES } from "./budgets";

const dir = process.argv[2] ?? "dist";
const ADAPTERS = ["react.js", "svelte.js", "vue.js", "solid.js"];

const findings: { file: string; line: number; text: string }[] = [];
const missing: string[] = [];
const oversized: { file: string; bytes: number; ceiling: number }[] = [];
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
  const ceiling = SSR_ADAPTER_BYTES[adapter.replace(/\.js$/, "") as keyof typeof SSR_ADAPTER_BYTES];
  sizes.push(`${adapter.slice(0, -3)} ${bytes.toLocaleString("en-US")} B`);
  if (bytes > ceiling) oversized.push({ file, bytes, ceiling });
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

if (oversized.length > 0) {
  for (const { file, bytes, ceiling } of oversized) {
    console.error(`✗ ${file}: ${bytes.toLocaleString("en-US")} B is over the ${ceiling.toLocaleString("en-US")} B ceiling`);
  }
  console.error("\nThe build ships the four SSR adapter entries minified: extend build-modules.ts, and set");
  console.error("SSR_ADAPTER_BYTES from the measured emit in the same change.");
  failed = true;
}

if (failed) process.exit(1);

console.log(`✓ the four SSR adapter entries are minified and carry no prose comments (${sizes.join(", ")}; ${dir}/ssr)`);
