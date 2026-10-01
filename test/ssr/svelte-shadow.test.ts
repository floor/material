// test/ssr/svelte-shadow.test.ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { elements } from "../../src/elements";
import { declarationModules, elementModules } from "../../scripts/element-modules";
import { componentSource, declarationSource } from "../../scripts/svelte-package";

const branch = "{#if shadow}{@html shadow}{/if}";

test("every generated Svelte element emits the server shadow branch, and declarations do not", () => {
  for (const { name, module, styles } of elementModules) {
    const live = Object.keys(elements[name as keyof typeof elements].spec.properties ?? {});
    const source = componentSource(name, live, module, styles);
    expect(source, name).toContain(branch);
    expect(source, name).toContain("shadowMarkup");
  }
  for (const { name, module } of declarationModules) {
    const source = declarationSource(name, module);
    expect(source, name).not.toContain("shadowMarkup");
    expect(source, name).not.toContain("{@html");
  }
});

// The fixture imports the Svelte runtime before any DOM shim, so `isBrowser`
// stays false, and the SSR bridge it installs stays in that process.
test("Svelte shadow markup is server-only, uses the shared SSR bridge, and skips opt-outs", async () => {
  const child = Bun.spawn([
    process.execPath, "test", fileURLToPath(new URL("./svelte-shadow.fixture.ts", import.meta.url)),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
}, 60000);
