// test/ssr/render-element.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
test("public SSR rendering in an isolated realm", async () => {
  const child = Bun.spawn([process.execPath, "test", fileURLToPath(new URL("./render.fixture.ts", import.meta.url))], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect(code, stdout + stderr).toBe(0);
}, 30000);

test("client entries cannot reach SSR", async () => {
  for (const entry of ["src/index.ts", "src/elements/index.ts", "src/react/index.ts", "src/vue/index.ts", "src/solid/index.ts", "src/svelte/runtime.ts"]) {
    const result = await Bun.build({ entrypoints: [entry], target: "browser", packages: "external", sourcemap: "external" });
    expect(result.success, String(result.logs)).toBe(true);
    const map = await result.outputs.find(output => output.kind === "sourcemap")!.json();
    expect(map.sources.some((source: string) => /\/ssr\//.test(source)), entry).toBe(false);
  }
});
