import { describe, expect, test } from "bun:test";
import { readColourRoles, type ThemePalettes } from "../../scripts/conformance/matrix-colours";

const palettes: ThemePalettes = {
  light: { Primary: "#6750A4", Secondary: "#6750A4" },
  dark: { Primary: "#D0BCFF", Secondary: "#CCC2DC" },
  seed: { Primary: "#006C4C", Secondary: "#006C4C" },
};
const primary = { light: "rgb(103, 80, 164)", dark: "rgb(208, 188, 255)", seed: "rgb(0, 108, 76)" };

describe("matrix colour roles", () => {
  test("separates roles that share the light colour", () => {
    expect(readColourRoles([primary, primary], palettes).role).toBe("Primary");
  });

  test("requires the same role in every theme and in both engines", () => {
    expect(readColourRoles([primary, { ...primary, dark: "rgb(204, 194, 220)" }], palettes).role).toBeNull();
    expect(readColourRoles([{ ...primary, seed: primary.light }], palettes).role).toBeNull();
    const ambiguous = { ...palettes, dark: { Primary: "#D0BCFF", Secondary: "#D0BCFF" } };
    expect(readColourRoles([primary], ambiguous).role).toBeNull();
  });

  test("compares the colour role independently of opacity", () => {
    const translucent = { ...primary, light: "color(srgb 0.403922 0.313725 0.643137 / 0.12)" };
    expect(readColourRoles([primary, translucent], palettes)).toEqual({
      role: "Primary", transparent: false,
      resolved: [
        { light: "#6750A4", dark: "#D0BCFF", seed: "#006C4C" },
        { light: "#6750A4", dark: "#D0BCFF", seed: "#006C4C" },
      ],
    });
  });

  test("retains unassigned colours as measured hex", () => {
    const fixed = { light: "rgb(103, 80, 164)", dark: "rgba(103, 80, 164, 0.12)", seed: "rgba(0, 0, 0, 0)" };
    expect(readColourRoles([fixed], palettes)).toEqual({
      role: null, transparent: false,
      resolved: [{ light: "#6750A4", dark: "#6750A41F", seed: "#00000000" }],
    });
  });

  test("recognises literal transparency only when every profile and engine has zero alpha", () => {
    const clear = { light: "rgba(0, 0, 0, 0)", dark: "rgba(17, 12, 6, 0)", seed: "color(srgb 0 0 0 / 0)" };
    expect(readColourRoles([clear, clear], palettes).transparent).toBe(true);
    expect(readColourRoles([clear, { ...clear, seed: "rgba(0, 0, 0, 0.001)" }], palettes).transparent).toBe(false);
  });
});
