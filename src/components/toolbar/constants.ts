// src/components/toolbar/constants.ts

/**
 * Toolbar variants (m3.material.io toolbars)
 * - docked: full width at the bottom of the window, for global actions
 * - floating: a pill above the content, for contextual actions
 */
export const TOOLBAR_VARIANTS = {
  DOCKED: "docked",
  FLOATING: "floating",
} as const;

export type ToolbarVariant = (typeof TOOLBAR_VARIANTS)[keyof typeof TOOLBAR_VARIANTS];

/**
 * Toolbar colours
 * - standard: surface container, low emphasis
 * - vibrant: primary container, high emphasis (e.g. an edit mode)
 */
export const TOOLBAR_COLORS = {
  STANDARD: "standard",
  VIBRANT: "vibrant",
} as const;

export type ToolbarColor = (typeof TOOLBAR_COLORS)[keyof typeof TOOLBAR_COLORS];

/** Floating toolbar layouts. A docked toolbar is always horizontal. */
export const TOOLBAR_ORIENTATIONS = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
} as const;

export type ToolbarOrientation = (typeof TOOLBAR_ORIENTATIONS)[keyof typeof TOOLBAR_ORIENTATIONS];

/**
 * Where the toolbar sits in its positioned container.
 * - none: in the flow, placed by the page
 * - bottom, top: a horizontal toolbar (docked: bottom only)
 * - start, end: a vertical toolbar, on the reading-direction side
 */
export const TOOLBAR_PLACEMENTS = {
  NONE: "none",
  BOTTOM: "bottom",
  TOP: "top",
  START: "start",
  END: "end",
} as const;

export type ToolbarPlacement = (typeof TOOLBAR_PLACEMENTS)[keyof typeof TOOLBAR_PLACEMENTS];

/**
 * How a docked toolbar lays out its items: spread evenly across the width
 * (compact windows), or centred 32dp apart (medium windows and up).
 */
export const TOOLBAR_ARRANGEMENTS = {
  SPREAD: "spread",
  CENTER: "center",
} as const;

export type ToolbarArrangement = (typeof TOOLBAR_ARRANGEMENTS)[keyof typeof TOOLBAR_ARRANGEMENTS];

/** Scroll behaviours: stay on screen, or leave it while scrolling forward. */
export const TOOLBAR_SCROLL_BEHAVIORS = {
  NONE: "none",
  EXIT: "exit",
} as const;

export type ToolbarScrollBehavior = (typeof TOOLBAR_SCROLL_BEHAVIORS)[keyof typeof TOOLBAR_SCROLL_BEHAVIORS];

/** Which side of a floating toolbar its FAB sits on, along the toolbar. */
export type ToolbarFabPosition = "start" | "end";

/**
 * The scroll distance, in px, that hides or shows the toolbar
 * (Compose FloatingToolbarDefaults.ScrollDistanceThreshold, 40dp).
 */
export const TOOLBAR_SCROLL_THRESHOLD = 40;

export const TOOLBAR_EVENTS = {
  SHOW: "show",
  HIDE: "hide",
} as const;
