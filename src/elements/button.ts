// src/elements/button.ts
/**
 * `<m-button>`: the button as a custom element. Children are the label.
 *
 * `type="submit"` and `type="reset"` act on the host's form, which a button
 * inside a shadow root cannot reach by itself.
 *
 * @module elements
 */

import createButton from "../components/button";
import type { ButtonComponent, ButtonConfig } from "../components/button/types";
import { defineElement, type DefineOptions } from "./define";

export const buttonElement = defineElement<ButtonComponent>({
  name: "button",
  create: (config) => createButton({ ...(config as ButtonConfig), type: "button" }),
  styles: ["progress", "button"],
  hostStyles: ":host{vertical-align:middle}",
  attributes: {
    variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(String(v ?? "filled")) },
    size: { type: "string", config: "size", update: (c, v) => void c.setSize(String(v ?? "s")) },
    shape: { type: "string", config: "shape", update: (c, v) => void c.setShape(String(v ?? "round")) },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    icon: { type: "string", config: "icon" },
    value: { type: "string", config: "value", update: (c, v) => void c.setValue(String(v ?? "")) },
    type: { type: "string", update: () => undefined },
    "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => void c.setAriaLabel(String(v ?? "")) },
  },
  slot: {
    attribute: "label",
    config: "text",
    container: (c) => c.text.getElement(),
  },
  form: {
    value: () => null,
    disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
  },
  setup: (host) => {
    const onClick = (): void => {
      const form = host.internals?.form;
      const type = host.getAttribute("type");
      if (!form || host.hasAttribute("disabled")) return;
      if (type === "submit") form.requestSubmit();
      else if (type === "reset") form.reset();
    };
    host.addEventListener("click", onClick);
    return () => host.removeEventListener("click", onClick);
  },
});

/** Registers `<m-button>` (or `<prefix-button>`). */
export const defineButton = (options?: DefineOptions): string => buttonElement.define(options);
