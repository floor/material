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

// The virtual keyboard hints are spelled as the native input attributes are:
// the config keys are the factory's (`inputMode`, `enterKeyHint`), the host
// attributes lowercase, written onto the inner input. The update, rather than
// a rebuild, keeps the field's value and focus.
describe("<m-text-field>: the virtual keyboard hint attributes", () => {
  test("`inputmode` and `enterkeyhint` map to the factory's `inputMode` and `enterKeyHint`", () => {
    expect(attributes.inputmode).toMatchObject({ type: "string", config: "inputMode" });
    expect(attributes.enterkeyhint).toMatchObject({ type: "string", config: "enterKeyHint" });
    expect(typeof attributes.inputmode.update).toBe("function");
    expect(typeof attributes.enterkeyhint.update).toBe("function");
  });
});
