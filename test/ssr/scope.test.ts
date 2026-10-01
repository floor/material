// test/ssr/scope.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("server scope lifecycle, fidelity and teardown in an isolated process", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./scope.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 20000);
