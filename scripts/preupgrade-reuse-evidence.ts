// CI-only harness, kept outside the production PR. Instrument the same assertion
// import on both trees, and plant exactly the same built-CSS regression.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";

const root = process.cwd();
const directory = `${root}/analysis/preupgrade-evidence`;
await mkdir(directory, { recursive: true });
const source = await Bun.file("scripts/check-preupgrade.ts").text();
const instrumented = source.replace('import assert from "node:assert/strict";', `
import nativeAssert from "node:assert/strict";
let assertionCount = 0;
const assert = new Proxy(nativeAssert, {
  apply(target, receiver, arguments_) {
    assertionCount++;
    return Reflect.apply(target, receiver, arguments_);
  },
  get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === "function" ? (...arguments_: unknown[]) => {
      assertionCount++;
      return Reflect.apply(value, target, arguments_);
    } : value;
  },
});
process.on("exit", () => {
  require("node:fs").writeFileSync(process.env.PREUPGRADE_ASSERTIONS!, JSON.stringify({ assertions: assertionCount }));
  console.log("PREUPGRADE_ASSERTIONS", assertionCount);
});
`);
assert.notEqual(instrumented, source, "Assertion instrumentation did not attach");
const script = "scripts/.check-preupgrade-speed-evidence.ts";
await Bun.write(script, instrumented);
const { cases } = await import(`${root}/scripts/fixtures/preupgrade-cases.ts`) as {
  cases: { element: string; variant: string; hostHeight?: number }[];
};
const manifest = {
  withStyles: cases.length,
  withoutStyles: cases.filter(item => item.hostHeight === undefined).length,
  sha256: createHash("sha256").update(JSON.stringify(cases)).digest("hex"),
  cases,
};
await Bun.write(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log("PREUPGRADE_MANIFEST", JSON.stringify({ ...manifest, cases: undefined }));

const run = async (name: string, filters: string[]) => {
  const started = performance.now();
  const child = Bun.spawn(["bun", script, ...filters], {
    env: { ...process.env, PREUPGRADE_ASSERTIONS: `${directory}/${name}-assertions.json`, PREUPGRADE_RESULTS: `${directory}/${name}-rows.json` },
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  await Bun.write(`${directory}/${name}.log`, stdout + stderr);
  const assertions = await Bun.file(`${directory}/${name}-assertions.json`).json();
  const result = { name, status, seconds: (performance.now() - started) / 1000, ...assertions };
  console.log("PREUPGRADE_RUN", JSON.stringify(result));
  console.log(stdout.split("\n").filter(line => /Mutation: \d|React render|preupgrade check passed|^ {2}FAIL/.test(line)).join("\n"));
  if (status) console.log(stderr);
  return result;
};
try {
  const clean = await run("clean", []);
  assert.equal(clean.status, 0, "Clean preupgrade check failed");
  const cssPath = "dist/elements/preupgrade.css";
  const css = await Bun.file(cssPath).text();
  let seeded;
  try {
    // One component's placeholder moves 8px; its upgraded host does not.
    await Bun.write(cssPath, `${css}\nm-button:not(:defined){transform:translateX(8px)!important}\n`);
    seeded = await run("seeded", ["button"]);
    assert.notEqual(seeded.status, 0, "The deliberately shifted button was not caught");
    assert((await Bun.file(`${directory}/seeded.log`).text()).includes("Cases that shift on upgrade"));
  } finally { await Bun.write(cssPath, css); }
  await Bun.write(`${directory}/summary.json`, JSON.stringify({ clean, seeded }, null, 2));
} finally { await Bun.file(script).delete(); }
