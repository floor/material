// test/ssr/security.test.ts
// Run in an isolated server process so the other suites' browser shims cannot
// conceal restoration or policy bugs. Chromium reparsing lives in ssr-security:check.
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
test("SSR security: escaping, CSS, URLs, policy and restoration without a browser", async () => {
  const child = Bun.spawn([process.execPath, "test", fileURLToPath(new URL("./security.fixture.ts", import.meta.url))], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
