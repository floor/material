import type { ItemsFeature } from "./features/items";
// src/components/drawer/config.ts
import {
  createComponentConfig,
  createElementConfig,
} from "../../core/config/component";
import { NavigationDrawerConfig } from "./types";
import { DRAWER_DEFAULTS } from "./constants";
import { supportsTopLayer } from "../../core/dom/layer";

/**
 * Default configuration for the Drawer component.
 * These values will be used when not explicitly specified by the user.
 *
 * @category Components
 */
export const defaultConfig: NavigationDrawerConfig = {
  variant: DRAWER_DEFAULTS.VARIANT,
  position: DRAWER_DEFAULTS.POSITION,
  open: DRAWER_DEFAULTS.OPEN,
  dismissible: DRAWER_DEFAULTS.DISMISSIBLE,
  width: DRAWER_DEFAULTS.WIDTH,
  ripple: DRAWER_DEFAULTS.RIPPLE,
  items: [],
};

/**
 * Creates the base configuration for the Drawer component by merging
 * user-provided config with default values. Global configuration is
 * automatically applied by createComponentConfig.
 *
 * @param {NavigationDrawerConfig} config - User provided configuration
 * @returns {NavigationDrawerConfig} Complete configuration with defaults applied
 * @category Components
 * @internal
 */
export const createBaseConfig = (config: NavigationDrawerConfig = {}): NavigationDrawerConfig => {
  const merged = createComponentConfig(defaultConfig, config, "drawer") as NavigationDrawerConfig;
  // Only a modal drawer goes to the top layer, and only where it can
  if (merged.layer === "top" && (merged.variant !== "modal" || !supportsTopLayer("modal"))) {
    merged.layer = undefined;
  }
  return merged;
};

/**
 * Generates element configuration for the Drawer component.
 * This function creates the necessary attributes and configuration
 * for the DOM element creation process.
 *
 * @param {NavigationDrawerConfig} config - Drawer configuration
 * @returns {Object} Element configuration object for withElement
 * @category Components
 * @internal
 */
export const getElementConfig = (config: NavigationDrawerConfig) => {
  const isModal = config.variant === "modal";

  const attributes: Record<string, string | boolean | undefined> = {};

  // Modal drawers are dialogs; standard drawers are navigation landmarks
  if (isModal) {
    attributes.role = "dialog";
    attributes["aria-modal"] = "true";
  } else {
    attributes.role = "navigation";
  }

  attributes["aria-label"] = config.ariaLabel || config.headline || "Navigation";
  attributes.tabindex = "-1";

  return createElementConfig(config, {
    // In the top layer the modal root is a native <dialog>, shown with showModal()
    tag: config.layer === "top" ? "dialog" : "aside",
    attributes,
    className: [
      config.dense ? `${config.prefix}-drawer--dense` : null,
      config.class,
    ].filter(Boolean),
    forwardEvents: {
      click: true,
      keydown: true,
    },
  });
};

/**
 * Creates API configuration for the Drawer component.
 * This connects the core component features (state, items, headline)
 * to the public API methods exposed to users.
 *
 * @param {Object} comp - Component with all features applied
 * @returns {Object} API configuration object
 * @category Components
 * @internal
 */
export const getApiConfig = (comp: {
  drawerState: {
    open: () => void;
    close: () => void;
    toggle: () => void;
    isOpen: () => boolean;
  };
  drawerItems: ItemsFeature["drawerItems"];
  drawerHeadline: {
    setHeadline: (text: string) => void;
    getHeadline: () => string;
  };
  lifecycle: {
    destroy: () => void;
  };
  _stateCleanup?: () => void;
}) => ({
  state: {
    open: () => comp.drawerState.open(),
    close: () => comp.drawerState.close(),
    toggle: () => comp.drawerState.toggle(),
    isOpen: () => comp.drawerState.isOpen(),
  },
  items: {
    setActive: (id: string) => comp.drawerItems.setActive(id),
    getActive: () => comp.drawerItems.getActive(),
    setItems: (items: NavigationDrawerConfig["items"]) =>
      comp.drawerItems.setItems(items || []),
    getItems: () => comp.drawerItems.getItems(),
    setBadge: (id: string, badge: string) =>
      comp.drawerItems.setBadge(id, badge),
    expandSection: comp.drawerItems.expandSection,
    collapseSection: comp.drawerItems.collapseSection,
    toggleSection: comp.drawerItems.toggleSection,
    isSectionExpanded: comp.drawerItems.isSectionExpanded,
    getExpandedSections: comp.drawerItems.getExpandedSections,
  },
  headline: {
    setHeadline: (text: string) => comp.drawerHeadline.setHeadline(text),
    getHeadline: () => comp.drawerHeadline.getHeadline(),
  },
  lifecycle: {
    destroy: () => {
      if (comp._stateCleanup) {
        comp._stateCleanup();
      }
      comp.drawerItems.destroy();
      comp.lifecycle.destroy();
    },
  },
});

export default defaultConfig;
