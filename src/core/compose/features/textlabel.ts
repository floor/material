// src/core/compose/features/textlabel.ts

import { BaseComponent, ElementComponent } from "../component";

/**
 * Configuration for text label feature
 */
export interface TextLabelConfig {
  /**
   * Label text
   */
  /**
   * The label: text, or a node placed inside the label element (the
   * web components pass a `<slot>` so the page's content is the label).
   */
  label?: string | Node;

  /**
   * Label position ('start' or 'end')
   */
  labelPosition?: "start" | "end";

  /**
   * CSS class prefix
   */
  prefix?: string;

  /**
   * Component name for class generation
   */
  componentName?: string;
}

/**
 * Label manager interface
 */
export interface LabelManager {
  /**
   * Sets the label text
   * @param text - Text to set
   * @returns LabelManager instance for chaining
   */
  setText: (text: string) => LabelManager;

  /**
   * Gets the current label text
   * @returns Current text
   */
  getText: () => string;

  /**
   * Gets the label element
   * @returns Label element
   */
  getElement: () => HTMLElement;
}

/**
 * Component with label capabilities
 */
export interface LabelComponent extends BaseComponent {
  label: LabelManager;
}

/**
 * Adds a text label to a component
 *
 * @param config - Configuration object containing label information
 * @returns Function that enhances a component with a label
 */
export const withTextLabel =
  // `& object` lets a component config that shares no key with TextLabelConfig through.
  <T extends TextLabelConfig & object>(config: T = {} as T) =>
  <C extends ElementComponent>(component: C): C & LabelComponent => {
    if (!config.label) return component as C & LabelComponent;

    const labelElement = document.createElement("label");
    const position = config.labelPosition || "start";
    // BEM, for the same reason as withIcon: this label belongs to whichever
    // component applied the feature -- checkbox, slider, switch or
    // textfield. FLO-120.
    labelElement.className = `${config.prefix}-${config.componentName}__label ${config.prefix}-${config.componentName}__label--${position}`;
    if (typeof config.label === "string") labelElement.textContent = config.label;
    else labelElement.append(config.label);
    // the label names the input: without the link a screen reader has no
    // name for the field and a click on the label focuses nothing
    const input = (component as { input?: HTMLElement }).input;
    if (input instanceof HTMLElement) {
      if (!input.id) input.id = `${config.prefix}-${config.componentName}-${Math.random().toString(36).slice(2, 9)}`;
      labelElement.htmlFor = input.id;
      // An aria-label copied from the same text would outrank the label and
      // go stale when the label changes; a different one was chosen, so it stays
      if (input.getAttribute("aria-label") === config.label) {
        input.removeAttribute("aria-label");
      }
    }

    // Into the component's field, where it has one (the text field's
    // container, FLO-300), else the root
    const host = (component as { field?: HTMLElement }).field ?? component.element;
    if (position === "start") {
      // Insert label as the first child
      if (host.firstChild) host.insertBefore(labelElement, host.firstChild);
      else host.appendChild(labelElement);
    } else {
      // Insert label at the end (default behavior)
      host.appendChild(labelElement);
    }

    if (position && component.componentName !== "slider") {
      component.element.classList.add(
        `${config.prefix}-${config.componentName}--label-${position}`
      );
    }

    const label: LabelManager = {
      setText(text: string) {
        labelElement.textContent = text;
        return this;
      },
      getText() {
        return labelElement.textContent || "";
      },
      getElement() {
        return labelElement;
      },
    };

    return {
      ...component,
      label,
    };
  };
