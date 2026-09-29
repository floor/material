// src/elements/index.ts
/**
 * The web component layer: each component as a custom element.
 *
 * Importing registers nothing and touches no DOM, so this module is safe on a
 * server. In the browser, import the CSS (`mtrl/elements/css` or one
 * component's `mtrl/elements/css/<name>`), then call a `define*` function or
 * `defineAll()`.
 *
 * @module elements
 */

import type { DefineOptions } from "./define";
import { buttonElement, defineButton } from "./button";
import { switchElement, defineSwitch } from "./switch";
import { tabsElement, tabDeclaration, defineTabs } from "./tabs";
import { progressElement, defineProgress } from "./progress";
import { loadingIndicatorElement, defineLoadingIndicator } from "./loading-indicator";
import { badgeElement, defineBadge } from "./badge";
import { dividerElement, defineDivider } from "./divider";

export { defineElement, DEFAULT_PREFIX, SHADOW_BASE_STYLES } from "./define";
export type {
  DefineOptions, ElementSpec, ElementDefinition, ElementComponent, ElementHost, ElementInstance,
  ElementAttributes, ElementProperties, ElementSlotText, ElementEvents, ElementMethods, ElementProps,
  AttributeSpec, AttributeType, PropertySpec, EventSpec, SlotSpec, FormSpec,
} from "./define";
export { registerStyles, hasStyles } from "./styles";
export {
  describe, describeDeclaration, camel, pascal, toAttribute, getPrefix, configure, isBrowser,
} from "./adapter";
export type {
  ComponentSpec, DeclarationSpec, DefaultProps, FormProps, ModelOf, Pascal, AttributeProp, Described,
} from "./adapter";
export { buttonElement, defineButton } from "./button";
export type { ButtonSpec, ButtonElement } from "./button";
export { switchElement, defineSwitch } from "./switch";
export type { SwitchSpec, SwitchElement } from "./switch";
export { tabsElement, tabDeclaration, defineTabs } from "./tabs";
export type { TabsSpec, TabsElement, TabAttributes } from "./tabs";
export { progressElement, defineProgress } from "./progress";
export type { ProgressSpec, ProgressElement } from "./progress";
export { loadingIndicatorElement, defineLoadingIndicator } from "./loading-indicator";
export type { LoadingIndicatorSpec, LoadingIndicatorElement } from "./loading-indicator";
export { badgeElement, defineBadge } from "./badge";
export type { BadgeSpec, BadgeElement } from "./badge";
export { dividerElement, defineDivider } from "./divider";
export type { DividerSpec, DividerElement } from "./divider";

/** Every element, by name. Framework adapters are generated from this list. */
export const elements = {
  button: buttonElement,
  switch: switchElement,
  tabs: tabsElement,
  progress: progressElement,
  // Keyed in camelCase: the adapters name `<key>Element` and `define<Key>` after it.
  loadingIndicator: loadingIndicatorElement,
  badge: badgeElement,
  divider: dividerElement,
} as const;

/** Declaration children, which render nothing and are read by their parent. */
export const declarations = {
  tab: tabDeclaration,
} as const;

/** Registers every element. */
export const defineAll = (options?: DefineOptions): void => {
  defineButton(options);
  defineSwitch(options);
  defineTabs(options);
  defineProgress(options);
  defineLoadingIndicator(options);
  defineBadge(options);
  defineDivider(options);
};
