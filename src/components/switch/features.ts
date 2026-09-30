// src/components/switch/features.ts
import { BaseComponent, ElementComponent } from "../../core/compose/component";
import {
  withTrack as withTrackCore,
  TrackComponent,
} from "../../core/compose/features";
import { SwitchConfig } from "./types";

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

  [key: string]: unknown;
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

  /** Puts the switch in or out of the error state (FLO-318) */
  setError: (error: boolean) => SupportingTextComponent;

  /** Whether the switch is in the error state */
  isError: () => boolean;
}

/**
 * Helper to ensure the switch has the proper container/content structure
 * @param component - The component to enhance
 * @param prefix - CSS class prefix
 * @param componentName - Component name
 * @returns The container and content elements
 */
const ensureSwitchStructure = (
  component: ElementComponent,
  prefix: string,
  componentName: string
): { container: HTMLElement; contentWrapper: HTMLElement } => {
  const PREFIX = prefix || "mtrl";
  const COMPONENT = componentName || "switch";

  // Create or find container
  const existingContainer = component.element.querySelector<HTMLElement>(
    `.${PREFIX}-${COMPONENT}__container`
  );
  if (!existingContainer) {
    const container = document.createElement("div");
    container.className = `${PREFIX}-${COMPONENT}__container`;

    // Find input and track to move them to container
    const input = component.element.querySelector(
      `.${PREFIX}-${COMPONENT}__input`
    );
    const track = component.element.querySelector(
      `.${PREFIX}-${COMPONENT}__track`
    );

    // Gather all elements except container
    const elementsToMove: Element[] = [];
    if (input) elementsToMove.push(input);
    if (track) elementsToMove.push(track);

    // Create content wrapper
    const contentWrapper = document.createElement("div");
    contentWrapper.className = `${PREFIX}-${COMPONENT}__content`;

    // Find label and move to content
    const label = component.element.querySelector(
      `.${PREFIX}-${COMPONENT}__label`
    );
    if (label) {
      contentWrapper.appendChild(label);
    }

    // Add content wrapper to container first
    container.appendChild(contentWrapper);

    // Add other elements to container
    elementsToMove.forEach((el) => container.appendChild(el));

    // Add container to component
    component.element.appendChild(container);

    return { container, contentWrapper };
  }

  // Container exists, find or create content wrapper
  let contentWrapper = component.element.querySelector<HTMLElement>(
    `.${PREFIX}-${COMPONENT}__content`
  );
  if (!contentWrapper) {
    contentWrapper = document.createElement("div");
    contentWrapper.className = `${PREFIX}-${COMPONENT}__content`;

    // Find label to move to content
    const label = component.element.querySelector(
      `.${PREFIX}-${COMPONENT}__label`
    );
    if (label) {
      contentWrapper.appendChild(label);
    }

    // Insert content wrapper at beginning of container
    existingContainer.insertBefore(contentWrapper, existingContainer.firstChild);
  }

  return { container: existingContainer, contentWrapper };
};

/**
 * Creates and manages supporting text for a component
 * @param config - Configuration object with supporting text settings
 * @returns Function that enhances a component with supporting text functionality
 */
export const withSupportingText =
  <T extends SupportingTextConfig>(config: T) =>
  <C extends ElementComponent>(component: C): C & SupportingTextComponent => {
    const PREFIX = config.prefix || "mtrl";
    const COMPONENT = config.componentName || "switch";

    // Ensure we have the proper container/content structure
    const { contentWrapper } = ensureSwitchStructure(
      component,
      PREFIX,
      COMPONENT
    );

    const input = (component as { input?: HTMLElement }).input;
    // The error state shows on the track and reaches assistive tech through
    // aria-invalid, with or without supporting text; `error` alone was ignored.
    // The supporting text describes the input. FLO-267.
    // The error state has one owner, setError (FLO-318, as the text field's
    // since FLO-303): replacing or removing the supporting text used to end it.
    let errorState = !!config.error;
    const setError = (isError: boolean): void => {
      errorState = isError;
      component.element.classList.toggle(`${PREFIX}-${COMPONENT}--error`, isError);
      // A helper on screen takes the error colour with the switch
      component.element.querySelector(`.${PREFIX}-${COMPONENT}__helper`)
        ?.classList.toggle(`${PREFIX}-${COMPONENT}__helper--error`, isError);
      if (isError) input?.setAttribute("aria-invalid", "true");
      else input?.removeAttribute("aria-invalid");
    };
    const describe = (element: HTMLElement | null): void => {
      if (!input) return;
      if (!element) {
        input.removeAttribute("aria-describedby");
        return;
      }
      if (!element.id) element.id = `${PREFIX}-${COMPONENT}-helper-${Math.random().toString(36).slice(2, 9)}`;
      input.setAttribute("aria-describedby", element.id);
    };

    // Create supporting text element if needed
    let supportingElement: HTMLElement | null = null;
    if (config.supportingText) {
      supportingElement = document.createElement("div");
      supportingElement.className = `${PREFIX}-${COMPONENT}__helper`;
      supportingElement.textContent = config.supportingText;

      if (config.error) {
        supportingElement.classList.add(`${PREFIX}-${COMPONENT}__helper--error`);
      }

      // Add supporting text to the content wrapper
      contentWrapper.appendChild(supportingElement);
      describe(supportingElement);
    }
    setError(!!config.error);

    // Add lifecycle integration if available
    if (
      "lifecycle" in component &&
      component.lifecycle &&
      typeof component.lifecycle === "object" &&
      "destroy" in component.lifecycle &&
      supportingElement
    ) {
      const originalDestroy = component.lifecycle.destroy as Function;
      component.lifecycle.destroy = () => {
        if (supportingElement) supportingElement.remove();
        originalDestroy.call(component.lifecycle);
      };
    }

    return {
      ...component,
      supportingTextElement: supportingElement,

      setSupportingText(text: string, isError = false) {
        const { contentWrapper } = ensureSwitchStructure(
          component,
          PREFIX,
          COMPONENT
        );
        let supportingElement = this.supportingTextElement;

        if (!supportingElement) {
          // Create if it doesn't exist
          supportingElement = document.createElement("div");
          supportingElement.className = `${PREFIX}-${COMPONENT}__helper`;
          contentWrapper.appendChild(supportingElement);
          this.supportingTextElement = supportingElement;
          describe(supportingElement);
        }

        supportingElement.textContent = text;

        // The text's own colour; the switch's error state is setError's
        supportingElement.classList.toggle(
          `${PREFIX}-${COMPONENT}__helper--error`,
          isError
        );

        return this;
      },

      removeSupportingText() {
        if (
          this.supportingTextElement &&
          this.supportingTextElement.parentNode
        ) {
          this.supportingTextElement.remove();
          this.supportingTextElement = null;
          describe(null);
        }
        return this;
      },

      setError(error: boolean) {
        setError(error);
        return this;
      },

      isError: () => errorState,
    };
  };

/**
 * Wrapper for the core withTrack function that works with SwitchConfig
 *
 * @param config - Switch configuration
 * @returns Function that enhances a component with track and thumb elements
 */
export const withTrack =
  (config: SwitchConfig) =>
  <C extends ElementComponent>(component: C): C & TrackComponent => {
    // Ensure prefix and componentName are set
    const trackConfig = {
      ...config,
      prefix: config.prefix || "mtrl",
      componentName: config.componentName || "switch",
    };

    return withTrackCore(trackConfig)(component);
  };
