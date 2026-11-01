// Evidence only: each repetition runs the unchanged main test in a fresh process.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const rounds = Number(process.env.CLOSE_CONTRACT_ROUNDS ?? 500);
const stall = Number(process.env.CLOSE_CONTRACT_STALL_MS ?? 0);
assert(Number.isSafeInteger(rounds) && rounds > 0);
const directory = `analysis/menu-close-contract-${stall}`;
await mkdir(directory, { recursive: true });
const source = await Bun.file("test/components/menu/close-contract.test.ts").text();
const lines = source.split("\n");
const assertionLine = lines.findIndex((line, index) =>
  line.includes("expect(menu.element.classList.contains(VISIBLE)).toBe(false)") &&
  lines[index - 1].includes("await later()")) + 1;
assert(assertionLine > 0, "The original pre-reveal observation must still be present");
const iterations: { iteration: number; pass: number; fail: number; pauses: number; status: number; milliseconds: number }[] = [];
let passed = 0, failed = 0;
const started = performance.now();
for (let iteration = 1; iteration <= rounds; iteration++) {
  const before = performance.now();
  const child = Bun.spawn([
    "bun", "test", "--preload", "./scripts/menu-close-contract-stall.ts",
    "test/components/menu/close-contract.test.ts", "-t",
    "a click outside before the surface is shown closes it",
  ], { stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  const output = stdout + stderr;
  await writeFile(`${directory}/iteration-${iteration}.log`, output);
  const pauses = output.match(/CLOSE_CONTRACT_SCHEDULER_PAUSE/g)?.length ?? 0;
  const pass = output.match(/^\(pass\).*a click outside before the surface is shown closes it/gm)?.length ?? 0;
  const fail = output.match(/^\(fail\).*a click outside before the surface is shown closes it/gm)?.length ?? 0;
  assert(output.includes("CLOSE_CONTRACT_PRELOAD_READY"), "Preload did not execute");
  assert.equal(pauses, stall ? 2 : 0, "Both intended layer cases must exercise the requested scheduling mode");
  assert.equal(pass + fail, 2, "Exactly the two intended layer cases must complete");
  assert.equal(status === 0, fail === 0, "Process status must agree with measured case results");
  if (fail) {
    assert(output.includes(`close-contract.test.ts:${assertionLine}:`), "Failure must reach the original pre-reveal assertion");
    assert(output.includes("Expected: false") && output.includes("Received: true"), "Failure must be the original visible-class precondition");
    console.log(output);
  }
  passed += pass; failed += fail;
  const row = { iteration, pass, fail, pauses, status, milliseconds: performance.now() - before };
  iterations.push(row);
  console.log(JSON.stringify(row));
}
const summary = { rounds, cases: rounds * 2, stall, passed, failed, failureRate: failed / (rounds * 2), assertionLine, milliseconds: performance.now() - started, iterations };
await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2) + "\n");
console.log(`CLOSE_CONTRACT stall=${stall}ms: ${passed}/${rounds * 2} pass, ${failed}/${rounds * 2} fail`);
if (stall) assert.equal(failed, rounds * 2, "Controlled delay must reproduce the exact failure in both layers every round");
