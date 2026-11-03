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

const lines = (text: string): string[] => text.split("\n").filter((line) => line !== "");

test("a shipped module keeps its tokens and one line per statement, and loses only indentation", async () => {
  const original = [
    "export const createWidget = (name) => {",
    "  const label = `w-${name}`;",
    "  if (process.env.NODE_ENV !== \"production\") {",
    "    warnUnknownValue(name);",
    "  }",
    "  return { label };",
    "};",
    "",
  ].join("\n");
  const directory = await tree({
    "components/widget.js": original,
    "components/widget.d.ts": "export declare const createWidget: (name: string) => unknown;\n",
  });
  const { files, bytes } = await stripShippedModules(directory);
  const text = await readFile(join(directory, "components/widget.js"), "utf8");
  // The runtime read is not folded, and the identifiers survive.
  expect(text).toContain('process.env.NODE_ENV !== "production"');
  expect(text).toContain("createWidget");
  // Indentation goes; every statement keeps its own line.
  expect(text).not.toContain("\n  ");
  expect(lines(text)).toEqual([
    "export const createWidget = (name) => {",
    "const label = `w-${name}`;",
    'if (process.env.NODE_ENV !== "production") {',
    "warnUnknownValue(name);",
    "}",
    "return { label };",
    "};",
  ]);
  expect(files).toBe(1);
  expect(bytes).toBeGreaterThan(0);
  // Declarations are not runtime modules: they ship as the compiler emitted them.
  expect(await readFile(join(directory, "components/widget.d.ts"), "utf8"))
    .toBe("export declare const createWidget: (name: string) => unknown;\n");
});

test("prose comments go, the pure annotation and the licence banners stay", async () => {
  const directory = await tree({
    "components/pure.js": [
      "// prose that must not ship",
      "export const made = /*#__PURE__*/ create();",
      "/* prose block */",
      "/*! material licence */",
      "/* @license MIT */",
      "export const other = 1;",
      "",
    ].join("\n"),
  });
  await stripShippedModules(directory);
  const text = await readFile(join(directory, "components/pure.js"), "utf8");
  expect(text).not.toContain("prose");
  expect(text).toContain("/*#__PURE__*/");
  expect(text).toContain("/*! material licence */");
  expect(text).toContain("/* @license MIT */");
});

test("a regex, a template literal and a division are left alone", async () => {
  const template = [
    "const pattern = /[/*]/g;",
    "const text = `first",
    "  second ${value}",
    "  third`;",
    "const ratio = total / count;",
    "",
  ].join("\n");
  const directory = await tree({ "components/literals.js": template });
  await stripShippedModules(directory);
  const text = await readFile(join(directory, "components/literals.js"), "utf8");
  expect(text).toContain("/[/*]/g");
  expect(text).toContain("  second ${value}");
  expect(text).toContain("  third");
  expect(text).toContain("total / count");
});

test("the SSR, element-CSS, style and svelte modules are untouched", async () => {
  const ssr = "const a = 1;\nconst b = 2;\nexport { a, b };\n";
  const element = 'import { registerStyles } from "../styles.js";\nregisterStyles({ "base": "a  b" });\n';
  const style = 'import "./base.js";\nimport "./typography.css";\n';
  const svelte = 'export { default as TextField } from "./TextField.svelte";\n';
  const directory = await tree({
    "ssr/index.js": ssr,
    "elements/css/base.js": element,
    "styles/typography.js": style,
    "svelte/index.js": svelte,
  });
  const { files } = await stripShippedModules(directory);
  expect(files).toBe(0);
  expect(await readFile(join(directory, "ssr/index.js"), "utf8")).toBe(ssr);
  expect(await readFile(join(directory, "elements/css/base.js"), "utf8")).toBe(element);
  expect(await readFile(join(directory, "styles/typography.js"), "utf8")).toBe(style);
  expect(await readFile(join(directory, "svelte/index.js"), "utf8")).toBe(svelte);
});
