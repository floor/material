// src/elements/switch.ts
/**
 * `<m-switch>`: the switch as a form-associated custom element.
 *
 * The `checked` attribute is the default state and the `checked` property the
 * live one, as on a native checkbox. Children are the label.
 *
 * @module elements
 */

import createSwitch from "../components/switch";
import type { SwitchComponent, SwitchConfig } from "../components/switch/types";
import { defineElement, type DefineOptions } from "./define";

export const switchElement = defineElement<SwitchComponent>({
  name: "switch",
  create: (config) => createSwitch(config as SwitchConfig),
  styles: ["switch"],
  attributes: {
    checked: { type: "boolean", config: "checked", update: (c, v) => void c.setValue(!!v) },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    required: { type: "boolean", config: "required" },
    value: { type: "string", config: "value", update: (c, v) => void c.setValueAttribute(String(v ?? "")) },
    icon: { type: "string", config: "icon" },
    error: { type: "boolean", config: "error" },
    "supporting-text": {
      type: "string",
      config: "supportingText",
      update: (c, v) => void (v ? c.setSupportingText(String(v)) : c.removeSupportingText()),
    },
  },
  properties: {
    checked: { get: (c) => c.isChecked(), set: (c, v) => void c.setValue(!!v), config: "checked" },
  },
  methods: ["toggle", "check", "uncheck"],
  events: {
    change: {
      detail: (payload) => {
        const { checked, value } = payload as { checked: boolean; value: string };
        return { checked, value };
      },
    },
  },
  slot: {
    attribute: "label",
    config: "label",
    container: (c) => c.element.querySelector("label"),
  },
  form: {
    value: (c) => (c.isChecked() ? c.getValueAttribute() || "on" : null),
    control: (c) => c.input,
    events: ["change"],
    activate: (c) => c.input.click(),
    disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
  },
});

/** Registers `<m-switch>` (or `<prefix-switch>`). */
export const defineSwitch = (options?: DefineOptions): string => switchElement.define(options);
