// src/components/menu/surface.ts
//
// createMenu with its behaviour stages -- position, keyboard and opener --
// loaded on the first open instead of at creation. For a select: the menu,
// its items, its ids and a listbox's ARIA are the menu from the start, so
// open() answers on its own tick; what waits for the chunk is only where the
// menu is placed and how keys move in it.
//
// The split button's menu is a different deferral: its whole menu is a
// stand-in until the chunk arrives (split-button/features/menu-on-demand.ts)
// because nothing about it has to exist before the open. A select's does, so
// this surface composes the real menu and defers the three stages that act on
// it after it opens.

import { pipe } from "../../core/compose";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withLifecycle } from "../../core/compose/features";
import withController from "./features/controller";
import { createOnDemandBehaviour } from "./features/on-demand-behaviour";
import { withAPI } from "./api";
import { MenuConfig, MenuComponent } from "./types";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config";

/**
 * Creates a menu whose behaviour is loaded on the first open.
 *
 * @param config - Configuration options for the menu; an opener is required
 * @returns A menu with the same contract as createMenu, whose placement,
 *  keyboard and opener features arrive with the first open
 */
const createSurfaceMenu = (config: MenuConfig): MenuComponent => {
  try {
    const baseConfig = createBaseConfig(config);
    const behaviour = createOnDemandBehaviour(baseConfig);

    const menu: MenuComponent = pipe(
      createBase, // Base component
      withEvents(), // Event handling
      withElement(getElementConfig(baseConfig)), // DOM element
      withLifecycle(), // Features register their cleanup on this lifecycle
      behaviour.withPositionAndKeyboard, // Placement and keys, on demand
      withController(baseConfig, (): MenuComponent => menu), // Menu controller
      behaviour.withOpener, // Opener management, its synchronous half now
      (comp) => withAPI(getApiConfig(comp))(comp), // Public API
    )(baseConfig);

    // Register event handlers from config
    if (baseConfig.on && typeof menu.on === "function") {
      Object.entries(baseConfig.on).forEach(([event, handler]) => {
        if (typeof handler === "function") {
          menu.on(event, handler);
        }
      });
    }

    return menu;
  } catch (error) {
    console.error("Menu creation error:", error);
    throw new Error(`Failed to create menu: ${(error as Error).message}`);
  }
};

export default createSurfaceMenu;
