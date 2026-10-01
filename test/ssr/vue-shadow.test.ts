// test/ssr/vue-shadow.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("Vue hosts render through the shared shadow hook, and declarations do not", async () => {
  const create = await Bun.file("src/vue/create.ts").text();
  const hook = await Bun.file("src/vue/shadow.ts").text();
  const tab = await Bun.file("src/vue/tab.ts").text();
  expect(create).toContain("shadow(");
  expect(hook).toContain('Symbol.for("mtrl.ssr")');
  expect(hook).toContain("isBrowser");
  expect(tab).not.toContain("shadow(");
});

// The fixture imports Vue before any DOM shim, so `isBrowser` stays false, and
// the SSR bridge it installs stays in that process.
test("Vue shadow markup is server-only, uses the shared SSR bridge, and skips opt-outs", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./vue-shadow.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
