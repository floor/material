// src/elements/fab.ts
/**
 * `<m-fab>`: the floating action button as a custom element. It has no text,
 * so `aria-label` is its accessible name.
 *
 * `variant`, `size`, `position` and `aria-label` have no setter on the FAB:
 * changing one recreates it. `type="submit"` and `type="reset"` act on the
 * host's form.
 *
 * `placement` takes `none` (default), `top-start`, `top-end`, `bottom-start`
 * or `bottom-end`. Corners are fixed to the viewport with 16px margins and
 * follow text direction, including direction changes after upgrade. Changing
 * the attribute recreates the component. `position` is deprecated until 4.0:
 * its left/right values stay physical in RTL. `placement` wins, including
 * `none`; removing it restores `position` when present.
 *
 * Parts: `fab`, `icon`, `ripple`.
 *
 * @module elements
 */

import createFab from "../components/fab";
import type { FabComponent, FabConfig } from "../components/fab/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";
import { buttonForm, submitOnClick, typeAttribute } from "./form-button";
import { FLOATING_HOST_STYLES } from "./floating-placement";

const fabSpec = {
  name: "fab",
  create: (config) => createFab({ ...(config as FabConfig), type: "button" }),
  styles: ["fab"],
  hostStyles: ":host{vertical-align:middle}" + FLOATING_HOST_STYLES,
  attributes: {
    variant: { type: "string", config: "variant" },
    size: { type: "string", config: "size" },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
    icon: { type: "string", config: "icon", update: (c, v) => void c.setIcon(String(v ?? "")) },
    /** @deprecated Physical alias, does not mirror in RTL; removal in 4.0. */
    position: { type: "string", config: "position" },
    placement: { type: "string", config: "placement" },
    value: { type: "string", config: "value", update: (c, v) => void c.setValue(String(v ?? "")) },
    type: typeAttribute,
    "aria-label": { type: "string", config: "ariaLabel" },
  },
  methods: ["lower", "raise"] as const,
  form: buttonForm<FabComponent>(),
  setup: submitOnClick,
} satisfies ElementSpec<FabComponent>;

export const fabElement = defineElement<FabComponent>(fabSpec);
export type FabSpec = typeof fabSpec;
/** `<m-fab>` as a ref or a query returns it. */
export type FabElement = ElementInstance<FabSpec, FabComponent>;

/** Registers `<m-fab>` (or `<prefix-fab>`). */
export const defineFab = (options?: DefineOptions): string => fabElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-fab": FabElement;
  }
}
