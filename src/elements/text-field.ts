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
import { textFieldChips } from "../components/text-field/chips";
import { checkTrailingLabel } from "../components/text-field/api";
import type { TextFieldComponent, TextFieldChipItem, TextFieldChipsConfig, TextFieldConfig, TextFieldTrailingPayload } from "../components/text-field/types";
import { defineElement, type AttributeValue, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

/** The text field, with the methods the element adds to it. */
export type TextFieldElementComponent = TextFieldComponent & {
  /** Selects the field's text. */
  select: () => void;
};

const create = (config: TextFieldConfig): TextFieldElementComponent => {
  const field = createTextField(config);
  const input = field.input;
  // Preserve an explicit host name even when it matches the visible label.
  if (config.ariaLabel) input.setAttribute("aria-label", config.ariaLabel);
  return Object.assign(field, { select: () => input.select() });
};

/** The committed chips a `<m-text-field chips>` starts with: its `<m-chip>` children. */
const declaredChips = (host: HTMLElement): TextFieldChipItem[] =>
  [...host.querySelectorAll("m-chip")].map((chip) => {
    const label = chip.getAttribute("label") ?? (chip.textContent ?? "").trim();
    const value = chip.getAttribute("value");
    return value === null ? label : { label, value };
  });

/** The `chips` config a host declares: the attribute, its options, and its children. */
const chipsConfigOf = (host: HTMLElement): TextFieldChipsConfig | undefined => {
  if (!host.hasAttribute("chips")) return undefined;
  const separators = host.getAttribute("separators");
  const maxChips = host.getAttribute("max-chips");
  return {
    items: declaredChips(host),
    // `separators=",;"` names two keys: each character is one.
    separators: separators ? [...separators].filter((key) => key.trim() !== "") : undefined,
    maxChips: maxChips ? Number(maxChips) : undefined,
  };
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
  // The chip sheets are declared, not registered: the element adopts them only
  // while the host carries the attribute, and drops them when that goes. The
  // chips sheet draws the chip itself; the text-field-chips sheet its row.
  styles: [
    "text-field",
    { name: "chips", when: (host) => host.hasAttribute("chips") },
    { name: "text-field-chips", when: (host) => host.hasAttribute("chips") },
  ],
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
    inputmode: { type: "string", config: "inputMode", update: inputAttribute("inputmode") },
    enterkeyhint: { type: "string", config: "enterKeyHint", update: inputAttribute("enterkeyhint") },
    "aria-label": { type: "string", config: "ariaLabel", update: inputAttribute("aria-label") },
    // Input chips: the attribute turns them on; separators and max-chips are
    // read by config(host) below, which recreates the field when they change.
    // A change rebuilds: the sheet and the chips follow the attribute.
    chips: { type: "boolean" },
    separators: { type: "string", update: () => {} },
    "max-chips": { type: "number", update: () => {} },
  },
  properties: {
    value: { get: (c) => c.getValue(), set: (c, v) => void c.setValue(String(v ?? "")) },
    // The committed chip values, as an array of strings.
    values: {
      get: (c) => c.getValues(),
      set: (c, v) => void c.setValues(Array.isArray(v) ? v.map(String) : []),
    },
  },
  methods: ["select", "setError", "getValues", "setValues", "addChip", "removeChip"] as const,
  model: "value" as const,
  // The declared `<m-chip>` children are the values' default, as a `values`
  // attribute would be: a clean rebuild reads them again instead of carrying
  // the old component's array over the new chips.
  defaults: ["values"] as const,
  events: {
    input: { detail: (payload) => ({ value: (payload as { value: string }).value }) },
    change: { detail: (payload) => ({ value: (payload as { value: string }).value }) },
    // One entry per committed chip: the whole value array and the chip's own.
    add: { detail: (payload) => { const { values, chipValue, index } = payload as { values: string[]; chipValue: string; index: number }; return { values, chipValue, index }; } },
    remove: { detail: (payload) => { const { values, chipValue, index } = payload as { values: string[]; chipValue: string; index: number }; return { values, chipValue, index }; } },
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
    // Chips submit one entry each under the host's name; without chips the
    // field submits its text, as before.
    value: (c, host) => {
      if (!host.hasAttribute("chips")) return c.getValue();
      const name = host.getAttribute("name");
      const values = c.getValues();
      if (!name || values.length === 0) return null;
      const data = new FormData();
      for (const value of values) data.append(name, value);
      return data;
    },
    control: (c) => c.input,
    events: ["input", "change", "add", "remove"],
    activate: (c) => c.input.focus(),
    // The chips and the draft text travel together through a restore.
    state: (c) => {
      const values = c.getValues();
      return values.length > 0 ? JSON.stringify({ v: values, d: c.getValue() }) : c.getValue();
    },
    restore: (c, state, host) => {
      // Without chips the stored state is the draft itself, whatever it reads
      // as: a plain field restores the literal, as a native input does.
      if (!host.hasAttribute("chips")) {
        c.setValue(state);
        return;
      }
      // Our state is `{"v": [...], "d": "..."}`; any other string is a draft,
      // including one that starts with a brace (`{draft`).
      let parsed: { v?: unknown; d?: unknown } | null = null;
      try {
        const value = JSON.parse(state) as unknown;
        if (value && typeof value === "object" && "v" in value) parsed = value as { v?: unknown; d?: unknown };
      } catch {
        parsed = null;
      }
      if (parsed) {
        c.setValues(Array.isArray(parsed.v) ? parsed.v.map(String) : []);
        c.setValue(typeof parsed.d === "string" ? parsed.d : "");
      } else c.setValue(state);
    },
    disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
  },
  config: (host) => {
    const chips = chipsConfigOf(host);
    return chips ? { chips: textFieldChips(chips) } : {};
  },
  // The declared `<m-chip>` children are the starting chips; a change recreates.
  observeChildren: true,
  setup: (_host, c) => {
    // The inner input's native `input` event is composed and would reach the
    // page beside the element's own: it stops at the shadow root.
    const stop = (event: Event): void => event.stopPropagation();
    c.input.addEventListener("input", stop);
    return () => c.input.removeEventListener("input", stop);
  },
} satisfies ElementSpec<TextFieldElementComponent>;

if (/*#__PURE__*/ (() => { try { return process.env.NODE_ENV !== "production"; } catch { return false; } })() && process.env.NODE_ENV !== "production") Object.assign(textFieldSpec.events.trailing, {
  listen: (host: HTMLElement): void => {
    if (host.getAttribute("trailing-icon") && !host.getAttribute("trailing-icon-label")) checkTrailingLabel(host);
  },
});

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
