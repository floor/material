// src/components/fab-menu/constants.ts

/**
 * Colour sets (m3.material.io FAB menu specs): the close button takes the
 * role, the items its container role. Match the FAB's colour style.
 */
export const FAB_MENU_COLORS = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  TERTIARY: "tertiary",
} as const;

export type FabMenuColor = (typeof FAB_MENU_COLORS)[keyof typeof FAB_MENU_COLORS];

/** The FAB sizes a menu opens from: not small, not extended. */
export const FAB_MENU_SIZES = {
  DEFAULT: "default",
  MEDIUM: "medium",
  LARGE: "large",
} as const;

export type FabMenuSize = (typeof FAB_MENU_SIZES)[keyof typeof FAB_MENU_SIZES];

/**
 * How the menu presents its items:
 * - list: M3 Expressive's list of pill items above the FAB, which turns into
 *   a close button (compact windows)
 * - menu: the baseline menu, opened from the FAB (the site's rule on the web,
 *   larger windows)
 * - auto: list below 600px, menu from 600px
 */
export const FAB_MENU_PRESENTATIONS = {
  AUTO: "auto",
  LIST: "list",
  MENU: "menu",
} as const;

export type FabMenuPresentation = (typeof FAB_MENU_PRESENTATIONS)[keyof typeof FAB_MENU_PRESENTATIONS];

/** Where the menu sits in its positioned container, or in the flow. */
export const FAB_MENU_PLACEMENTS = {
  NONE: "none",
  BOTTOM_END: "bottom-end",
  BOTTOM_START: "bottom-start",
} as const;

export type FabMenuPlacement = (typeof FAB_MENU_PLACEMENTS)[keyof typeof FAB_MENU_PLACEMENTS];

/** The window width, in px, from which `auto` presents the baseline menu (medium windows). */
export const FAB_MENU_MENU_FROM = 600;

/** The spec's item count: a menu of 2 to 6 related actions. */
export const FAB_MENU_ITEMS = { MIN: 2, MAX: 6 } as const;

/** The space between the list and the close button (FabMenuBaselineTokens.CloseButtonBetweenSpace). */
export const FAB_MENU_LIST_GAP = 8;

/** The gap between the FAB and a baseline menu (m3.material.io FAB menu specs, web). */
export const FAB_MENU_MENU_GAP = 4;

/**
 * How long the items take to leave after the last one starts: FastSpatial,
 * the longest of an item's transitions.
 */
export const FAB_MENU_ITEM_EXIT = 425;

export const FAB_MENU_EVENTS = {
  OPEN: "open",
  CLOSE: "close",
  SELECT: "select",
} as const;
