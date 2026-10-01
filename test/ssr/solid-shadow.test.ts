// test/ssr/solid-shadow.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("Solid hosts render through the shared shadow hook, and declarations do not", async () => {
  const create = await Bun.file("src/solid/create.ts").text();
  const hook = await Bun.file("src/solid/shadow.ts").text();
  const tab = await Bun.file("src/solid/tab.ts").text();
  expect(create).toContain("shadow(");
  expect(hook).toContain('Symbol.for("mtrl.ssr")');
  expect(hook).toContain("isServer");
  expect(tab).not.toContain("shadow(");
});

// The fixture imports Solid's server build before any DOM shim, so `isServer`
// stays true, and the SSR bridge it installs stays in that process.
test("Solid shadow markup is server-only, uses the shared SSR bridge, and skips opt-outs", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./solid-shadow.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
