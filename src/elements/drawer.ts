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
import { createDrawerSpec } from "./navigation-drawer";
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

/**
 * @deprecated use `navigationDrawerItemDeclaration`.
 *
 * `<m-drawer-item>` declares one destination, section headline or divider,
 * and renders nothing. Its text content is the label unless `label` is set.
 */
export const drawerItemDeclaration = {
  name: "drawer-item",
  attributes: {
    type: { type: "string" },
    value: { type: "string" },
    label: { type: "string" },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
    icon: { type: "string" },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. Shown while this destination is active. */
    "selected-icon": { type: "string" },
    badge: { type: "string" },
    href: { type: "string" },
    expanded: { type: "boolean" },
    disabled: { type: "boolean" },
  },
} as const;
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
