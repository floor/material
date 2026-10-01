// test/ssr/security.test.ts
// Hostile outputs are reparsed by Chromium, in an isolated server process so
// the other suites' browser shims cannot conceal restoration or policy bugs.
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
test("SSR security: escaping, parser contexts, CSS, URLs, policy and restoration in Chromium", async () => {
  const child = Bun.spawn([process.execPath, "test", fileURLToPath(new URL("./security.fixture.ts", import.meta.url))], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
