// test/ssr/sheet-variant.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// A fresh process: the server entry installs its own DOM scope.
test("sheet variant=modal renders on the server, including the framework bridge", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./sheet-variant.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
