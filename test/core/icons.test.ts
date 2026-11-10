// test/core/icons.test.ts
//
// The icon registry: process state merged by name, cleared by null, undefined
// or "", and read as a fallback by the components that draw a glyph. And the
// property that lets it sit at the package root: importing `setIcons` alone
// keeps every component, and every glyph, out of the bundle.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getIcon, setIcons } from "../../src/core/icons";
import { getIcon as getIconFromCore, setIcons as setIconsFromCore } from "../../src/core";

const CLEAR = { menu: null, "menu-open": null, close: null, "expand-more": null } as const;

afterEach(() => setIcons(CLEAR));

describe("the icon registry", () => {
  test("returns the component's own fallback while nothing is set", () => {
    expect(getIcon("menu", "<built-in>")).toBe("<built-in>");
    expect(getIcon("close", "<built-in-close>")).toBe("<built-in-close>");
    expect(getIcon("expand-more", "<built-in-more>")).toBe("<built-in-more>");
  });

  test("setIcons touches only the names it is given", () => {
    setIcons({ menu: "<app-menu>" });
    expect(getIcon("menu", "fallback")).toBe("<app-menu>");
    expect(getIcon("close", "fallback-close")).toBe("fallback-close");

    setIcons({ close: "<app-close>" });
    expect(getIcon("menu", "fallback")).toBe("<app-menu>");
    expect(getIcon("close", "fallback-close")).toBe("<app-close>");
  });

  test("null, undefined and the empty string each restore the built-in", () => {
    setIcons({ menu: "<app-menu>", "menu-open": "<app-open>", close: "<app-close>" });

    setIcons({ menu: null });
    expect(getIcon("menu", "fallback")).toBe("fallback");
    expect(getIcon("menu-open", "fallback")).toBe("<app-open>");

    setIcons({ "menu-open": undefined });
    expect(getIcon("menu-open", "fallback")).toBe("fallback");
    expect(getIcon("close", "fallback")).toBe("<app-close>");

    setIcons({ close: "" });
    expect(getIcon("close", "fallback")).toBe("fallback");
  });

  test("an unknown name changes nothing for a JavaScript caller", () => {
    setIcons({ nope: "<app-nope>" } as never);
    expect(getIcon("menu", "fallback")).toBe("fallback");
    expect(getIcon("close", "fallback")).toBe("fallback");
  });

  test("material/core exports the same registry as material/core/icons", () => {
    setIconsFromCore({ menu: "<app-menu>" });
    expect(getIcon("menu", "fallback")).toBe("<app-menu>");
    expect(getIconFromCore("menu", "fallback")).toBe("<app-menu>");
  });
});

describe("the registry's tree-shaking cost", () => {
  const root = join(import.meta.dir, "../..");
  const scratch = join(root, "tmp", "icons-probe");

  const build = async (name: string, source: string): Promise<string> => {
    mkdirSync(scratch, { recursive: true });
    const entry = join(scratch, `${name}.ts`);
    await Bun.write(entry, source);
    const result = await Bun.build({
      entrypoints: [entry],
      minify: true,
      target: "browser",
      format: "esm",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    expect(result.success, String(result.logs)).toBe(true);
    const chunks = result.outputs.filter((output) => output.path.endsWith(".js"));
    return (await Promise.all(chunks.map((chunk) => chunk.text()))).join("\n");
  };

  test("importing setIcons alone carries no component and no glyph", async () => {
    rmSync(scratch, { recursive: true, force: true });
    const text = await build("set-icons", `import { setIcons } from ${JSON.stringify(join(root, "src/index.ts"))}; globalThis.__v = setIcons;`);
    expect(text).not.toContain("<svg");
    expect(text).not.toContain("m256-200");
    expect(text).not.toContain("mtrl-");
  }, 30000);

  test("the probe sees the glyph when a component is imported", async () => {
    const text = await build("side-sheet", `import { createSideSheet } from ${JSON.stringify(join(root, "src/components/side-sheet/index.ts"))}; globalThis.__v = createSideSheet;`);
    expect(text).toContain("m256-200");
  }, 30000);
});
