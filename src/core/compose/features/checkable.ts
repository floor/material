// src/core/compose/features/checkable.ts

import { BaseComponent } from "../component";

/**
 * Configuration for checkable feature
 */
export interface CheckableConfig {
  checked?: boolean;
}

/**
 * Component with input element
 */
export interface InputComponent extends BaseComponent {
  element: HTMLElement;
  input: HTMLInputElement;
  emit?: (event: string, data: unknown) => unknown;
  /** This feature only subscribes to change and does not read its payload. */
  on?: (event: "change", handler: () => void) => unknown;
}

/**
 * Checkable state manager interface
 */
export interface CheckableManager {
  /**
   * Sets the checked state to true. Silent: only the user's change emits `change`.
   * @returns CheckableManager instance for chaining
   */
  check: () => CheckableManager;

  /**
   * Sets the checked state to false. Silent.
   * @returns CheckableManager instance for chaining
   */
  uncheck: () => CheckableManager;

  /**
   * Toggles the current checked state. Silent.
   * @returns CheckableManager instance for chaining
   */
  toggle: () => CheckableManager;

  /**
   * Gets the current checked state
   * @returns Whether component is checked
   */
  isChecked: () => boolean;
}

/**
 * Component with checkable capabilities
 */
export interface CheckableComponent extends BaseComponent {
  checkable: CheckableManager;
}

/**
 * Adds checked state management to a component with an input
 * Manages visual state and event emission for checked changes
 *
 * @param config - Checkable configuration
 * @returns Function that enhances a component with checkable functionality
 */
export const withCheckable =
  // `& object` lets a component config that shares no key with CheckableConfig through.
  <T extends CheckableConfig & object>(config: T = {} as T) =>
  <C extends InputComponent>(component: C): C & CheckableComponent => {
    if (!component.input) return component as C & CheckableComponent;

    // Get the component name from config or component
    const componentName = component.componentName || "component";

    /**
     * Updates component classes to reflect checked state
     */
    const updateStateClasses = (): void => {
      component.element.classList.toggle(
        `${component.getClass(componentName)}--checked`,
        component.input.checked
      );
    };

    // Set initial state - handle both true and false explicitly
    if (config.checked !== undefined) {
      component.input.checked = config.checked;
    }

    // Always update classes to ensure visual state matches input state
    updateStateClasses();

    // Update classes whenever checked state changes
    if (component.emit) {
      component.on?.("change", updateStateClasses);
    }

    // A programmatic change is silent, as setting a native input's `checked`:
    // only the user's change emits `change`.
    const checkable: CheckableManager = {
      /**
       * Sets the checked state to true. Silent.
       * @returns CheckableManager instance for chaining
       */
      check() {
        component.input.checked = true;
        updateStateClasses();
        return this;
      },

      /**
       * Sets the checked state to false. Silent.
       * @returns CheckableManager instance for chaining
       */
      uncheck() {
        component.input.checked = false;
        updateStateClasses();
        return this;
      },

      /**
       * Toggles the current checked state. Silent.
       * @returns CheckableManager instance for chaining
       */
      toggle() {
        component.input.checked = !component.input.checked;
        updateStateClasses();
        return this;
      },

      /**
       * Gets the current checked state
       * @returns Whether component is checked
       */
      isChecked() {
        return component.input.checked;
      },
    };

    return {
      ...component,
      checkable,
    };
  };
