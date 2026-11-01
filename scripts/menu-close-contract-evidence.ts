// Evidence only: a separate process per iteration also exercises fixture setup
// and teardown. Keep every failure in the log and count both layer cases.
export {};
const rounds = 50;
let passed = 0, failed = 0;
for (let iteration = 1; iteration <= rounds; iteration++) {
  const started = performance.now();
  const child = Bun.spawn([
    "bun", "test", "--preload", "./scripts/menu-close-contract-stall.ts",
    "test/components/menu/close-contract.test.ts", "-t",
    "a click outside before the surface is shown closes it",
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  const output = stdout + stderr;
  const stalls = output.match(/CLOSE_CONTRACT_SCHEDULER_PAUSE/g)?.length ?? 0;
  if (Number(process.env.CLOSE_CONTRACT_STALL_MS) && stalls !== 2) {
    console.log(output);
    throw new Error(`Expected two controlled pauses; measured ${stalls}`);
  }
  const pass = output.match(/^\(pass\).*a click outside before the surface is shown closes it/gm)?.length ?? 0;
  const fail = output.match(/^\(fail\).*a click outside before the surface is shown closes it/gm)?.length ?? 0;
  passed += pass; failed += fail;
  console.log(`iteration ${iteration}/${rounds}: ${pass} pass, ${fail} fail, ${stalls} pauses, exit ${status}, ${(performance.now() - started).toFixed(1)} ms`);
  if (status || pass !== 2) console.log(output);
  if ((!pass && !fail) || pass + fail !== 2 || (status && !fail)) {
    throw new Error("The two intended cases did not complete; not a flake measurement");
  }
}
console.log(`CLOSE_CONTRACT stall=${process.env.CLOSE_CONTRACT_STALL_MS ?? 0}ms: ${passed}/${rounds * 2} pass, ${failed}/${rounds * 2} fail`);
if (failed) process.exitCode = 1;
