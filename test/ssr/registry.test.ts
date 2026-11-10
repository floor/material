// test/ssr/registry.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// A fresh process: the server entry installs its own DOM scope, so the
// registry's server path is measured without a browser's globals.
test("the icon registry renders on the server, and clears back to the built-in", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./registry.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 30000);
