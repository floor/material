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
import { iconButtonElement, defineIconButton } from "./icon-button";
import { fabElement, defineFab } from "./fab";
import { extendedFabElement, defineExtendedFab } from "./extended-fab";
import { checkboxElement, defineCheckbox } from "./checkbox";
import { sliderElement, defineSlider } from "./slider";
import { textfieldElement, defineTextfield } from "./textfield";
import { radiosElement, radioDeclaration, defineRadios } from "./radios";
import { navigationRailElement, navigationRailItemDeclaration, defineNavigationRail } from "./navigation-rail";
import { drawerElement, drawerItemDeclaration, defineDrawer } from "./drawer";
import { topAppBarElement, defineTopAppBar } from "./top-app-bar";
import { bottomAppBarElement, defineBottomAppBar } from "./bottom-app-bar";

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
export { iconButtonElement, defineIconButton } from "./icon-button";
export type { IconButtonSpec, IconButtonElement } from "./icon-button";
export { fabElement, defineFab } from "./fab";
export type { FabSpec, FabElement } from "./fab";
export { extendedFabElement, defineExtendedFab } from "./extended-fab";
export type { ExtendedFabSpec, ExtendedFabElement } from "./extended-fab";
export { checkboxElement, defineCheckbox } from "./checkbox";
export type { CheckboxSpec, CheckboxElement } from "./checkbox";
export { sliderElement, defineSlider } from "./slider";
export type { SliderSpec, SliderElement } from "./slider";
export { textfieldElement, defineTextfield } from "./textfield";
export type { TextfieldSpec, TextfieldElement, TextfieldElementComponent } from "./textfield";
export { radiosElement, radioDeclaration, defineRadios } from "./radios";
export type { RadiosSpec, RadiosElement, RadioAttributes } from "./radios";
export { navigationRailElement, navigationRailItemDeclaration, defineNavigationRail } from "./navigation-rail";
export type { NavigationRailSpec, NavigationRailElement, NavigationRailItemAttributes } from "./navigation-rail";
export { drawerElement, drawerItemDeclaration, defineDrawer } from "./drawer";
export type { DrawerSpec, DrawerElement, DrawerItemAttributes } from "./drawer";
export { topAppBarElement, defineTopAppBar } from "./top-app-bar";
export type { TopAppBarSpec, TopAppBarElement } from "./top-app-bar";
export { bottomAppBarElement, defineBottomAppBar } from "./bottom-app-bar";
export type { BottomAppBarSpec, BottomAppBarElement } from "./bottom-app-bar";

/**
 * Every element, by name. Framework adapters are generated from this list and
 * name `<key>Element` and `define<Key>` after each key, so keys are camelCase.
 */
export const elements = {
  button: buttonElement,
  switch: switchElement,
  tabs: tabsElement,
  progress: progressElement,
  loadingIndicator: loadingIndicatorElement,
  badge: badgeElement,
  divider: dividerElement,
  iconButton: iconButtonElement,
  fab: fabElement,
  extendedFab: extendedFabElement,
  checkbox: checkboxElement,
  slider: sliderElement,
  textfield: textfieldElement,
  radios: radiosElement,
  navigationRail: navigationRailElement,
  drawer: drawerElement,
  topAppBar: topAppBarElement,
  bottomAppBar: bottomAppBarElement,
} as const;

/** Declaration children, which render nothing and are read by their parent. */
export const declarations = {
  tab: tabDeclaration,
  radio: radioDeclaration,
  navigationRailItem: navigationRailItemDeclaration,
  drawerItem: drawerItemDeclaration,
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
  defineIconButton(options);
  defineFab(options);
  defineExtendedFab(options);
  defineCheckbox(options);
  defineSlider(options);
  defineTextfield(options);
  defineRadios(options);
  defineNavigationRail(options);
  defineDrawer(options);
  defineTopAppBar(options);
  defineBottomAppBar(options);
};
