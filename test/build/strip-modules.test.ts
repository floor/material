// test/build/strip-modules.test.ts
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stripShippedModules } from "../../scripts/build-modules";

/** A dist tree under a temporary directory, keyed by dist-relative path. */
async function tree(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mtrl-strip-"));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(directory, path, ".."), { recursive: true });
    await writeFile(join(directory, path), text);
  }
  return directory;
}

test("a shipped module keeps its identifiers and loses its formatting", async () => {
  const directory = await tree({
    "components/widget.js": [
      "export const createWidget = (name) => {",
      "  const label = `w-${name}`;",
      "  return { label, open() { return label; } };",
      "};",
      "",
    ].join("\n"),
    "components/widget.d.ts": "export declare const createWidget: (name: string) => unknown;\n",
  });
  const { files, bytes } = await stripShippedModules(directory);
  const text = await readFile(join(directory, "components/widget.js"), "utf8");
  expect(text).toContain("createWidget");
  expect(text).not.toContain("\n");
  expect(files).toBe(1);
  expect(bytes).toBeGreaterThan(0);
  // Declarations are not runtime modules: they ship as the compiler emitted them.
  expect(await readFile(join(directory, "components/widget.d.ts"), "utf8"))
    .toBe("export declare const createWidget: (name: string) => unknown;\n");
});

test("the pure-annotated, SSR, element-CSS, style and svelte modules are untouched", async () => {
  const pure = 'export const values = /*#__PURE__*/ new Set(["a"]);\n';
  const ssr = "const a = 1;\nconst b = 2;\nexport { a, b };\n";
  const element = 'import { registerStyles } from "../styles.js";\nregisterStyles({ "base": "a  b" });\n';
  const style = 'import "./base.js";\nimport "./typography.css";\n';
  const svelte = 'export { default as TextField } from "./TextField.svelte";\n';
  const directory = await tree({
    "components/pure.js": pure,
    "ssr/index.js": ssr,
    "elements/css/base.js": element,
    "styles/typography.js": style,
    "svelte/index.js": svelte,
  });
  const { files } = await stripShippedModules(directory);
  expect(files).toBe(0);
  expect(await readFile(join(directory, "components/pure.js"), "utf8")).toBe(pure);
  expect(await readFile(join(directory, "ssr/index.js"), "utf8")).toBe(ssr);
  expect(await readFile(join(directory, "elements/css/base.js"), "utf8")).toBe(element);
  expect(await readFile(join(directory, "styles/typography.js"), "utf8")).toBe(style);
  expect(await readFile(join(directory, "svelte/index.js"), "utf8")).toBe(svelte);
});
