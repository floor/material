import { describe, expect, test } from "bun:test";
import { clearGlobalDefaults } from "../../../src/core/config/global";
import { createBaseConfig } from "../../../src/components/button/config";
import type { ButtonConfig } from "../../../src/components/button/types";

const calls: ButtonConfig[] = [
  {},
  { variant: "text", size: "m", class: "mtrl-fab-menu__item" },
  { className: "named" },
  { class: "from-class", className: "from-name" },
  { class: ["one", "two"] },
  { disabled: true, type: "submit", ariaLabel: "Label" },
];

describe("button config merge", () => {
  test("an empty registry makes the isolated merge match the public one", () => {
    clearGlobalDefaults();
    for (const config of calls) {
      expect(createBaseConfig(config, true)).toEqual(createBaseConfig(config, false));
    }
  });
});
