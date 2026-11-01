// src/components/menu/features/opener-events.ts
//
// What the opener itself does on a click and on a key: toggle the menu, and
// the four keys a menu button answers. Both the opener feature and its
// stand-in (on-demand-behaviour.ts) use these, so the rule -- and the first
// open's behaviour while the chunk is still arriving -- is one implementation.

import { MenuFeatureHost } from "../types";

/** Schedules work the opener's feature may cancel when it is destroyed. */
export type OpenerSchedule = (action: () => void, delay: number) => void;

/**
 * Handles opener element click
 */
export const toggleMenuFromOpener = (
  component: MenuFeatureHost,
  e: MouseEvent,
): void => {
  e.preventDefault();
  e.stopPropagation();

  // Toggle menu visibility with mouse interaction type
  if (component.menu) {
    const isOpen = component.menu.isOpen();

    if (isOpen) {
      component.menu.close(e);
    } else {
      component.menu.open(e, "mouse");
    }
  }
};

/**
 * Handles keyboard events on the opener element
 */
export const handleOpenerKeyboard = (
  component: MenuFeatureHost,
  e: KeyboardEvent,
  schedule: OpenerSchedule,
): void => {
  // Only handle events if we have a menu controller
  if (!component.menu) return;

  // Determine if menu is currently open
  const isOpen = component.menu.isOpen();

  switch (e.key) {
    case "Enter":
    case " ": // Space
    case "ArrowDown":
    case "Down":
      // Prevent default browser behavior
      e.preventDefault();

      // Open menu if closed, with keyboard interaction type
      if (!isOpen) {
        component.menu.open(e, "keyboard");
      }
      break;

    case "Escape":
      // Close the menu if it's open
      if (isOpen) {
        e.preventDefault();
        component.menu.close(e);
      }
      break;

    case "ArrowUp":
    case "Up":
      e.preventDefault();

      // Special case: open menu with focus on last item
      if (!isOpen) {
        component.menu.open(e, "keyboard");

        // Wait for menu to open and grab the last item
        schedule(() => {
          const items = component.element.querySelectorAll(
            `.${component.getClass("menu__item")}:not(.${component.getClass("menu__item--disabled")})`,
          ) as NodeListOf<HTMLElement>;

          if (items.length > 0) {
            // Reset tabindex for all items
            items.forEach((item) => item.setAttribute("tabindex", "-1"));

            // Set the last item as active
            const lastItem = items[items.length - 1];
            lastItem.setAttribute("tabindex", "0");
            lastItem.focus();
          }
        }, 100);
      }
      break;
  }
};
