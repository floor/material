import { describe, expect, test } from "bun:test";
import { cornerToken, type ShapeStep } from "../../../src/core/theme";

// A radius a component writes from script reads the shape scale's
// token, the compiled value its fallback, as the stylesheets do.
describe("cornerToken", () => {
  test("a step's token, its px the fallback, under the library prefix", () => {
    expect(cornerToken("small", 8)).toBe("var(--mtrl-sys-shape-corner-small, 8px)");
    expect(cornerToken("large-increased", 20, "x")).toBe("var(--x-sys-shape-corner-large-increased, 20px)");
  });

  test("the steps and radii the components write are the stylesheet's", async () => {
    const scss = await Bun.file("src/styles/abstract/_variables.scss").text();
    const written: Array<[ShapeStep, number]> = [
      ["extra-small", 4], ["small", 8], ["medium", 12], ["large", 16], ["large-increased", 20], ["extra-large", 28],
      ["extra-large-increased", 32], ["extra-extra-large", 48],
    ];
    for (const [step, px] of written) expect(scss).toContain(`'${step}': ${px}px,`);
  });
});
