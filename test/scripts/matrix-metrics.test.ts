import { expect, test } from "bun:test";
import { elevationRole, identifyTypography } from "../../scripts/conformance/matrix-metrics";

const bodyMedium = { size: "14px", weight: "400", lineHeight: "20px", tracking: "0.25px" };
const titleSmall = { size: "14px", weight: "500", lineHeight: "20px", tracking: "0.1px" };

test("a typography role needs all four metrics in every profile", () => {
  const nominal = { BodyMedium: bodyMedium, TitleSmall: titleSmall };
  expect(identifyTypography([bodyMedium, bodyMedium], nominal)).toBe("BodyMedium");
  expect(identifyTypography([bodyMedium, { ...bodyMedium, lineHeight: "16.8px" }], nominal)).toBeNull();
});

test("identical type profiles do not imply a unique role", () => {
  expect(identifyTypography([titleSmall], { TitleSmall: titleSmall, LabelLarge: titleSmall })).toBeNull();
});

test("shadow colour does not change the measured elevation level", () => {
  expect(elevationRole("rgb(0, 0, 0) 0px 1px 2px 0px, rgba(0, 0, 0, 0.2) 0px 1px 3px 1px")).toBe("Level1");
  expect(elevationRole("none")).toBe("Level0");
  expect(elevationRole("rgb(0, 0, 0) 0px 1px 3px 0px")).toBeNull();
});
