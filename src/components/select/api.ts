// src/components/select/api.ts
import { SelectComponent, ApiOptions, SelectOption, BaseComponent } from "./types";

/**
 * Enhances a select component with API methods
 * @param options - API configuration options
 * @returns Higher-order function that adds API methods to component
 * @internal
 */
export const withAPI =
  (options: ApiOptions) =>
  (component: BaseComponent): SelectComponent => ({
    ...component,
    element: component.element,
    // withMenu warns and returns early without a textfield, so a select that
    // reaches the API has both
    textField: component.textField!,
    // The 0.10 name, kept as an alias through 1.x (FLO-383)
    get textfield() { return this.textField; },
    menu: component.menu!,

    getValue: options.select.getValue,

    setValue(value: string | null | undefined): SelectComponent {
      options.select.setValue(value);
      return this;
    },

    clear(): SelectComponent {
      options.select.clear();
      return this;
    },

    getText: options.select.getText,

    getSelectedOption: options.select.getSelectedOption,

    getOptions: options.select.getOptions,

    setOptions(newOptions: SelectOption[]): SelectComponent {
      options.select.setOptions(newOptions);
      return this;
    },

    open(interactionType: "mouse" | "keyboard" = "mouse"): SelectComponent {
      // A disabled select does not open. The click and keyboard paths already
      // checked this; open() did not, so code could open a disabled select.
      if (component.textField?.input?.disabled) return this;
      if (component.menu && typeof component.menu.open === "function") {
        component.menu.open(undefined, interactionType);
      } else {
        options.select.open();
      }
      return this;
    },

    close(): SelectComponent {
      options.select.close();
      return this;
    },

    isOpen: options.select.isOpen,

    setDensity(density: string): SelectComponent {
      // Delegate to the textfield's setDensity method
      if (component.textField?.setDensity) {
        component.textField.setDensity(density);
      }
      return this;
    },

    getDensity(): string {
      // Delegate to the textfield's getDensity method
      if (component.textField?.getDensity) {
        return component.textField.getDensity();
      }
      return "default";
    },

    on(event, handler) {
      if (options.events?.on) {
        options.events.on(event, handler);
      } else if (component.on) {
        component.on(event, handler);
      }
      return this;
    },

    off(event, handler) {
      if (options.events?.off) {
        options.events.off(event, handler);
      } else if (component.off) {
        component.off(event, handler);
      }
      return this;
    },

    enable(): SelectComponent {
      options.disabled.enable();
      return this;
    },

    disable(): SelectComponent {
      options.disabled.disable();
      return this;
    },

    isDisabled(): boolean {
      return component.textField?.input?.disabled === true;
    },

    setError(error: boolean, message?: string): SelectComponent {
      // Delegate to the textfield's setError method
      if (component.textField?.setError) {
        component.textField.setError(error, message);
      }
      return this;
    },

    clearError(): SelectComponent {
      // Clear error state on textfield
      if (component.textField?.setError) {
        component.textField.setError(false);
      }
      return this;
    },

    destroy() {
      options.lifecycle.destroy();
    },
  });
