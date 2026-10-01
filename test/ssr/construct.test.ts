// test/ssr/construct.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// Other suites install browser API shims and cache DOM-dependent modules.
// A fresh process ensures this check always runs on bare linkedom.
test("all elements construct on bare linkedom", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./construct.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 15000);
