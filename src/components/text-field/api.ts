// src/components/text-field/api.ts
import type {
  BaseComponent,
  TextFieldComponent,
  ApiOptions,
  TextFieldVariant,
  TextFieldEvents,
} from "./types";
import { warnDev } from "../../core/utils/warn";

/**
 * Component interface with density feature
 */
type ComponentWithDensity = BaseComponent & {
  density?: {
    current: string;
    set: (density: string) => void;
  };
  updateElementPositions?: () => void;
  schedulePositionUpdate?: () => void;
  setError?: (error: boolean, message?: string) => void;
  isError?: () => boolean;
  field?: HTMLElement;
  input?: HTMLInputElement | HTMLTextAreaElement;
  trailingIcon?: HTMLElement | null;
  setTrailingIcon?: (html: string, label?: string) => void;
  setRequired?: (required: boolean) => void;
  isRequired?: () => boolean;
};

/**
 * Enhances text field component with API methods
 * @param {ApiOptions} options - API configuration
 * @returns {Function} Higher-order function that adds API methods to component
 */
export const withAPI =
  ({ disabled, lifecycle }: ApiOptions) =>
  (component: ComponentWithDensity): TextFieldComponent => {
    // The element bridge supplies a stable identity across rebuilds, before any
    // application subscription; factory-only fields use their own root element.
    let warningHost: HTMLElement | undefined;
    const variantClass = (variant: TextFieldVariant): string => `${component.config?.prefix || "mtrl"}-${component.config?.componentName || "text-field"}--${variant}`;
    const schedulePlacement = (): void => {
      if (component.updateElementPositions) component.schedulePositionUpdate?.();
    };
    // A trailing icon button is disabled with the field
    const setTrailingDisabled = (off: boolean): void => {
      // By tag, not instanceof: no global HTMLButtonElement is assumed (a server DOM)
      const icon = component.trailingIcon;
      if (icon?.tagName === "BUTTON") (icon as HTMLButtonElement).disabled = off;
    };
    return {
      element: component.element,
      // The container under the root: what a menu or popover anchors to, so the
      // supporting text row never pushes it down
      field: component.field ?? component.element,
      input: component.input as HTMLInputElement | HTMLTextAreaElement,

      // Value management
      getValue: component.getValue || (() => ""),
      setValue(value: string): TextFieldComponent {
        component.setValue?.(value);
        return this;
      },

      // Attributes API
      setAttribute(name: string, value: string): TextFieldComponent {
        component.setAttribute?.(name, value);
        return this;
      },

      getAttribute(name: string): string | null {
        return component.getAttribute?.(name) || null;
      },

      removeAttribute(name: string): TextFieldComponent {
        component.removeAttribute?.(name);
        return this;
      },

      // Variant management
      setVariant(variant: TextFieldVariant): TextFieldComponent {

        // Remove existing variant classes
        component.element.classList.remove(
          variantClass("filled"),
          variantClass("outlined")
        );

        // Add the new variant class
        component.element.classList.add(variantClass(variant));

        // Update positioning after variant change
        schedulePlacement();

        return this;
      },

      getVariant(): TextFieldVariant {

        if (
          component.element.classList.contains(variantClass("outlined"))
        ) {
          return "outlined";
        }

        return "filled"; // Default to filled if no class found
      },

      // Label management
      setLabel(text: string): TextFieldComponent {
        component.label?.setText(text);
        // Update positions after changing label
        schedulePlacement();
        return this;
      },

      getLabel(): string {
        return component.label?.getText() || "";
      },

      // Leading icon management (if present)
      // A live read, not a snapshot. This used to be captured once when the
      // API object was built, so it still named the element the field was
      // created with — or null — however many times the slot had been set or
      // removed since. This object is the final return and is not spread
      // again, so an accessor survives here where it would not in the
      // feature pipe.
      get leadingIcon() {
        return component.leadingIcon ?? null;
      },
      setLeadingIcon(html: string): TextFieldComponent {
        if (component.setLeadingIcon) {
          component.setLeadingIcon(html);
          // Update positions after changing icon
          schedulePlacement();
        }
        return this;
      },

      removeLeadingIcon(): TextFieldComponent {
        if (component.removeLeadingIcon) {
          component.removeLeadingIcon();
          // Update positions after removing icon
          schedulePlacement();
        }
        return this;
      },

      // Trailing icon management (if present)
      // A live read, not a snapshot. This used to be captured once when the
      // API object was built, so it still named the element the field was
      // created with — or null — however many times the slot had been set or
      // removed since. This object is the final return and is not spread
      // again, so an accessor survives here where it would not in the
      // feature pipe.
      get trailingIcon() {
        return component.trailingIcon ?? null;
      },
      setTrailingIcon(html: string, label?: string): TextFieldComponent {
        if (component.setTrailingIcon) {
          component.setTrailingIcon(html, label);
          // Update positions after changing icon
          schedulePlacement();
        }
        return this;
      },

      removeTrailingIcon(): TextFieldComponent {
        if (component.removeTrailingIcon) {
          component.removeTrailingIcon();
          // Update positions after removing icon
          schedulePlacement();
        }
        return this;
      },

      // Supporting text management (if present)
      // A live read, as for the icons: the features before this one spread the
      // component, so its supportingTextElement is a copy from when it was
      // spread; the element in the field is the one to report.
      get supportingTextElement(): HTMLElement | null {
        return component.element.querySelector<HTMLElement>(`.${component.getClass("text-field__helper")}`);
      },
      setSupportingText(text: string, isError?: boolean): TextFieldComponent {
        component.setSupportingText?.(text, isError);
        return this;
      },

      removeSupportingText(): TextFieldComponent {
        component.removeSupportingText?.();
        return this;
      },

      // Prefix text management (if present)
      // A live read, not a snapshot. This used to be captured once when the
      // API object was built, so it still named the element the field was
      // created with — or null — however many times the slot had been set or
      // removed since. This object is the final return and is not spread
      // again, so an accessor survives here where it would not in the
      // feature pipe.
      get prefixTextElement() {
        return component.prefixTextElement ?? null;
      },
      setPrefixText(text: string): TextFieldComponent {
        if (component.setPrefixText) {
          component.setPrefixText(text);
          // Update positions after changing prefix
          schedulePlacement();
        }
        return this;
      },

      removePrefixText(): TextFieldComponent {
        if (component.removePrefixText) {
          component.removePrefixText();
          // Update positions after removing prefix
          schedulePlacement();
        }
        return this;
      },

      // Suffix text management (if present)
      // A live read, not a snapshot. This used to be captured once when the
      // API object was built, so it still named the element the field was
      // created with — or null — however many times the slot had been set or
      // removed since. This object is the final return and is not spread
      // again, so an accessor survives here where it would not in the
      // feature pipe.
      get suffixTextElement() {
        return component.suffixTextElement ?? null;
      },
      setSuffixText(text: string): TextFieldComponent {
        if (component.setSuffixText) {
          component.setSuffixText(text);
          // Update positions after changing suffix
          schedulePlacement();
        }
        return this;
      },

      removeSuffixText(): TextFieldComponent {
        if (component.removeSuffixText) {
          component.removeSuffixText();
          // Update positions after removing suffix
          schedulePlacement();
        }
        return this;
      },

      // Update positioning manually (useful after DOM updates)
      updatePositions(): TextFieldComponent {
        // Check for autofill before updating positions
        if (component.input) {
          const hasValue =
            component.input.value;
          let isAutofilled = false;
          try {
            isAutofilled = component.input.matches?.(":-webkit-autofill") || false;
          } catch {
            // A selector engine without this vendor pseudo-class cannot report autofill.
          }

          // Update empty state based on value or autofill
          component.element.classList.toggle(
            `${component.config?.prefix || "mtrl"}-text-field--empty`,
            !(hasValue || isAutofilled)
          );
        }

        component.updateElementPositions?.();
        return this;
      },

      // Error state management
      setError(error: boolean, message?: string): TextFieldComponent {
        component.setError?.(error, message);
        return this;
      },

      isError(): boolean {
        return component.isError?.() || false;
      },

      // Density management
      setDensity(density: string): TextFieldComponent {
        component.density?.set?.(density);
        // The density feature runs before placement exists, so its own call to
        // re-place never reached it; ask here, as the other setters do
        component.schedulePositionUpdate?.();
        return this;
      },

      getDensity(): string {
        return component.density?.current || "default";
      },

      // Event handling
      on<K extends keyof TextFieldEvents>(event: K, handler: TextFieldEvents[K]): TextFieldComponent {
        component.on?.(event, handler);
        // warnDev retains its defensive environment guard. The pure probe keeps raw
        // ESM safe; the separate literal check lets bundlers erase the entire branch,
        // including its try/catch, in production.
        if (/*#__PURE__*/ (() => { try { return process.env.NODE_ENV !== "production"; } catch { return false; } })() && process.env.NODE_ENV !== "production" && event === "trailing") {
          const host = (handler as typeof handler & { __bridge?: HTMLElement }).__bridge;
          if (host) warningHost = host;
          else if (component.trailingIcon?.tagName === "SPAN") checkTrailingLabel(warningHost ?? component.element);
        }
        return this;
      },

      off<K extends keyof TextFieldEvents>(event: K, handler: TextFieldEvents[K]): TextFieldComponent {
        component.off?.(event, handler);
        return this;
      },

      // State management
      enable(): TextFieldComponent {
        disabled.enable();
        setTrailingDisabled(false);
        return this;
      },

      isDisabled(): boolean {

        return disabled.isDisabled();

      },


      disable(): TextFieldComponent {
        disabled.disable();
        setTrailingDisabled(true);
        return this;
      },

      // Required, with the label's asterisk
      setRequired(required: boolean): TextFieldComponent {
        component.setRequired?.(required);
        // The asterisk widens the label, and the outlined notch with it
        component.schedulePositionUpdate?.();
        return this;
      },

      isRequired(): boolean {
        return component.isRequired?.() ?? Boolean(component.input?.required);
      },

      destroy(): void {
        lifecycle.destroy();
      },
    };
  };

const warned = /*#__PURE__*/ new WeakSet<HTMLElement>();
/** Development diagnostic, shared by the factory and its element host. */
export const checkTrailingLabel = (element: HTMLElement): void => {
  if (warned.has(element)) return;
  warned.add(element);
  warnDev('text field', 'Missing trailingIconLabel / trailing-icon-label.');
};
