// src/components/drawer/index.ts

/**
 * Drawer component module
 * @module components/drawer
 */

export { default, default as createNavigationDrawer } from './drawer';
/** @deprecated use `createNavigationDrawer`. */
export { createDrawer } from './drawer';
export type {
  NavigationDrawerConfig,
  NavigationDrawerComponent,
  NavigationDrawerVariant,
  NavigationDrawerPosition,
  NavigationDrawerItemConfig,
  NavigationDrawerSelectEvent,
  NavigationDrawerSectionEvent,
  NavigationDrawerEvents,
  /** @deprecated use `NavigationDrawerConfig`. */
  DrawerConfig,
  /** @deprecated use `NavigationDrawerComponent`. */
  DrawerComponent,
  /** @deprecated use `NavigationDrawerVariant`. */
  DrawerVariant,
  /** @deprecated use `NavigationDrawerPosition`. */
  DrawerPosition,
  /** @deprecated use `NavigationDrawerItemConfig`. */
  DrawerItemConfig,
  /** @deprecated use `NavigationDrawerSelectEvent`. */
  DrawerSelectEvent,
  /** @deprecated use `NavigationDrawerSectionEvent`. */
  DrawerSectionEvent,
  /** @deprecated use `NavigationDrawerEvents`. */
  DrawerEvents,
} from './types';
