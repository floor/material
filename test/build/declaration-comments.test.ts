import { expect, test } from "bun:test";
import { printDeclarationModule } from "../../scripts/build-modules";

// What a published declaration ships: the hover text a typed consumer reads —
// the JSDoc's first summary sentence, its `@param` names and its `@default` —
// and the `@deprecated` note whole, so an editor names the replacement and
// TypeScript reports the deprecation. The rest of the source documentation only
// served the source: `@example` blocks, the prose after the first sentence, and
// every non-JSDoc comment go.
const text = `/**
 * A documented constant. It has a second sentence on the same line.
 * A third sentence that does not ship.
 * @param {number} amount How many.
 * @default 1
 * @example
 * documented + 1;
 */
export declare const documented: (amount: number) => number;

/**
 * The old constant.
 *
 * @deprecated Use documented.
 * Removal in 4.0.
 */
export declare const old: number;

// A line comment.
/* A plain block comment. */
/*! Not a JSDoc block. */
export declare function make(config: {
    /** Plain documentation for an option. */
    first?: string;
    /** @deprecated Use first. Removal in 4.0. */
    second?: string;
    /** Button type attribute */
    third?: string;
}): void;

export declare const trailing: number; // A trailing line comment.
`;

test("a declaration keeps the first sentence of its JSDoc, its @param names and its @default", () => {
  const output = printDeclarationModule("fixture.d.ts", text);
  expect(output).toMatch(/\/\*\*\n \* A documented constant\.\n \* @param amount\n \* @default 1\n \*\/\s*export declare const documented: \(amount: number\) => number;/);
  expect(output).not.toContain("It has a second sentence on the same line.");
  expect(output).not.toContain("A third sentence that does not ship.");
  // The descriptions and the example stay in the source.
  expect(output).not.toContain("How many.");
  expect(output).not.toContain("documented + 1;");
  expect(output).not.toContain("@example");
});

test("a @deprecated note stays whole, on the declaration it documents", () => {
  const output = printDeclarationModule("fixture.d.ts", text);
  // Whole: the prose above the tag and the tag's continuation lines are part of
  // the note the consumer reads.
  expect(output).toMatch(/\/\*\*\n \* The old constant\.\n \* @deprecated Use documented\.\n \* Removal in 4\.0\.\n \*\/\s*export declare const old: number;/);
  expect(output).toContain("/** @deprecated Use first. Removal in 4.0. */");
  // The tag stays on its own declaration, not moved to the file or the next one.
  expect(output).toMatch(/\/\*\* @deprecated Use first\. Removal in 4\.0\. \*\/\s*second\?: string;/);
  expect(output.match(/@deprecated/g)).toHaveLength(2);
});

test("every non-JSDoc comment goes, and an untagged JSDoc keeps its one line", () => {
  const output = printDeclarationModule("fixture.d.ts", text);
  for (const prose of ["A line comment.", "A plain block comment.", "A trailing line comment.", "Not a JSDoc block."]) {
    expect(output).not.toContain(prose);
  }
  expect(output).toContain("/** Plain documentation for an option. */");
  expect(output).toContain("/** Button type attribute */");
  expect(output).toContain("export declare const trailing: number;");
  expect(output).toContain("export declare function make(config: {");
});
