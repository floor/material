// src/components/bottom-sheet/config.ts

import {
  createComponentConfig,
  createElementConfig,
} from "../../core/config/component";
import { BottomSheetConfig } from "./types";
import {
  BOTTOM_SHEET_DEFAULTS,
  BOTTOM_SHEET_STATES,
  BOTTOM_SHEET_VARIANTS,
} from "./constants";
import { supportsTopLayer } from "../../core/dom/layer";

/**
 * What the component applies when the caller says nothing.
 */
export const defaultConfig: Partial<BottomSheetConfig> = {
  variant: BOTTOM_SHEET_DEFAULTS.VARIANT,
  dragHandle: BOTTOM_SHEET_DEFAULTS.DRAG_HANDLE,
  maxWidth: BOTTOM_SHEET_DEFAULTS.MAX_WIDTH,
  initialState: BOTTOM_SHEET_STATES.HIDDEN,
  closeOnScrimClick: BOTTOM_SHEET_DEFAULTS.CLOSE_ON_SCRIM_CLICK,
  closeOnEscape: BOTTOM_SHEET_DEFAULTS.CLOSE_ON_ESCAPE,
};

/**
 * Merges the caller's configuration over the defaults.
 */
export const createBaseConfig = (
  config: BottomSheetConfig = {}
): BottomSheetConfig => {
  const merged = createComponentConfig(
    defaultConfig,
    config,
    "bottom-sheet"
  ) as BottomSheetConfig;
  // Only a modal sheet goes to the top layer, and only where it can
  if (
    merged.layer === "top" &&
    (merged.variant !== BOTTOM_SHEET_VARIANTS.MODAL || !supportsTopLayer("modal"))
  ) {
    merged.layer = undefined;
  }
  return merged;
};

/**
 * The root element: a fixed layer holding the scrim and the sheet itself.
 */
export const getElementConfig = (config: BottomSheetConfig) =>
  // `title` is the headline: passed on, it became the native tooltip over
  // the whole surface. The headline names it through aria-labelledby.
  createElementConfig({ ...config, title: undefined }, {
    // In the top layer the root is a native <dialog>, shown with showModal()
    tag: config.layer === "top" ? "dialog" : "div",
    className: [config.class].filter(Boolean),
    attributes: {
      // hidden until it opens, so nothing in it is reachable meanwhile
      "aria-hidden": "true",
    },
  });
