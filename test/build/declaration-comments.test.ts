import { expect, test } from "bun:test";
import { printDeclarationModule } from "../../scripts/build-modules";

// What a published declaration keeps: its `@deprecated` JSDoc, whole and where
// it was written, so a typed consumer's editor reports the note and names the
// replacement. Every other comment was source documentation and goes.
const text = `/**
 * A documented constant.
 * @example
 * documented + 1;
 */
export declare const documented: number;

/**
 * The old constant.
 *
 * @deprecated Use documented. Removal in 4.0.
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
}): void;

export declare const trailing: number; // A trailing line comment.
`;

test("a declaration keeps its @deprecated JSDoc, whole, on the declaration it documents", () => {
  const output = printDeclarationModule("fixture.d.ts", text);
  // Whole: the prose above the tag is part of the note the consumer reads.
  expect(output).toMatch(/\/\*\*\n \* The old constant\.\n \*\n \* @deprecated Use documented\. Removal in 4\.0\.\n \*\/\s*export declare const old: number;/);
  expect(output).toContain("/** @deprecated Use first. Removal in 4.0. */");
  // The tag stays on its own declaration, not moved to the file or the next one.
  expect(output).toMatch(/\/\*\* @deprecated Use first\. Removal in 4\.0\. \*\/\s*second\?: string;/);
  expect(output.match(/@deprecated/g)).toHaveLength(2);
});

test("every other comment still goes", () => {
  const output = printDeclarationModule("fixture.d.ts", text);
  for (const prose of ["A documented constant.", "Plain documentation for an option.", "A line comment.", "A plain block comment.", "A trailing line comment.", "Not a JSDoc block."]) {
    expect(output).not.toContain(prose);
  }
  expect(output).toContain("export declare const documented: number;");
  expect(output).toContain("export declare const trailing: number;");
});
