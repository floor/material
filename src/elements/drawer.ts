// src/elements/drawer.ts
/**
 * `<m-drawer>` and `<m-drawer-item>`: the navigation drawer under its old
 * name, kept for 3.x. The rules are navigation-drawer.ts's; see
 * `<m-navigation-drawer>`.
 *
 * @deprecated use `<m-navigation-drawer>`. Material Design 3 names the
 * component the navigation drawer.
 *
 * @module elements
 */

import type { NavigationDrawerComponent } from "../components/drawer/types";
import { createDrawerSpec, createItemDeclaration } from "./navigation-drawer";
import { createDeclarationClass, defineElement, type DefineOptions, type ElementAttributes, type ElementInstance } from "./define";
import { DEFAULT_PREFIX } from "./define";

const drawerSpec = createDrawerSpec("drawer");
/** @deprecated use `navigationDrawerElement`. */
export const drawerElement = defineElement<NavigationDrawerComponent>(drawerSpec);
/** @deprecated use `NavigationDrawerSpec`. */
export type DrawerSpec = typeof drawerSpec;
/** @deprecated use `NavigationDrawerElement`. */
export interface DrawerElement extends ElementInstance<DrawerSpec, NavigationDrawerComponent> {
  expandSection(id: string): this;
  collapseSection(id: string): this;
  toggleSection(id: string): this;
  isSectionExpanded(id: string): boolean;
  getExpandedSections(): string[];
}

/** @deprecated use `navigationDrawerItemDeclaration`. */
export const drawerItemDeclaration = createItemDeclaration("drawer-item");
/** @deprecated use `NavigationDrawerItemAttributes`. */
export type DrawerItemAttributes = ElementAttributes<typeof drawerItemDeclaration>;

/**
 * @deprecated use `defineNavigationDrawer`. Registers `<m-drawer>` and
 * `<m-drawer-item>` (or with another prefix).
 */
export const defineDrawer = (options?: DefineOptions): string => {
  const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${drawerItemDeclaration.name}`;
  if (!customElements.get(itemTag)) customElements.define(itemTag, createDeclarationClass(drawerItemDeclaration.attributes));
  return drawerElement.define(options);
};

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    /** @deprecated use `m-navigation-drawer`. */
    "m-drawer": DrawerElement;
    /** @deprecated use `m-navigation-drawer-item`. */
    "m-drawer-item": HTMLElement & DrawerItemAttributes;
  }
}
