import { expect, test } from "bun:test";
import { printRuntimeModule } from "../../scripts/build-modules";

test("runtime modules retain pure calls without shipping prose or changing comment-like data", () => {
  const text = `/** Public API prose belongs in declarations. */
const values = /*#__PURE__*/ new Set(["/* literal */", "// literal"]);
// Runtime prose is omitted too.
const match = /\\/\\* literal \\*\\//;
const template = \`// template\`;
const nested = () => { /* inside a function */ return /* beside a token */ 7; };
`;
  const output = printRuntimeModule("fixture.js", text);
  expect(output).toContain("/*#__PURE__*/");
  for (const prose of ["Public API prose", "Runtime prose", "inside a function", "beside a token"]) {
    expect(output).not.toContain(prose);
  }
  const result = new Function(output + "return [Array.from(values), match.test('/* literal */'), template, nested()];")();
  expect(result).toEqual([["/* literal */", "// literal"], true, "// template", 7]);
});
