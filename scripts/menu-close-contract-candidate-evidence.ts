// Evidence only: fresh processes running the unchanged candidate test file.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const mode = process.env.CLOSE_CONTRACT_MODE ?? "normal";
assert(["normal", "stall", "slow"].includes(mode));
const rounds = Number(process.env.CLOSE_CONTRACT_ROUNDS ?? (mode === "normal" ? 500 : mode === "stall" ? 50 : 5));
assert(Number.isSafeInteger(rounds) && rounds > 0);
const source = await Bun.file("test/components/menu/close-contract.test.ts").text();
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const directory = `analysis/menu-close-contract-candidate-${mode}`;
await mkdir(directory, { recursive: true });
const rows: { iteration: number; pass: number; fail: number; pauses: number; delayedReveals: number; status: number }[] = [];
for (let iteration = 1; iteration <= rounds; iteration++) {
  const preload = mode === "slow" ? "./scripts/menu-close-contract-slow-reveal.ts" : "./scripts/menu-close-contract-stall.ts";
  const command = ["bun", "test", "--preload", preload, "test/components/menu/close-contract.test.ts"];
  if (mode !== "slow") command.push("-t", "a click outside before the surface is shown closes it");
  const child = Bun.spawn(command, { stdout: "pipe", stderr: "pipe", env: { ...process.env, CLOSE_CONTRACT_STALL_MS: mode === "stall" ? "40" : "0", NO_COLOR: "1" } });
  const [stdout, stderr, status] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const output = stdout + stderr;
  await writeFile(`${directory}/iteration-${iteration}.log`, output);
  const pass = output.match(/^\(pass\)/gm)?.length ?? 0;
  const fail = output.match(/^\(fail\)/gm)?.length ?? 0;
  const pauses = output.match(/CLOSE_CONTRACT_SCHEDULER_PAUSE/g)?.length ?? 0;
  const delayedReveals = output.match(/CLOSE_CONTRACT_SLOW_REVEAL_250MS/g)?.length ?? 0;
  assert(output.includes(mode === "slow" ? "CLOSE_CONTRACT_SLOW_REVEAL_READY" : "CLOSE_CONTRACT_PRELOAD_READY"), "Preload must run");
  assert.equal(pass + fail, mode === "slow" ? 38 : 2, "Every intended case must complete");
  assert.equal(pauses, 0, "The obsolete 3 ms registration must remain removed; there are zero stall targets");
  if (mode === "slow") assert(delayedReveals > 0, "The 250 ms reveal delay must remain active");
  const row = { iteration, pass, fail, pauses, delayedReveals, status };
  rows.push(row);
  console.log(JSON.stringify(row));
  if (status !== 0 || fail) console.log(output);
  assert.equal(status, 0, "Candidate process must pass");
  assert.equal(fail, 0, "Every candidate case must pass");
}
const summary = { mode, rounds, sourceSha256, passed: rows.reduce((n, r) => n + r.pass, 0), failed: rows.reduce((n, r) => n + r.fail, 0), rows };
await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2));
console.log(`CANDIDATE ${mode}: ${summary.passed} pass / ${summary.failed} fail; source SHA-256 ${sourceSha256}`);
