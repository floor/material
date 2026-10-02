// src/core/compose/features/textinput.ts

import { ElementComponent } from "../component";
import { hasLifecycle, hasEmit } from "../utils/type-guards";

/**
 * Configuration for text input feature
 */
export interface TextInputConfig {
  /**
   * Input type (text, password, etc.)
   */
  type?: string;

  /**
   * Whether to use textarea instead of input
   */
  multiline?: boolean;

  /**
   * Input name attribute
   */
  name?: string;

  /**
   * Whether input is required
   */
  required?: boolean;

  /**
   * Whether input is disabled
   */
  disabled?: boolean;

  /**
   * Maximum allowed length
   */
  maxLength?: number;

  /**
   * Input validation pattern
   */
  pattern?: string;

  /**
   * Autocomplete setting
   */
  autocomplete?: string;

  /**
   * Initial input value
   */
  value?: string;

  /**
   * Placeholder attribute
   */
  placeholder?: string;

  /**
   * Whether input is readonly
   */
  readonly?: boolean;
}

/**
 * What withTextInput adds to a component.
 *
 * Declared apart from TextInputComponent because the enhancer returns
 * `C & TextInputFeature`, and C -- the component being enhanced -- already
 * carries the element half. Naming the whole of TextInputComponent on the way
 * out is what narrowed `addClass` back to a bare ElementComponent. It has to be
 * its own interface rather than a Pick of TextInputComponent: an indexed access
 * binds `this` to the type being indexed, so the methods below would report
 * TextInputComponent and the polymorphism would be lost at the step that needs
 * it.
 */
export interface TextInputFeature {
  /**
   * Input element
   */
  input: HTMLInputElement | HTMLTextAreaElement;

  /**
   * Sets the input value
   * @param value - Value to set
   * @returns Component instance for chaining
   */
  setValue(value: string): this;

  /**
   * Gets the current input value
   * @returns Current value
   */
  getValue: () => string;

  /**
   * Sets an attribute on the input
   * @param name - Attribute name
   * @param value - Attribute value
   * @returns Component instance for chaining
   */
  setAttribute(name: string, value: string): this;

  /**
   * Gets an attribute from the input
   * @param name - Attribute name
   * @returns Attribute value
   */
  getAttribute(name: string): string | null;

  /**
   * Removes an attribute from the input
   * @param name - Attribute name
   * @returns Component instance for chaining
   */
  removeAttribute(name: string): this;

  /**
   * Event emission method if available
   */
  emit?(event: string, data: unknown): this;
}

/**
 * Component with text input element and related methods
 */
export interface TextInputComponent extends ElementComponent, TextInputFeature {}

/**
 * Enhances a component with text input functionality
 *
 * @param config - Text input configuration
 * @returns Function that enhances a component with text input capabilities
 */
export const withTextInput =
  // `& object` lets a component config that shares no key with TextInputConfig through.
  <T extends TextInputConfig & object>(config: T = {} as T) =>
  <C extends ElementComponent>(component: C): C & TextInputFeature => {
    const isMultiline = config.multiline || config.type === "multiline";
    const input = document.createElement(isMultiline ? "textarea" : "input") as
      | HTMLInputElement
      | HTMLTextAreaElement;

    input.className = `${component.getClass("textfield")}__input`;

    // Set input attributes
    const attributes: Record<string, string | number | boolean | undefined> = {
      name: config.name,
      required: config.required,
      disabled: config.disabled,
      // Documented on TextFieldConfig and never applied, so a readonly field stayed editable.
      readonly: config.readonly,
      maxLength: config.maxLength,
      pattern: config.pattern,
      autocomplete: config.autocomplete,
      value: config.value || "",
      placeholder: config.placeholder || " ", // Always set placeholder (space if empty) for CSS detection
    };

    // Only set type attribute for input elements, not for textarea
    if (!isMultiline) {
      attributes.type = config.type || "text";
    } else {
      // For textarea, add a data attribute to identify it as multiline
      attributes["data-type"] = "multiline";
    }

    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === "boolean") {
          if (value) {
            input.setAttribute(key, "");
          }
        } else {
          input.setAttribute(key, String(value));
        }
      }
    });

    // Handle input state changes
    const updateInputState = (): boolean => {
      const isEmpty = !input.value;
      component.element.classList.toggle(
        `${component.getClass("textfield")}--empty`,
        isEmpty
      );
      return isEmpty;
    };

    // Whether the browser has autofilled the input: its :autofill state (the
    // prefixed name in older WebKit). No computed style is read, which in a
    // shadow root forced a style recalculation per field (FLO-335).
    const isAutofilled = (): boolean => {
      try {
        return input.matches(":autofill");
      } catch {
        try {
          return input.matches(":-webkit-autofill");
        } catch {
          return false;
        }
      }
    };

    const checkForAutofill = (shouldEmit: boolean = true): void => {
      const autofilled = isAutofilled();
      if (input.value || autofilled) {
        component.element.classList.remove(
          `${component.getClass("textfield")}--empty`
        );
        // An input event only for an autofill, not for a value already there
        if (shouldEmit && autofilled && hasEmit(component)) {
          component.emit("input", {
            value: input.value,
            isEmpty: false,
            isAutofilled: true,
          });
        }
      }
    };

    // Set up MutationObserver to detect attribute changes (some browsers set attributes on autofill)
    let autofillObserver: MutationObserver | null = null;

    // Only set up MutationObserver if it's available (not in all test environments)
    if (typeof MutationObserver !== "undefined") {
      autofillObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            (mutation.attributeName === "value" ||
              mutation.attributeName === "data-autofilled")
          ) {
            checkForAutofill(true);
          }
        });
      });

      // Observe the input for attribute changes
      autofillObserver.observe(input, {
        attributes: true,
        attributeFilter: ["value", "data-autofilled", "autocomplete"],
      });
    }

    // Event listeners
    input.addEventListener("focus", () => {
      component.element.classList.add(
        `${component.getClass("textfield")}--focused`
      );
      if (hasEmit(component)) {
        component.emit("focus", { isEmpty: updateInputState() });
      }
      // Check for autofill on focus, but don't emit during focus
      checkForAutofill(false);
    });

    input.addEventListener("blur", () => {
      component.element.classList.remove(
        `${component.getClass("textfield")}--focused`
      );
      if (hasEmit(component)) {
        component.emit("blur", { isEmpty: updateInputState() });
      }
      // Final check on blur, but don't emit
      checkForAutofill(false);
    });

    input.addEventListener("input", () => {
      if (hasEmit(component)) {
        component.emit("input", {
          value: input.value,
          isEmpty: updateInputState(),
          isAutofilled: false,
        });
      } else {
        updateInputState();
      }
    });

    // Listen for change events (some browsers fire this on autofill)
    input.addEventListener("change", () => {
      const isEmpty = updateInputState();
      checkForAutofill(false);
      if (hasEmit(component)) {
        component.emit("change", {
          value: input.value,
          isEmpty,
          isAutofilled: isAutofilled(),
        });
      }
    });

    // Listen for animation events that indicate autofill (webkit browsers).
    // Narrowed to HTMLElement first: `input` is HTMLInputElement |
    // HTMLTextAreaElement, and addEventListener over a union falls back to
    // the EventTarget signature that types the event as a plain Event.
    // Annotating the parameter AnimationEvent was the previous answer and is
    // unsound -- a listener requiring one cannot be registered where any
    // Event may arrive. The event name picks the type instead. FLO-114.
    const animationTarget: HTMLElement = input;
    animationTarget.addEventListener("animationstart", (e) => {
      if (
        e.animationName === "onAutoFillStart" ||
        e.animationName?.includes("autofill")
      ) {
        checkForAutofill();
      }
    });

    // Initial state setup
    updateInputState();

    // An autofill before this runs is reported by the stylesheet's
    // onAutoFillStart animation, which starts when the autofilled input is
    // first styled; a value already there set --empty above (FLO-335).

    // Add multiline class to the component if it's a textarea
    if (isMultiline) {
      component.element.classList.add(
        `${component.getClass("textfield")}--multiline`
      );
    }

    // Into the component's field, where it has one (the text field's
    // container, FLO-300), else the root
    ((component as { field?: HTMLElement }).field ?? component.element).appendChild(input);

    // Cleanup
    if (hasLifecycle(component)) {
      const originalDestroy = component.lifecycle.destroy;
      component.lifecycle.destroy = () => {
        // Clean up observer
        if (autofillObserver) {
          autofillObserver.disconnect();
        }
        input.remove();
        originalDestroy.call(component.lifecycle);
      };
    }

    return {
      ...component,
      input,
      setValue(value: string) {
        input.value = value || "";
        updateInputState();
        return this;
      },
      getValue() {
        return input.value;
      },
      setAttribute(name: string, value: string) {
        input.setAttribute(name, value);
        return this;
      },
      getAttribute(name: string) {
        return input.getAttribute(name);
      },
      removeAttribute(name: string) {
        input.removeAttribute(name);
        return this;
      },
    };
  };
