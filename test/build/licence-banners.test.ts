import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
// A namespace import keeps the banner test runnable against the previous
// implementation, where the helpers it grows do not exist yet.
import * as build from "../../scripts/build-modules";

const banner = (text: string): string => text.match(/\/\*![\s\S]*?\*\//)?.[0] ?? "";

function vendored(): string[] {
  const root = join(import.meta.dir, "../../src/theme/vendor");
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".js")) files.push(path);
    }
  };
  walk(root);
  return files.sort();
}

test("every vendored licence banner survives the readable strip", () => {
  const files = vendored();
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const licence = banner(text);
    expect(licence, `${relative(import.meta.dir, file)} opens with a licence banner`).toStartWith("/*!");
    const stripped = build.stripRuntimeComments(file, text);
    expect(stripped, `${relative(import.meta.dir, file)} keeps its licence banner`).toContain(licence);
  }
});

test("a banner followed directly by code survives, with no second comment to keep it", () => {
  const text = "/*! material colour science | Apache-2.0 */\nexport const value = 1;\n";
  expect(build.stripRuntimeComments("fixture.js", text)).toContain("/*! material colour science | Apache-2.0 */");
});

test("@license and @preserve blocks survive without the banner marker", () => {
  const text = "/** Prose for editors. */\n/* @license MIT, see NOTICE */\nexport const first = 1;\n/* @preserve keep this block */\nexport const second = 2;\n";
  expect(build.keptCommentsOf("fixture.js", text)).toEqual(["/* @license MIT, see NOTICE */", "/* @preserve keep this block */"]);
  const stripped = build.stripRuntimeComments("fixture.js", text);
  expect(stripped).toContain("/* @license MIT, see NOTICE */");
  expect(stripped).toContain("/* @preserve keep this block */");
  expect(stripped).not.toContain("Prose for editors");
});

test("a module with no kept comment takes the plain strip, unchanged", () => {
  const text = "/** Prose for editors. */\nexport const first: number = 1;\n// Runtime prose.\nexport const second = 2;\n";
  const plain = ts.createPrinter({ removeComments: true }).printFile(
    ts.createSourceFile("fixture.js", text, ts.ScriptTarget.Latest, true),
  );
  expect(build.stripRuntimeComments("fixture.js", text)).toBe(plain);
});

test("the build fails, naming the file and the comment, when the strip loses a kept comment", () => {
  const source = "/*! a licence banner */\nexport const value = 1;\n";
  expect(() => build.assertKeptCommentsSurvive("dist/fixture.js", source, "export const value = 1;\n"))
    .toThrow("dist/fixture.js: the readable dist dropped a kept comment: /*! a licence banner */");
  expect(() => build.assertKeptCommentsSurvive("dist/fixture.js", source, build.stripRuntimeComments("dist/fixture.js", source))).not.toThrow();
});
