// test/core/dom/classes-matrix.test.ts
//
// The four class helpers share one token loop. Their contract is
// normalizeClasses(): every argument is split on spaces, trimmed, deduplicated
// and applied in order. This file pins that contract across a matrix of
// argument shapes and starting element states, with the expected result
// computed by an independent tokenizer rather than by the helpers' own
// normalization.
import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  addClass,
  hasClass,
  normalizeClasses,
  removeClass,
  toggleClass,
} from "../../../src/core/dom/classes";

type ClassInput = string | string[];

// The argument-list shapes a caller can pass to any helper.
const INPUTS: ClassInput[][] = [
  [], // no arguments
  [""],
  [" "],
  ["a"],
  ["a b"],
  [" a "],
  ["a  b"],
  ["a", "a"], // the same token twice, across arguments
  ["a b", "c"],
  [["a", "b"]], // one array argument
  [["a b", "c"]],
  [["", "a"]],
  [[]],
  ["b", ["a b", "c"]], // mixed arguments
];

// Starting className values. 'a' and 'x' are also tokens the inputs name, so
// each operation runs on a token that is already there and one that is not.
const STARTS = ["", "a", "a b", "a x", "x"];

// The documented tokenization, written independently of normalizeClasses.
const tokensOf = (inputs: ClassInput[]): string[] => {
  const seen = new Set<string>();
  for (const entry of inputs) {
    for (const part of Array.isArray(entry) ? entry : [entry]) {
      if (typeof part !== "string") continue;
      for (const piece of part.split(" ")) {
        const token = piece.trim();
        if (token) seen.add(token);
      }
    }
  }
  return [...seen];
};

const startTokens = (start: string): string[] =>
  start ? start.split(" ") : [];

const same = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((token, index) => token === right[index]);

const describeCase = (start: string, input: ClassInput[]): string =>
  `start ${JSON.stringify(start)} with ${JSON.stringify(input)}`;

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
const { document } = dom.window;

const elementFor = (start: string): HTMLElement => {
  const element = document.createElement("div");
  if (start) element.className = start;
  return element;
};

describe("class helper token matrix", () => {
  test("normalizeClasses returns the documented tokens for every argument shape", () => {
    const mismatches = INPUTS.map((input) => {
      const got = normalizeClasses(...input);
      const want = tokensOf(input);
      return same(got, want) ? null : { input, got, want };
    }).filter((mismatch) => mismatch !== null);
    expect(mismatches).toEqual([]);
  });

  test("addClass adds exactly the normalized tokens, in order", () => {
    const mismatches: {
      case: string;
      got: string[];
      expected: string[];
    }[] = [];
    for (const start of STARTS) {
      for (const input of INPUTS) {
        const element = elementFor(start);
        addClass(element, ...input);
        const expected = new Set(startTokens(start));
        for (const token of tokensOf(input)) expected.add(token);
        const want = [...expected];
        const got = Array.from(element.classList);
        if (!same(got, want)) {
          mismatches.push({ case: describeCase(start, input), got, expected: want });
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  test("removeClass removes exactly the normalized tokens", () => {
    const mismatches: {
      case: string;
      got: string[];
      expected: string[];
    }[] = [];
    for (const start of STARTS) {
      for (const input of INPUTS) {
        const element = elementFor(start);
        removeClass(element, ...input);
        const expected = new Set(startTokens(start));
        for (const token of tokensOf(input)) expected.delete(token);
        const want = [...expected];
        const got = Array.from(element.classList);
        if (!same(got, want)) {
          mismatches.push({ case: describeCase(start, input), got, expected: want });
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  test("toggleClass flips exactly the normalized tokens", () => {
    const mismatches: {
      case: string;
      got: string[];
      expected: string[];
    }[] = [];
    for (const start of STARTS) {
      for (const input of INPUTS) {
        const element = elementFor(start);
        toggleClass(element, ...input);
        const expected = new Set(startTokens(start));
        for (const token of tokensOf(input)) {
          if (expected.has(token)) expected.delete(token);
          else expected.add(token);
        }
        const want = [...expected];
        const got = Array.from(element.classList);
        if (!same(got, want)) {
          mismatches.push({ case: describeCase(start, input), got, expected: want });
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  test("hasClass requires every normalized token, and none when there are none", () => {
    const mismatches: {
      case: string;
      got: boolean;
      expected: boolean;
    }[] = [];
    for (const start of STARTS) {
      for (const input of INPUTS) {
        const element = elementFor(start);
        const present = new Set(startTokens(start));
        const want = tokensOf(input).every((token) => present.has(token));
        const got = hasClass(element, ...input);
        if (got !== want) {
          mismatches.push({ case: describeCase(start, input), got, expected: want });
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
