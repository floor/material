// test/components/is-disabled.test.ts
//
// FLO-384: every component that can be disabled answers isDisabled(), reading
// the state its own disable() and enable() set, and the config's `disabled`.
import { describe, expect, test } from "bun:test";
import { callbacksFixture } from "./callbacks.fixture";
import createButton from "../../src/components/button";
import createIconButton from "../../src/components/icon-button";
import createFab from "../../src/components/fab";
import createExtendedFab from "../../src/components/extended-fab";
import createCheckbox from "../../src/components/checkbox";
import createSwitch from "../../src/components/switch";
import createTextField from "../../src/components/text-field";
import createSelect from "../../src/components/select";
import createRadios from "../../src/components/radios";
import createButtonGroup from "../../src/components/button-group";
import { createTab } from "../../src/components/tabs";
import { createTab as tabFactory } from "../../src/components/tabs/tab";

const mount = callbacksFixture();

type Disableable = { element: HTMLElement; destroy: () => void; isDisabled: () => boolean; disable: () => unknown; enable: () => unknown };
const ICON = "<svg></svg>";
const factories: Array<[string, (disabled: boolean) => Disableable]> = [
  ["button", (disabled) => createButton({ text: "Save", disabled })],
  ["icon button", (disabled) => createIconButton({ icon: ICON, ariaLabel: "Like", disabled })],
  ["FAB", (disabled) => createFab({ icon: ICON, ariaLabel: "Add", disabled })],
  ["extended FAB", (disabled) => createExtendedFab({ icon: ICON, text: "Compose", disabled })],
  ["checkbox", (disabled) => createCheckbox({ label: "Agree", disabled })],
  ["switch", (disabled) => createSwitch({ label: "Wi-Fi", disabled })],
  ["text field", (disabled) => createTextField({ label: "Name", disabled })],
  ["select", (disabled) => createSelect({ label: "Size", options: [{ id: "s", text: "Small" }], disabled })],
  ["radios", (disabled) => createRadios({ name: "size", options: [{ value: "s", label: "Small" }], disabled })],
  ["button group", (disabled) => createButtonGroup({ buttons: [{ text: "A" }, { text: "B" }], disabled })],
  ["tab", (disabled) => createTab({ text: "Trips", value: "trips", disabled })],
];

describe("isDisabled() on every component that can be disabled (FLO-384)", () => {
  for (const [name, create] of factories) {
    test(`${name}: follows disable(), enable() and the disabled config`, () => {
      const component = mount(create(false));
      expect(component.isDisabled()).toBe(false);
      component.disable();
      expect(component.isDisabled()).toBe(true);
      component.enable();
      expect(component.isDisabled()).toBe(false);
      expect(mount(create(true)).isDisabled()).toBe(true);
    });
  }
});

test("createTab is exported from the tabs entry: the factory a tablist uses for its tabs (FLO-384)", () => {
  expect(createTab).toBe(tabFactory);
  const tab = mount(createTab({ text: "Hotels", value: "hotels" }));
  expect(tab.element.getAttribute("role")).toBe("tab");
  expect(tab.getValue()).toBe("hotels");
});
