// src/components/menu/features/opener.ts

import { createMenuTasks } from "./tasks";
import {
  MenuConfig,
  MenuFeatureHost,
  MenuOpenerApi,
  OpenerComponent,
  OpenerTarget,
} from "../types";
import { focusWithin } from "./layer";
import { resolveOpener } from "./opener-target";
import { handleOpenerKeyboard, toggleMenuFromOpener } from "./opener-events";

/**
 * A component used as the menu opener. It is resolved by its element,
 * getElement() or input, and follows the menu's open state when it can.
 */
// OpenerComponent and OpenerTarget moved to ../types, so MenuOpenerApi
// there can name them.

/**
 * Adds opener functionality to menu component
 * Manages the relationship between menu and its opener element
 *
 * @param config - Menu configuration
 * @returns Component enhancer with opener management functionality
 */
const withOpener =
  (config: MenuConfig) =>
  // Generic, so the accumulated pipeline type survives (see #109).
  <C extends MenuFeatureHost>(component: C): C & { opener: MenuOpenerApi } => {
  // There used to be a `if (!component.element)` guard here, warning and
  // returning the component untouched. withElement runs before this in the
  // only pipe that calls it, so it could not fire -- and it made the return
  // type a union of enhanced and not, which collapsed to C and erased this
  // feature from the pipeline type. The host type requires the element.
  const tasks = createMenuTasks();

  // Track keyboard navigation state
  let isTabNavigation = false;

  // Add an event listener to detect Tab key navigation
  let tabTimeout: ReturnType<typeof setTimeout> | null = null;
  const handleTabKey = (e: KeyboardEvent) => {
    // Set flag when Tab key is pressed
    isTabNavigation = e.key === "Tab";

    // Reset flag after a short delay
    tasks.clearTimeout(tabTimeout);
    tabTimeout = tasks.setTimeout(() => {
      isTabNavigation = false;
    }, 100);
  };
  document.addEventListener("keydown", handleTabKey);

  // Track opener state
  const state = {
    openerElement: null as HTMLElement | null,
    openerComponent: null as OpenerComponent | null,
    activeClass: "", // Store the appropriate active class based on element type
  };

  /**
   * Determine the appropriate active class based on element type
   */
  const determineActiveClass = (element: HTMLElement): string => {
    // Check if this is one of our component types
    const classPrefix = component.getClass("").split("-")[0];

    // Check element tag and classes to determine appropriate active class
    // An mtrl button keeps its pressed shape while its menu is open. Any other
    // <button> (a FAB, an icon button) is not a button component: the button's
    // pressed rule would reshape it, as it turned the FAB menu's FAB from 16 to
    // 8px corners and dropped its shadow, so it gets the generic class.
    if (element.tagName === "BUTTON" && element.classList.contains(`${classPrefix}-button`)) {
      return `${classPrefix}-button--active`;
    } else if (element.classList.contains(`${classPrefix}-chip`)) {
      return `${classPrefix}-chip--selected`;
    } else if (
      element.classList.contains(`${classPrefix}-text-field`) ||
      element.classList.contains(`${classPrefix}-select`)
    ) {
      return `${classPrefix}-text-field--focused`;
    } else {
      // Default active class for other elements
      return `${classPrefix}-menu__opener--active`;
    }
  };

  /**
   * Sets up opener click handler for toggling menu
   */
  const setupOpenerEvents = (openerData: {
    element: HTMLElement;
    component: OpenerComponent | null;
  }): void => {
    const { element: openerElement, component: openerComponent } = openerData;

    if (tasks.destroyed || !openerElement) return;

    // Remove previously attached event if any
    if (state.openerElement && state.openerElement !== openerElement) {
      cleanup();
    }

    // Store references
    state.openerElement = openerElement;
    state.openerComponent = openerComponent;

    // Determine the appropriate active class for this opener
    state.activeClass = determineActiveClass(openerElement);

    // When manualOpen is true, the opener is only used for positioning —
    // the consumer calls open()/close() themselves.
    if (!config.manualOpen) {
      // Add click handler
      openerElement.addEventListener("click", handleOpenerClick);

      // Add keyboard handlers
      openerElement.addEventListener("keydown", handleOpenerKeydown);

      // Add blur/focusout handler to close menu when opener loses focus
      openerElement.addEventListener("blur", handleOpenerBlur);
    }

    // A listbox popup belongs to a combobox, which carries its own ARIA
    if (config.listbox) return;

    // Add ARIA attributes
    openerElement.setAttribute("aria-haspopup", "true");
    openerElement.setAttribute("aria-expanded", "false");

    // Get menu ID or generate one
    let menuId = component.element.id;
    if (!menuId) {
      menuId = `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      component.element.id = menuId;
    }

    // Connect menu and opener with ARIA
    openerElement.setAttribute("aria-controls", menuId);
  };

  /**
   * Applies active visual state to opener
   */
  const setOpenerActive = (active: boolean): void => {
    if (!state.openerElement) return;

    // Case 1: Component with setActive method (like our button component)
    if (
      state.openerComponent &&
      typeof state.openerComponent.setActive === "function"
    ) {
      state.openerComponent.setActive(active);
      return;
    }

    // Case 2: Component with selected property (like our chip component)
    if (state.openerComponent && "selected" in state.openerComponent) {
      state.openerComponent.selected = active;
      return;
    }

    // Case 3: TextField component with focus/blur methods
    if (
      state.openerComponent &&
      typeof state.openerComponent.focus === "function" &&
      typeof state.openerComponent.blur === "function"
    ) {
      if (active) {
        state.openerComponent.focus();
      } else {
        state.openerComponent.blur();
      }
      return;
    }

    // Case 4: Standard DOM element fallback with classes
    if (state.openerElement.classList) {
      if (active) {
        state.openerElement.classList.add(state.activeClass);
      } else {
        state.openerElement.classList.remove(state.activeClass);
      }
    }
  };

  /**
   * Restores focus to the opener properly
   * Handles both component and element cases
   */
  const restoreFocusToOpener = (): void => {
    // Skip if we don't have a valid opener
    if (!state.openerElement) return;

    // Case 1: Component with focus method
    const openerComponent = state.openerComponent;
    if (openerComponent && typeof openerComponent.focus === "function") {
      tasks.requestAnimationFrame(() => {
        openerComponent.focus!();
      });
      return;
    }

    // Case

    // Case 2: Component with input that can be focused (like text field)
    if (
      openerComponent &&
      "input" in openerComponent &&
      openerComponent.input instanceof HTMLElement
    ) {
      const input = openerComponent.input;
      tasks.requestAnimationFrame(() => {
        input.focus();
      });
      return;
    }

    // Case 3: Default - focus the element directly
    const openerElement = state.openerElement;
    if (!openerElement) return;
    tasks.requestAnimationFrame(() => {
      openerElement.focus();
    });
  };

  /**
   * Handles opener element click
   */
  const handleOpenerClick = (e: MouseEvent): void => {
    toggleMenuFromOpener(component, e);
  };

  /**
   * Handles keyboard events on the opener element
   */
  const handleOpenerKeydown = (e: KeyboardEvent): void => {
    handleOpenerKeyboard(component, e, (action, delay) => {
      tasks.setTimeout(action, delay);
    });
  };

  /**
   * Handles opener blur/focusout events
   */
  const handleOpenerBlur = (e: FocusEvent): void => {
    // Only handle events if we have a menu controller and menu is open
    if (!component.menu || !component.menu.isOpen()) return;

    // Get the related target (element receiving focus)
    const relatedTarget = e.relatedTarget as HTMLElement;

    // If this is tab navigation, always close the menu regardless of next focus target
    if (isTabNavigation) {
      tasks.setTimeout(() => {
        // Verify menu is still open (may have been closed in the meantime)
        if (component.menu && component.menu.isOpen()) {
          // Close the menu but don't restore focus
          component.menu.close(e, false);
        }
      }, 10);
      return;
    }

    // For non-tab navigation (like mouse clicks):
    // Don't close if focus is moving to any of these:
    // 1. To the menu itself
    // 2. To a child of the menu
    // 3. To another menu button/opener
    if (relatedTarget) {
      // Check if focus moved to menu or its children
      if (focusWithin(config, component.element, relatedTarget)) {
        return;
      }

      // Check if focus moved to another menu button/opener (has aria-haspopup)
      if (
        relatedTarget.getAttribute("aria-haspopup") === "true" ||
        relatedTarget.closest('[aria-haspopup="true"]')
      ) {
        return;
      }
    }

    // Wait a brief moment to ensure we're not in the middle of another operation
    // This helps prevent conflicts with click handlers
    tasks.setTimeout(() => {
      // Verify menu is still open (may have been closed in the meantime)
      if (component.menu && component.menu.isOpen()) {
        // Close the menu but don't restore focus since focus has moved elsewhere
        component.menu.close(e, false);
      }
    }, 50);
  };

  /**
   * Removes event listeners from opener
   */
  const cleanup = (): void => {
    tasks.cancelAll();
    tabTimeout = null;
    isTabNavigation = false;
    if (state.openerElement) {
      if (!config.manualOpen) {
        state.openerElement.removeEventListener("click", handleOpenerClick);
        state.openerElement.removeEventListener("keydown", handleOpenerKeydown);
        state.openerElement.removeEventListener("blur", handleOpenerBlur);
      }
      state.openerElement.removeAttribute("aria-haspopup");
      state.openerElement.removeAttribute("aria-expanded");
      state.openerElement.removeAttribute("aria-controls");

      // Clean up active state if present
      setOpenerActive(false);
    }

    // Reset state
    state.openerComponent = null;
    state.openerElement = null;
    state.activeClass = "";
  };

  // Initialize with provided opener
  const { element, component: openerComponent } = resolveOpener(config.opener);
  if (element) setupOpenerEvents({ element, component: openerComponent });

  // Register with lifecycle if available
  if (component.lifecycle) {
    const originalDestroy = component.lifecycle.destroy || (() => {});
    component.lifecycle.destroy = () => {
      if (tasks.destroyed) return;
      tasks.destroy();
      document.removeEventListener("keydown", handleTabKey);
      cleanup();
      originalDestroy.call(component.lifecycle);
    };
  }

  // Listen for menu state changes to update opener
  component.on("open", () => {
    if (state.openerElement && !config.listbox) {
      state.openerElement.setAttribute("aria-expanded", "true");
      setOpenerActive(true);
    }
  });

  component.on("close", (event: { restoreFocus?: boolean }) => {
    if (state.openerElement && !config.listbox) {
      // Always update ARIA attributes
      state.openerElement.setAttribute("aria-expanded", "false");
      setOpenerActive(false);

      // Handle focus restoration when requested
      if (event.restoreFocus && !isTabNavigation) {
        restoreFocusToOpener();
      }
    }
  });

  // Return enhanced component
  return {
    ...component,
    opener: {
      /**
       * Sets a new opener element
       * @param opener - New opener element, selector, or component
       * @returns Component for chaining
       */
      setOpener(opener: OpenerTarget) {
        const resolved = resolveOpener(opener);
        if (resolved.element) {
          setupOpenerEvents({ element: resolved.element, component: resolved.component });
        }
        return component;
      },

      /**
       * Gets the current opener element
       * @returns Current opener element
       */
      getOpener() {
        return state.openerElement;
      },

      /**
       * Gets the current opener component if available
       * @returns Current opener component or null
       */
      getOpenerComponent() {
        return state.openerComponent;
      },

      /**
       * Sets the active state of the opener
       * @param active - Whether opener should appear active
       * @returns Component for chaining
       */
      setActive(active: boolean) {
        setOpenerActive(active);
        return component;
      },

      /**
       * Restores focus to the opener
       * @returns Component for chaining
       */
      focus() {
        restoreFocusToOpener();
        return component;
      },
    },
  };
};

export default withOpener;
