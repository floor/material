// src/elements/checkbox.ts
/**
 * `<m-checkbox>`: the checkbox as a form-associated custom element.
 *
 * The `checked` attribute is the default state and the `checked` property the
 * live one, as on a native checkbox: the attribute moves the state until the
 * user or script changes it. `indeterminate` is a property only, as natively. Children are the label.
 *
 * Parts: `checkbox`, `input`, `icon`, `label`.
 *
 * @module elements
 */

import createCheckbox from "../components/checkbox";
import type { CheckboxComponent, CheckboxConfig } from "../components/checkbox/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

const checkboxSpec = {
  name: "checkbox",
  create: (config) => createCheckbox(config as CheckboxConfig),
  styles: ["checkbox"],
  attributes: {
    checked: { type: "boolean", config: "checked", update: (c, v) => void c.setValue(!!v) },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    required: { type: "boolean", config: "required" },
    value: { type: "string", config: "value", update: (c, v) => void c.setValueAttribute(String(v ?? "")) },
    error: { type: "boolean", config: "error", update: (c, v) => void c.setError(!!v) },
    "label-position": { type: "string", config: "labelPosition" },
    "aria-label": { type: "string", config: "ariaLabel" },
  },
  properties: {
    checked: { get: (c) => c.isChecked(), set: (c, v) => void c.setValue(!!v), config: "checked" },
    indeterminate: {
      get: (c) => c.input.indeterminate,
      set: (c, v) => void c.setIndeterminate(!!v),
      config: "indeterminate",
    },
  },
  methods: ["toggle", "check", "uncheck"] as const,
  model: "checked" as const,
  events: {
    change: {
      detail: (payload) => {
        const { checked, value } = payload as { checked: boolean; value: string };
        return { checked, value };
      },
    },
  },
  slot: {
    attribute: "label" as const,
    config: "label",
  },
  form: {
    value: (c) => (c.isChecked() ? c.getValueAttribute() || "on" : null),
    control: (c) => c.input,
    events: ["change"],
    activate: (c) => c.input.click(),
    state: (c) => (c.isChecked() ? "checked" : "unchecked"),
    restore: (c, state) => void c.setValue(state === "checked"),
    disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
  },
} satisfies ElementSpec<CheckboxComponent>;

export const checkboxElement = defineElement<CheckboxComponent>(checkboxSpec);
export type CheckboxSpec = typeof checkboxSpec;
/** `<m-checkbox>` as a ref or a query returns it. */
export type CheckboxElement = ElementInstance<CheckboxSpec, CheckboxComponent>;

/** Registers `<m-checkbox>` (or `<prefix-checkbox>`). */
export const defineCheckbox = (options?: DefineOptions): string => checkboxElement.define(options);
