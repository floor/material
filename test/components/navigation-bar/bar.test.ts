import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
// Isolate DOM globals and listeners from unrelated component test fixtures, as the rail's.
test("navigation bar (FLO-305)", async () => {
    const child = Bun.spawn([process.execPath, "test", fileURLToPath(new URL("./bar.fixture.ts", import.meta.url))], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    expect(code, stdout + stderr).toBe(0);
});
