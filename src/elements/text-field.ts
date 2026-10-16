// src/elements/text-field.ts
/**
 * `<m-text-field>`: the text field as a form-associated custom element.
 *
 * The `value` attribute is the default value and the `value` property the
 * live one, as on a native input: the attribute moves the value until the
 * user or script changes it. The `label` attribute is the floating
 * label, which the factory renders; there is no slot. The `trailing-icon`
 * attribute is the trailing icon's markup and `trailing-icon-label` its
 * button's accessible name: without the label the icon is decorative.
 *
 * Changing `label` or `type` recreates the field and keeps the value.
 * Changing `trailing-icon-label` updates the existing icon in place, so the
 * button, the input and focus stay. A field created without a label has no
 * label element to update, and `type="multiline"` swaps the input for a
 * textarea.
 *
 * A click, Enter or Space on the trailing icon button dispatches `trailing`
 * from the host, with the factory's `{ value, event }`, bubbling and composed.
 *
 * Parts: `text-field`, `field`, `label`, `input`, `leading-icon`, `trailing-icon`, `prefix`,
 * `suffix`, `supporting`, `helper`, `counter`, `outline`, `outline-leading`, `outline-notch`,
 * `outline-trailing`.
 *
 * @module elements
 */

import createTextField from "../components/text-field";
import { checkTrailingLabel } from "../components/text-field/features/trailing-icon";
import type { TextFieldComponent, TextFieldConfig, TextFieldTrailingPayload } from "../components/text-field/types";
import { defineElement, type AttributeValue, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

/** The text field, with the methods the element adds to it. */
export type TextFieldElementComponent = TextFieldComponent & {
  /** Selects the field's text. */
  select: () => void;
};

const create = (config: TextFieldConfig & { ariaLabel?: string }): TextFieldElementComponent => {
  const field = createTextField(config);
  const input = field.input;
  // The factory takes no aria-label; it names the inner input.
  if (config.ariaLabel) input.setAttribute("aria-label", config.ariaLabel);
  return Object.assign(field, { select: () => input.select() });
};

/** Mirrors an attribute onto the inner input. */
const inputAttribute =
  (name: string) =>
  (c: TextFieldElementComponent, v: AttributeValue): void => {
    if (v === null || v === false) c.removeAttribute(name);
    else c.setAttribute(name, v === true ? "" : String(v));
  };

const textFieldSpec = {
  name: "text-field",
  create: (config) => create(config as TextFieldConfig),
  styles: ["text-field"],
  // The field fills a host given a width, as a native input does. A hidden
  // field is not rendered at all, as a `hidden` host is not: it takes no space
  // before upgrade (the pre-upgrade rule) and none after, and its value still
  // submits with the form.
  hostStyles: ":host>*{width:100%}:host([type='hidden' i]){display:none}",
  attributes: {
    variant: {
      type: "string",
      config: "variant",
      update: (c, v) => void c.setVariant(v === "outlined" ? "outlined" : "filled"),
    },
    density: { type: "string", config: "density", update: (c, v) => void c.setDensity(String(v ?? "default")) },
    label: { type: "string", config: "label" },
    type: { type: "string", config: "type" },
    // The default value: the inner input's own, which the live value follows
    // until it is edited, as natively. Not called once the element is dirty.
    value: {
      type: "string",
      config: "value",
      update: (c, v) => {
        c.input.defaultValue = String(v ?? "");
        c.updatePositions();
      },
    },
    // The factory marks an empty placeholder with a space, for its CSS.
    placeholder: { type: "string", config: "placeholder", update: (c, v) => void c.setAttribute("placeholder", String(v || " ")) },
    "supporting-text": {
      type: "string",
      config: "supportingText",
      // The field's error state is the factory's own: the text only
      // takes the error colour while the field is in error.
      update: (c, v) => void (v ? c.setSupportingText(String(v), c.isError()) : c.removeSupportingText()),
    },
    "prefix-text": {
      type: "string",
      config: "prefixText",
      update: (c, v) => void (v ? c.setPrefixText(String(v)) : c.removePrefixText()),
    },
    "suffix-text": {
      type: "string",
      config: "suffixText",
      update: (c, v) => void (v ? c.setSuffixText(String(v)) : c.removeSuffixText()),
    },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
    "leading-icon": {
      type: "string",
      config: "leadingIcon",
      update: (c, v) => void (v ? c.setLeadingIcon(String(v)) : c.removeLeadingIcon()),
    },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
    "trailing-icon": {
      type: "string",
      config: "trailingIcon",
      update: (c, v, host) => void (v ? c.setTrailingIcon(String(v), host.getAttribute("trailing-icon-label") ?? "") : c.removeTrailingIcon()),
    },
    /**
     * The trailing icon button's accessible name. With it the icon is a button
     * that emits `trailing`; without it, or with an empty value, the icon is
     * decorative. A change updates the existing icon through the factory setter.
     */
    "trailing-icon-label": {
      type: "string",
      config: "trailingIconLabel",
      update: (c, v, host) => {
        const icon = host.getAttribute("trailing-icon");
        if (!icon) return;
        c.setTrailingIcon(icon, v === null ? "" : String(v));
      },
    },
    maxlength: { type: "number", config: "maxLength", update: inputAttribute("maxlength") },
    pattern: { type: "string", config: "pattern", update: inputAttribute("pattern") },
    // The input's required and the label's asterisk together
    required: { type: "boolean", config: "required", update: (c, v) => void c.setRequired(!!v) },
    readonly: { type: "boolean", config: "readonly", update: inputAttribute("readonly") },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    error: { type: "boolean", config: "error", update: (c, v) => void c.setError(!!v) },
    autocomplete: { type: "string", config: "autocomplete", update: inputAttribute("autocomplete") },
    "aria-label": { type: "string", config: "ariaLabel", update: inputAttribute("aria-label") },
  },
  properties: {
    value: { get: (c) => c.getValue(), set: (c, v) => void c.setValue(String(v ?? "")) },
  },
  methods: ["select", "setError"] as const,
  model: "value" as const,
  events: {
    input: { detail: (payload) => ({ value: (payload as { value: string }).value }) },
    change: { detail: (payload) => ({ value: (payload as { value: string }).value }) },
    // Beside the value: activating the icon leaves the default value in force.
    trailing: {
      detail: (payload) => {
        const { value, event } = payload as TextFieldTrailingPayload;
        return { value, event };
      },
      state: true,
    },
  },
  form: {
    value: (c) => c.getValue(),
    control: (c) => c.input,
    events: ["input", "change"],
    activate: (c) => c.input.focus(),
    state: (c) => c.getValue(),
    restore: (c, state) => void c.setValue(state),
    disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
  },
  setup: (_host, c) => {
    // The inner input's native `input` event is composed and would reach the
    // page beside the element's own: it stops at the shadow root.
    const stop = (event: Event): void => event.stopPropagation();
    c.input.addEventListener("input", stop);
    return () => c.input.removeEventListener("input", stop);
  },
} satisfies ElementSpec<TextFieldElementComponent>;

try {
  if (process.env.NODE_ENV !== "production") Object.assign(textFieldSpec.events.trailing, {
    listen: (host: HTMLElement): void => {
      if (host.getAttribute("trailing-icon") && !host.getAttribute("trailing-icon-label")) checkTrailingLabel(host);
    },
  });
} catch { /* Raw browser ESM has no process. */ }

export const textFieldElement = defineElement<TextFieldElementComponent>(textFieldSpec);
export type TextFieldSpec = typeof textFieldSpec;
/** `<m-text-field>` as a ref or a query returns it. */
export type TextFieldElement = ElementInstance<TextFieldSpec, TextFieldElementComponent>;

/** Registers `<m-text-field>` (or `<prefix-text-field>`). */
export const defineTextField = (options?: DefineOptions): string => textFieldElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-text-field": TextFieldElement;
  }
}
