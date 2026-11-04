// test/build/syntax-floor.test.ts
import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "acorn";
import { checkSyntaxFloor } from "../../scripts/syntax-floor";

/** A dist tree under a temporary directory, keyed by dist-relative path. */
async function tree(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mtrl-syntax-"));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(directory, path, ".."), { recursive: true });
    await writeFile(join(directory, path), text);
  }
  return directory;
}

describe("the syntax floor", () => {
  test("passes what the ES2022 target emits: private members, a static block, class fields", async () => {
    const directory = await tree({
      "elements/define.js": [
        "class Widget extends HTMLElement {",
        "  #form = null;",
        "  #syncForm() { return this.#form ?? null; }",
        "  static { this.formAssociated = true; }",
        "  hasForm(host) { return #form in host; }",
        "}",
        "export const widget = (name) => new Widget(name?.trim() ?? '');",
        "",
      ].join("\n"),
    });
    const { files, failures } = await checkSyntaxFloor(directory);
    expect(files).toEqual(["elements/define.js"]);
    expect(failures).toEqual([]);
  });

  test("fails one edition later, naming the file and the position", async () => {
    // A regex `v` flag is ES2024: every current browser runs it, and a parser
    // at the package's floor does not.
    const source = "export const re = /[\\p{Letter}--[a-z]]/v;\n";
    expect(() => parse(source, { ecmaVersion: 2024, sourceType: "module" })).not.toThrow();
    const directory = await tree({ "core/sets.js": source });
    const { failures } = await checkSyntaxFloor(directory);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ file: "core/sets.js", line: 1, message: "Invalid regular expression flag" });
    expect(failures[0].column).toBeGreaterThan(0);
  });

  test("reads every module extension, in every directory, and nothing else", async () => {
    const directory = await tree({
      "index.js": "export const one = 1;\n",
      "adapters/badge.mjs": "export const two = 2;\n",
      "legacy/plugin.cjs": "module.exports = { three: 3 };\n",
      // Declarations are TypeScript, never parsed by a consumer's JS parser.
      "elements/badge.d.ts": "declare namespace internal { const value: number }\nexport = internal;\n",
      "styles.css": ":root { --mtrl-x: 1px }\n",
      "package.json": "{ \"name\": \"material\" }\n",
    });
    const { files, failures } = await checkSyntaxFloor(directory);
    expect(files).toEqual(["adapters/badge.mjs", "index.js", "legacy/plugin.cjs"]);
    expect(failures).toEqual([]);
  });
});
