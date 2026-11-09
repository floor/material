// test/ssr/icon.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// A fresh process. The public SSR scope does not install HTMLImageElement.
// test/ssr/construct.fixture.ts does, so it cannot see this crash.
test("public SSR renders a button icon without HTMLImageElement", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./icon.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 30000);
