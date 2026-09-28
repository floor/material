// src/elements/index.ts
/**
 * The web component layer: each component as a custom element.
 *
 * Importing registers nothing. Call a `define*` function, or `defineAll()`,
 * in the browser. Register the component CSS with `registerStyles` first.
 *
 * @module elements
 */

import type { DefineOptions } from "./define";
import { defineButton } from "./button";
import { defineSwitch } from "./switch";
import { defineTabs } from "./tabs";

export { defineElement, MElement, DEFAULT_PREFIX, SHADOW_BASE_STYLES } from "./define";
export type {
  DefineOptions, ElementSpec, ElementDefinition, ElementComponent,
  AttributeSpec, PropertySpec, EventSpec, SlotSpec, FormSpec,
} from "./define";
export { registerStyles } from "./styles";
export { buttonElement, defineButton } from "./button";
export { switchElement, defineSwitch } from "./switch";
export { tabsElement, defineTabs } from "./tabs";

/** Registers every element. */
export const defineAll = (options?: DefineOptions): void => {
  defineButton(options);
  defineSwitch(options);
  defineTabs(options);
};
