#!/usr/bin/env bun
// scripts/check-ssr.ts
// One CI entry: structural parity in Chromium, parsing and upgrade/paint in all engines.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const started = performance.now();
const timings: { check: string; seconds: number }[] = [];
const run = async (script: string, engine: string) => {
  const start = performance.now();
  const process = Bun.spawn(["bun", "run", `scripts/check-ssr-${script}.ts`, `--engine=${engine}`], { stdout: "pipe", stderr: "inherit" });
  let output = "";
  const decoder = new TextDecoder();
  for await (const chunk of process.stdout) {
    const text = decoder.decode(chunk, { stream: true }); output += text; Bun.stdout.write(text);
  }
  assert.equal(await process.exited, 0, `${script}/${engine} failed`);
  // An ignored --engine argument must not silently count Chromium three times.
  assert.match(output, new RegExp(`SSR ${script} ${engine}: \\d+ equal, \\d+ exceptions, 0 failures`), `${script} did not prove coverage for ${engine}`);
  timings.push({ check: `${script}/${engine}`, seconds: (performance.now() - start) / 1000 });
};
// CI runs this check as two matrix rows (.github/workflows/ci.yml), split by
// engine at the measured boundary: on run 41317795666 the Chromium part --
// parity and its three checks -- took 36.3s of the 193.7s the script ran, and
// the firefox and webkit part 127.9s. Part a is chromium, part b is firefox and
// webkit, so the two rows run every sub-run exactly once; parity is Chromium's
// alone and stays in part a. With no argument every part runs -- what a local
// `bun run ssr:check` does.
const parts = process.argv.slice(2);
const selected = (part: string): boolean => parts.length === 0 || parts.includes(part);
assert.deepEqual(parts.filter(part => part !== "a" && part !== "b"), [], "a part is a or b");
if (selected("a")) await run("parity", "chromium");
const engines = [
  ...(selected("a") ? ["chromium"] : []),
  ...(selected("b") ? ["firefox", "webkit"] : []),
];
for (const engine of engines) {
  await run("security", engine);
  await run("upgrade", engine);
  await run("fallback", engine);
}
const seconds = (performance.now() - started) / 1000;
await mkdir("analysis/ssr-upgrade", { recursive: true });
await Bun.write("analysis/ssr-upgrade/timing.json", JSON.stringify({ parts, timings, seconds }, null, 2));
console.log(`ssr:check${parts.length ? ` (${parts.join(", ")})` : ""}: ${seconds.toFixed(1)}s total over ${timings.length} sub-runs`);
