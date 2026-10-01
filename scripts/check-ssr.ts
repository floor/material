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
await run("parity", "chromium");
for (const engine of ["chromium", "firefox", "webkit"]) {
  await run("security", engine);
  await run("upgrade", engine);
}
const seconds = (performance.now() - started) / 1000;
const previous = timings.filter(t => ["parity/chromium", "security/chromium"].includes(t.check)).reduce((sum, t) => sum + t.seconds, 0);
await mkdir("analysis/ssr-upgrade", { recursive: true });
await Bun.write("analysis/ssr-upgrade/timing.json", JSON.stringify({ timings, seconds, addedSeconds: seconds - previous }, null, 2));
console.log(`ssr:check: ${seconds.toFixed(1)}s total, ${(seconds - previous).toFixed(1)}s added to browser (components), excluding browser installation`);
