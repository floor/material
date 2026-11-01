// src/components/split-button/features/menu.ts
//
// The menu the trailing button opens, when the caller hands over items. A
// split button that is given none still reports that its trailing button was
// activated, so the caller can open whatever it likes: the guidelines allow
// other surfaces, a menu is only the usual one.
//
// The menu itself is a chunk: the first open loads it (menu-on-demand.ts).
// Until it arrives the button's stand-in answers the menu's API, so its own
// state, ARIA and events are still there when expand() returns.

import type { MenuComponent, MenuContent } from "../../menu/types";
import { MENU } from "../../menu/inner";
import type { ElementComponent } from "../../../core/compose/component";
import { ButtonsFeature, MenuFeature, SplitButtonConfig } from "../types";
import { SPLIT_BUTTON_DEFAULTS } from "../constants";
import { createOnDemandMenu } from "./menu-on-demand";

/**
 * Adds a menu anchored to the trailing button
 * @param {SplitButtonConfig} config - Component configuration
 * @returns {Function} Higher-order function that adds the menu
 */
export const makeMenu = (config: SplitButtonConfig, trailing: HTMLElement, items: MenuContent[]): MenuComponent =>
  // Aligned to the trailing button and 4dp from it, as the guidelines ask.
  // The component opens and closes it, so the menu does not listen to the
  // opener itself.
  createOnDemandMenu(
    {
      opener: trailing,
      position: "bottom-end",
      offset: SPLIT_BUTTON_DEFAULTS.MENU_OFFSET,
      manualOpen: true,
      ...(config.layer ? { layer: config.layer } : {}),
      prefix: config.prefix,
    },
    items,
  );

export const withMenu =
  (config: SplitButtonConfig) =>
  <C extends ElementComponent & ButtonsFeature>(component: C): C & MenuFeature => {
    if (!config.items || config.items.length === 0) return component;
    return {
      ...component,
      [MENU]: makeMenu(config, component.trailingElement, config.items as MenuContent[]),
    };
  };
