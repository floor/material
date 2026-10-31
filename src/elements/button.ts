// src/elements/button.ts
/**
 * `<m-button>`: the button as a custom element. Children are the label.
 *
 * `type="submit"` and `type="reset"` act on the host's form, which a button
 * inside a shadow root cannot reach by itself (see `form-button`).
 *
 * With `toggle`, the `selected` attribute is the default state and the
 * `selected` property the live one: the attribute moves the state until the
 * user or script changes it. A click dispatches `change` with
 * `{ selected, value }` from the host, as `<m-icon-button>` does.
 *
 * The icon markup (`icon`) leads by default; `icon-position="end"` places it
 * after the label, as the factory's `iconPosition: "end"` does.
 *
 * Parts: `button`, `icon`, `label` (also `text`), `ripple`.
 *
 * @module elements
 */

import createButton from "../components/button";
import type { ButtonChangePayload, ButtonComponent, ButtonConfig } from "../components/button/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";
import { buttonForm, submitOnClick, typeAttribute } from "./form-button";

const buttonSpec = {
  name: "button",
  create: (config) => createButton({ ...(config as ButtonConfig), type: "button" }),
  styles: ["progress", "button"],
  // The host must be the button's own flex box, mirroring the pre-upgrade
  // rule: an inline-block host builds its line box from the page's typography
  // (a 48px strut at 24px / line-height 2, 8px over the control) and exposes a
  // different baseline than the inline-flex box the rule reserves. The base
  // display declaration it replaces is not shipped beside it (define.ts drops
  // it beside a bare :host display rule) — dead at equal specificity, it would
  // ride in every server-rendered root's inline sheet.
  hostStyles: ":host{display:inline-flex;vertical-align:middle}",
  attributes: {
    variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(String(v ?? "filled")) },
    size: { type: "string", config: "size", update: (c, v) => void c.setSize(String(v ?? "s")) },
    shape: { type: "string", config: "shape", update: (c, v) => void c.setShape(String(v ?? "round")) },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
    icon: { type: "string", config: "icon" },
    "icon-position": { type: "string", config: "iconPosition" },
    toggle: { type: "boolean", config: "toggle" },
    selected: { type: "boolean", config: "selected", update: (c, v) => void c.setSelected(Boolean(v)) },
    value: { type: "string", config: "value", update: (c, v) => void c.setValue(String(v ?? "")) },
    type: typeAttribute,
    "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => void c.setAriaLabel(String(v ?? "")) },
  },
  properties: {
    selected: {
      get: (c) => c.isSelected(),
      set: (c, v) => void c.setSelected(Boolean(v)),
      config: "selected",
    },
  },
  methods: ["setSelected"] as const,
  model: "selected" as const,
  slot: {
    attribute: "label" as const,
    config: "text",
  },
  events: {
    // A toggle button's `change`, with the button's value, from the
    // `toggle` attribute or the button's global defaults.
    change: {
      detail: (payload) => {
        const { selected, value } = payload as ButtonChangePayload;
        return { selected, value };
      },
    },
  },
  form: buttonForm<ButtonComponent>(),
  setup: submitOnClick,
} satisfies ElementSpec<ButtonComponent>;

export const buttonElement = defineElement<ButtonComponent>(buttonSpec);
export type ButtonSpec = typeof buttonSpec;
/** `<m-button>` as a ref or a query returns it. */
export type ButtonElement = ElementInstance<ButtonSpec, ButtonComponent>;

/** Registers `<m-button>` (or `<prefix-button>`). */
export const defineButton = (options?: DefineOptions): string => buttonElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-button": ButtonElement;
  }
}
