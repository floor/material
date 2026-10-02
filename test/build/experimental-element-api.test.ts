// test/build/experimental-element-api.test.ts
//
// The element authoring API is public and outside semver in 3.x (a contract
// reservation for 3.0.0): each of its five exports says so where an editor
// shows it, in the TSDoc block on the declaration, and the README says it once.
// A tag is a comment, so no type fixture can see it: the source is read.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const EXPERIMENTAL: [name: string, file: string, declaration: RegExp][] = [
  ["defineElement", "src/elements/define.ts", /export const defineElement\b/],
  ["ElementSpec", "src/elements/define.ts", /export interface ElementSpec\b/],
  ["SHADOW_BASE_STYLES", "src/elements/define.ts", /export const SHADOW_BASE_STYLES\b/],
  ["registerStyles", "src/elements/styles.ts", /export const registerStyles\b/],
  ["hasStyles", "src/elements/styles.ts", /export const hasStyles\b/],
];

/** The TSDoc block that ends right before the declaration, or "". */
const docOf = (source: string, declaration: RegExp): string => {
  const at = source.search(declaration);
  const before = source.slice(0, at);
  const block = /\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*$/.exec(before);
  return block ? block[0] : "";
};

describe("the element authoring API is tagged experimental", () => {
  for (const [name, file, declaration] of EXPERIMENTAL) {
    test(`${name} carries @experimental and says it is outside semver in 3.x`, () => {
      const doc = docOf(readFileSync(file, "utf8"), declaration);
      expect(doc).toContain("@experimental");
      expect(doc).toContain("outside semantic");
      expect(doc.replace(/\s*\*\s*/g, " ")).toContain("outside semantic versioning in 3.x");
    });
  }

  test("all five are still exports of material/elements", () => {
    const index = readFileSync("src/elements/index.ts", "utf8");
    for (const [name] of EXPERIMENTAL) expect(index).toMatch(new RegExp(`\\b${name}\\b`));
  });

  test("the README says it once, with the five names", () => {
    const readme = readFileSync("README.md", "utf8");
    const sentence = readme.split("\n").find((line) => line.includes("outside semantic versioning in 3.x")) ?? "";
    for (const [name] of EXPERIMENTAL) expect(sentence).toContain(`\`${name}\``);
  });

  test("the elements the library defines carry no such tag", () => {
    for (const file of ["src/elements/button.ts", "src/elements/text-field.ts", "src/elements/select.ts"]) {
      expect(readFileSync(file, "utf8")).not.toContain("@experimental");
    }
  });
});
