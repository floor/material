// src/components/textfield/features/supporting-text.ts

import {
  BaseComponent,
  ElementComponent,
} from "../../../core/compose/component";

/**
 * Extended element component with lifecycle
 */
interface LifecycleElementComponent extends ElementComponent {
  input?: HTMLInputElement | HTMLTextAreaElement;
  lifecycle?: {
    destroy: () => void;
  };
}

import { addIdRef, removeIdRef, supportingRow } from "./field";

/**
 * Configuration for supporting text feature
 */
export interface SupportingTextConfig {
  /**
   * Supporting text content
   */
  supportingText?: string;

  /**
   * Whether supporting text indicates an error
   */
  error?: boolean;

  /**
   * CSS class prefix
   */
  prefix?: string;

  /**
   * Component name
   */
  componentName?: string;
}

/**
 * Component with supporting text capabilities
 */
export interface SupportingTextComponent extends BaseComponent {
  /**
   * Supporting text element
   */
  supportingTextElement: HTMLElement | null;

  /**
   * Sets supporting text content
   * @param text - Text content
   * @param isError - Whether text represents an error
   * @returns Component instance for chaining
   */
  setSupportingText: (
    text: string,
    isError?: boolean
  ) => SupportingTextComponent;

  /**
   * Removes supporting text
   * @returns Component instance for chaining
   */
  removeSupportingText: () => SupportingTextComponent;
}

/**
 * Adds supporting text to a textfield component
 * @param config - Configuration with supporting text settings
 * @returns Function that enhances a component with supporting text
 */
export const withSupportingText =
  // `& object` lets a component config that shares no key with SupportingTextConfig through.
  <T extends SupportingTextConfig & object>(config: T) =>
  <C extends LifecycleElementComponent>(
    component: C
  ): C & SupportingTextComponent => {
    const PREFIX = config.prefix || "mtrl";
    const COMPONENT = config.componentName || "textfield";
    let supportingElement: HTMLElement | null = null;
    // The helper sits in the supporting text row under the field, before the
    // counter when there is one (FLO-300)
    const row = supportingRow(component.element, PREFIX, COMPONENT);
    const show = (element: HTMLElement): void => void row.ensure().prepend(element);
    // One id for the supporting text, whichever element currently shows it,
    // so the input's description follows the text as it is replaced
    const supportingId = `${PREFIX}-${COMPONENT}-supporting-${Math.random().toString(36).slice(2, 9)}`;
    const describe = (element: HTMLElement | null): void => {
      if (!component.input) return;
      if (element) addIdRef(component.input, "aria-describedby", supportingId);
      else removeIdRef(component.input, "aria-describedby", supportingId);
    };

    // Helper function to create supporting text element
    const createSupportingElement = (
      text: string,
      isError = false
    ): HTMLElement => {
      const element = document.createElement("div");
      element.className = `${PREFIX}-${COMPONENT}__helper`;
      element.id = supportingId;
      element.textContent = text;

      // The helper's own colour only: the field's error state (the root
      // --error class, aria-invalid) belongs to withError, so replacing the
      // text can't end an error the field is still in (FLO-303).
      if (isError) element.classList.add(`${PREFIX}-${COMPONENT}__helper--error`);

      return element;
    };

    // Create initial supporting text element if provided
    if (config.supportingText) {
      supportingElement = createSupportingElement(
        config.supportingText,
        config.error
      );
      show(supportingElement);
      describe(supportingElement);
    }

    // Add lifecycle integration if available
    if ("lifecycle" in component && component.lifecycle?.destroy) {
      const originalDestroy = component.lifecycle.destroy as Function;
      component.lifecycle.destroy = () => {
        if (supportingElement) {
          supportingElement.remove();
          row.release();
        }
        originalDestroy.call(component.lifecycle);
      };
    }

    return {
      ...component,
      // A live read of the element on screen. It was a value, updated through
      // `this`, so a feature holding an earlier copy of the component (the
      // error feature) read the element the field was created with (FLO-303).
      get supportingTextElement(): HTMLElement | null {
        return supportingElement;
      },

      setSupportingText(text: string, isError = false) {
        supportingElement?.remove();
        supportingElement = text ? createSupportingElement(text, isError) : null;
        if (supportingElement) show(supportingElement);
        else row.release();
        describe(supportingElement);
        return this;
      },

      removeSupportingText() {
        if (supportingElement) {
          supportingElement.remove();
          supportingElement = null;
          row.release();
          describe(null);
        }
        return this;
      },
    };
  };
