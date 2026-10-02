// The fixture installs a window before the React bridge loads, so the vnode
// is the client's. The SSR bridge stays out of this process.
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("a carousel client vnode has no suppressHydrationWarning; a button's has it", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./react-hydration-warning.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
