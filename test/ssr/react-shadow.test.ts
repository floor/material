// test/ssr/react-shadow.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// The fixture imports React before any DOM shim. The SSR bridge it installs
// stays in that process.
test("React bridge renders ordinary host attributes and keeps them out of the shadow markup", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./react-shadow.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
