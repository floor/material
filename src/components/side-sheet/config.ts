// src/components/side-sheet/config.ts

import {
  createComponentConfig,
  createElementConfig,
} from "../../core/config/component";
import { SideSheetConfig } from "./types";
import { SIDE_SHEET_DEFAULTS, SIDE_SHEET_VARIANTS } from "./constants";
import { supportsTopLayer } from "../../core/dom/layer";

/**
 * What the component applies when the caller says nothing.
 */
export const defaultConfig: Partial<SideSheetConfig> = {
  variant: SIDE_SHEET_DEFAULTS.VARIANT,
  position: SIDE_SHEET_DEFAULTS.POSITION,
  width: SIDE_SHEET_DEFAULTS.WIDTH,
  maxWidth: SIDE_SHEET_DEFAULTS.MAX_WIDTH,
  closeButton: SIDE_SHEET_DEFAULTS.CLOSE_BUTTON,
  closeOnScrimClick: SIDE_SHEET_DEFAULTS.CLOSE_ON_SCRIM_CLICK,
  closeOnEscape: SIDE_SHEET_DEFAULTS.CLOSE_ON_ESCAPE,
  open: false,
};

/**
 * Merges the caller's configuration over the defaults.
 */
export const createBaseConfig = (config: SideSheetConfig = {}): SideSheetConfig => {
  const merged = createComponentConfig(defaultConfig, config, "side-sheet") as SideSheetConfig;
  // Only a modal sheet goes to the top layer, and only where it can
  if (
    merged.layer === "top" &&
    (merged.variant !== SIDE_SHEET_VARIANTS.MODAL || !supportsTopLayer("modal"))
  ) {
    merged.layer = undefined;
  }
  return merged;
};

/**
 * The root element: a fixed layer holding the scrim and the sheet itself.
 */
export const getElementConfig = (config: SideSheetConfig) =>
  // `title` is the headline: passed on, it became the native tooltip over
  // the whole surface. The headline names it through aria-labelledby.
  createElementConfig({ ...config, title: undefined }, {
    // In the top layer the root is a native <dialog>, shown with showModal()
    tag: config.layer === "top" ? "dialog" : "div",
    className: [config.class].filter(Boolean),
    attributes: {
      "aria-hidden": "true",
    },
  });
