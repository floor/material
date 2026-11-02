// src/components/slider/features/states.ts
import { SLIDER_COLORS, SliderColor } from "../types";
import { SliderConfig } from "../types";

/**
 * Add state management features to slider component
 * Combines appearance and disabled functionality into a single feature
 *
 * @param config Slider configuration
 * @returns Component enhancer with state management features
 */
/** What this feature reads off the component it is handed. */
interface StatesHost {
  element: HTMLElement;
  getClass: (name: string) => string;
  handle?: HTMLElement;
  secondHandle?: HTMLElement;
  formFields?: (HTMLInputElement | null)[] | null;
  renderTracks?: (state?: unknown) => void;
}

export const withStates =
  (config: SliderConfig) =>
  // Generic, so the accumulated pipeline type survives to the features after
  // this one. A concrete parameter type would erase it — the defect fixed in
  // text field's withDensity (#109).
  <C extends StatesHost>(component: C) => {
  const handle = component.handle;
  const secondHandle = component.secondHandle;

  const setFieldsDisabled = (disabled: boolean) => {
    for (const field of component.formFields ?? []) {
      if (field) field.disabled = disabled;
    }
  };

  /**
   * Disables the component
   */
  function disableComponent() {
    component.element.classList.add(
      `${component.getClass("slider")}--disabled`
    );
    component.element.setAttribute("aria-disabled", "true");

    // Ensure handles cannot receive focus when disabled
    if (handle) {
      handle.tabIndex = -1;
      handle.setAttribute("aria-disabled", "true");
    }

    if (config.range && secondHandle) {
      secondHandle.tabIndex = -1;
      secondHandle.setAttribute("aria-disabled", "true");
    }

    // A disabled control submits nothing, which is what a disabled slider means.
    setFieldsDisabled(true);

    // Redraw track with disabled colors
    if (component.renderTracks) {
      component.renderTracks();
    }
  }

  /**
   * Enables the component
   */
  function enableComponent() {
    component.element.classList.remove(
      `${component.getClass("slider")}--disabled`
    );
    component.element.setAttribute("aria-disabled", "false");

    // Re-enable focus on handles
    if (handle) {
      handle.tabIndex = 0;
      handle.setAttribute("aria-disabled", "false");
    }

    if (config.range && secondHandle) {
      secondHandle.tabIndex = 0;
      secondHandle.setAttribute("aria-disabled", "false");
    }

    setFieldsDisabled(false);

    // Redraw track with enabled colors
    if (component.renderTracks) {
      component.renderTracks();
    }
  }

  /**
   * Gets the active color class
   */
  function getActiveColor() {
    return (
      Object.values(SLIDER_COLORS).find((colorName) =>
        component.element.classList.contains(
          `${component.getClass("slider")}--${colorName}`
        )
      ) || SLIDER_COLORS.PRIMARY
    );
  }

  // Disabled from the start, before the listeners exist: this waited a task,
  // which let a disabled slider take keys until then. The track draws itself
  // next (withTracks), so there is nothing to redraw yet. #236.
  if (config.disabled === true) disableComponent();

  // Share the instance so these callbacks see track methods installed next.
  return Object.assign(component, {
    // Disabled state management
    disabled: {
      /**
       * Enables the component
       * @returns Disabled manager for chaining
       */
      enable() {
        enableComponent();
        return this;
      },

      /**
       * Disables the component
       * @returns Disabled manager for chaining
       */
      disable() {
        disableComponent();
        return this;
      },

      /**
       * Checks if component is disabled
       * @returns True if disabled
       */
      isDisabled() {
        return component.element.classList.contains(
          `${component.getClass("slider")}--disabled`
        );
      },
    },

    // Appearance management
    appearance: {
      /**
       * Sets slider color
       * @param color Color variant
       * @returns Appearance manager for chaining
       */
      setColor(color: SliderColor) {
        // Remove existing color classes
        Object.values(SLIDER_COLORS).forEach((colorName) => {
          component.element.classList.remove(
            `${component.getClass("slider")}--${colorName}`
          );
        });

        // Add new color class if not primary (default)
        if (color !== SLIDER_COLORS.PRIMARY) {
          component.element.classList.add(
            `${component.getClass("slider")}--${color}`
          );
        }

        return this;
      },

      /**
       * Gets slider color
       * @returns Current color name
       */
      getColor() {
        return getActiveColor();
      },

      /**
       * Shows or hides tick marks
       * @param show Whether to show ticks
       * @returns Appearance manager for chaining
       */
      showTicks(show: boolean) {
        config.ticks = show;

        // Regenerate ticks if slider is initialized
        component.renderTracks?.();

        return this;
      },

      /**
       * Shows or hides current value bubble during interaction
       * @param show Whether to show value bubble
       * @returns Appearance manager for chaining
       */
      showCurrentValue(show: boolean) {
        config.showValue = show;
        return this;
      },
    },
  });
};
