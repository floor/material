import { describe, expect, test } from "bun:test";
import { textFieldElement } from "../../src/elements/text-field";

// `trailing-icon-label` is the factory's `trailingIconLabel`, kebab-cased as
// `leading-icon` and `trailing-icon` are. A change updates the existing icon
// through the factory setter, so the spec declares `update`.
type Attribute = { type: string; config?: string; update?: unknown };
const attributes = textFieldElement.spec.attributes as Record<string, Attribute>;

describe("<m-text-field>: the trailing icon's label attribute", () => {
  test("`trailing-icon-label` maps to the factory's `trailingIconLabel` and updates in place", () => {
    expect(attributes["trailing-icon-label"]).toMatchObject({ type: "string", config: "trailingIconLabel" });
    expect(typeof attributes["trailing-icon-label"].update).toBe("function");
  });
});
