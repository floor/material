// src/components/chips/config.ts
import type { EventCallback } from "../../core/state/emitter";
// Class names are written out in full. The class helpers no longer add the
// `mtrl-` prefix for you (FLO-117), so a modifier built here carries it.
import { PREFIX } from "../../core/config";
import {
  createComponentConfig,
  createElementConfig,
} from "../../core/config/component";
import { ChipsConfig } from "./types";
import type { ApiOptions } from "./api";

/**
 * Default configuration for the Chips component
 */
export const defaultConfig: ChipsConfig = {
  chips: [],
  scrollable: false,
  vertical: false,
  multiSelect: true,
  selectionRequired: false,
  onChange: undefined,
  selector: null,
  labelPosition: "start",
};

/**
 * Creates the base configuration for Chips component
 * @param {ChipsConfig} config - User provided configuration
 * @returns {ChipsConfig} Complete configuration with defaults applied
 */
export const createBaseConfig = (config: ChipsConfig = {}): ChipsConfig => {
  // Create the base config with defaults applied
  const baseConfig = createComponentConfig(
    defaultConfig,
    config,
    "chips",
  ) as ChipsConfig;

  return baseConfig;
};

/**
 * Generates element configuration for the Chips component
 * @param {ChipsConfig} config - Chips configuration
 * @returns {Object} Element configuration object for withElement
 */
export const getElementConfig = (config: ChipsConfig) => {
  // Set default values
  const scrollable = config.scrollable === true;
  const vertical = config.vertical === true;
  const hasLabel = config.label && config.label.trim().length > 0;
  const labelPosition = config.labelPosition || "start";

  const classes = [
    "chips",
    config.class,
    scrollable ? `${PREFIX}-chips--scrollable` : "",
    vertical ? `${PREFIX}-chips--vertical` : "",
    hasLabel ? `${PREFIX}-chips--with-label` : "",
    hasLabel && labelPosition === "end" ? `${PREFIX}-chips--label-end` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createElementConfig(config, {
    tag: "div",
    // A grid of chip cells (the m3.material.io chips' web roles, FLO-261), where
    // aria-multiselectable is allowed and says whether several cells can be selected.
    attributes: {
      role: "grid",
      "aria-multiselectable": config.multiSelect === false ? "false" : "true",
    },
    className: classes,
  });
};

/**
 * Creates API configuration for the Chips component
 * @param {Object} comp - Component with chips features
 * @param {ChipsConfig} config - Chips configuration
 * @returns {Object} API configuration object
 */
/**
 * What getApiConfig reads off the chips component.
 *
 * Every key is a sub-object one of the features installs. They are optional
 * for the reason the forwarding below uses `?.`: this is written to tolerate a
 * feature that did not install.
 */
interface ChipsApiHost {
  chips?: Partial<ApiOptions["chips"]>;
  layout?: Partial<ApiOptions["layout"]>;
  /** withDom's label API, which adds, renames, removes and places the label. */
  labelControl?: Partial<ApiOptions["label"]>;
  // The feature calls these enable and disable; ApiOptions calls them
  // enableKeyboardNavigation and disableKeyboardNavigation, and this function
  // is the bridge. Named from the producer.
  keyboard?: { enable?: () => void; disable?: () => void };
  on?: (event: string, handler: EventCallback) => unknown;
  off?: (event: string, handler: EventCallback) => unknown;
  lifecycle?: { destroy?: () => void };
}

export const getApiConfig = (
  comp: ChipsApiHost,
  config?: ChipsConfig,
): ApiOptions => ({
  config: {
    multiSelect: config?.multiSelect ?? true,
  },
  chips: {
    addChip: function (chipConfig) {
      if (comp.chips && typeof comp.chips.addChip === "function") {
        return comp.chips.addChip(chipConfig);
      }
      return null;
    },
    removeChip: (chipOrIndex) => comp.chips?.removeChip?.(chipOrIndex),
    getChips: () => comp.chips?.getChips?.() ?? [],
    getSelectedChips: () => comp.chips?.getSelectedChips?.() ?? [],
    getSelectedValues: () => comp.chips?.getSelectedValues?.() ?? [],
    selectByValue: (values) => comp.chips?.selectByValue?.(values),
    clearSelection: () => comp.chips?.clearSelection?.(),
    scrollToChip: (chipOrIndex) => comp.chips?.scrollToChip?.(chipOrIndex),
  },
  layout: {
    setScrollable: (isScrollable) => comp.layout?.setScrollable?.(isScrollable),
    isScrollable: () => comp.layout?.isScrollable?.() ?? false,
    setVertical: (isVertical) => comp.layout?.setVertical?.(isVertical),
    isVertical: () => comp.layout?.isVertical?.() ?? false,
  },
  label: {
    setText: (t) => comp.labelControl?.setText?.(t),
    getText: () => comp.labelControl?.getText?.() ?? "",
    setPosition: (p) => comp.labelControl?.setPosition?.(p),
    getPosition: () => comp.labelControl?.getPosition?.() ?? "start",
  },
  keyboard: {
    enableKeyboardNavigation: () => comp.keyboard?.enable?.(),
    disableKeyboardNavigation: () => comp.keyboard?.disable?.(),
  },
  events: {
    on: (e, h) => comp.on?.(e, h),
    off: (e, h) => comp.off?.(e, h),
  },
  lifecycle: {
    destroy: () => comp.lifecycle?.destroy?.(),
  },
});
