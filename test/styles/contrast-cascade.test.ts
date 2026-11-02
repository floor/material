// test/styles/contrast-cascade.test.ts
// The cascade model follows CSS: within one rule, a later declaration of a
// property replaces an earlier one (CSS Cascade 4, "Order of Appearance",
// https://www.w3.org/TR/css-cascade-4/#cascade-order, read 2026-11-02).
import { describe, expect, test } from "bun:test";
import { resolveColors } from "./contrast-cascade";

const root = { root: true, theme: null, mode: null, contrast: null, dark: false };
const light = { scheme: "light", contrast: "no-preference" } as const;

describe("the cascade model keeps CSS's order of appearance", () => {
  test("a property declared twice in one rule resolves to the later declaration", () => {
    const resolved = resolveColors(
      [":root{--mtrl-sys-color-error:#b3261e;--mtrl-sys-color-error:#ba1a1a;}"],
      root,
      light,
      null,
    );
    expect(resolved["--mtrl-sys-color-error"]).toBe("#ba1a1a");
  });

  test("a later rule still wins over an earlier one", () => {
    const resolved = resolveColors(
      [":root{--mtrl-sys-color-error:#b3261e;}:root{--mtrl-sys-color-error:#ba1a1a;}"],
      root,
      light,
      null,
    );
    expect(resolved["--mtrl-sys-color-error"]).toBe("#ba1a1a");
  });
});
