import { describe, expect, test } from "bun:test";
import { textFieldElement } from "../../src/elements/text-field";

// FLO-532: the element's `trailing-icon-label` is the factory's
// `trailingIconLabel` (FLO-301), kebab-cased as its neighbours `leading-icon`
// and `trailing-icon` are. Config-only, like `label` and `type`: the factory
// takes the option at creation, and a change to the attribute after upgrade
// recreates the component from the attributes (define.ts), so the spec
// declares no `update`.
type Attribute = { type: string; config?: string; update?: unknown };
const attributes = textFieldElement.spec.attributes as Record<string, Attribute>;

describe("<m-text-field>: the trailing icon's label attribute", () => {
  test("`trailing-icon-label` maps to the factory's `trailingIconLabel`", () => {
    expect(attributes["trailing-icon-label"]).toMatchObject({ type: "string", config: "trailingIconLabel" });
    expect(attributes["trailing-icon-label"].update).toBeUndefined();
  });
});
