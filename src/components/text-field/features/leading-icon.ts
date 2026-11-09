// src/components/text-field/features/leading-icon.ts

import { BaseComponent, ElementComponent } from '../../../core/compose/component';
import { installTextSlot } from './field';
/**
 * Extended element component with input field
 */
interface InputElementComponent extends ElementComponent {
  input?: HTMLInputElement | HTMLTextAreaElement;
  lifecycle?: {
    destroy: () => void;
  };
}

/**
 * Configuration for leading icon feature
 */
export interface LeadingIconConfig {
  /**
   * Leading icon HTML content
   */
  leadingIcon?: string;
  
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
 * Component with leading icon capabilities
 */
/**
 * What this feature installs.
 *
 * Declared apart from LeadingIconComponent because the enhancer returns
 * `C & LeadingIconFeature`: C already carries the base half, and naming the whole
 * interface made the return `C & Partial<LeadingIconComponent>`, which widened
 * `leadingIcon` to include undefined and put the setters' `this` at odds with
 * the property they assign.
 */
export interface LeadingIconFeature {
  /**
   * Leading icon element
   */
  leadingIcon: HTMLElement | null;
  
  /**
   * Sets leading icon content
   * @param html - HTML content for the icon
   * @returns Component instance for chaining
   */
  setLeadingIcon: (html: string) => LeadingIconComponent;
  
  /**
   * Removes leading icon
   * @returns Component instance for chaining
   */
  removeLeadingIcon: () => LeadingIconComponent;
}

/**
 * Component with leadingicon capabilities
 */
export interface LeadingIconComponent extends BaseComponent, LeadingIconFeature {}

/**
 * Adds leading icon to a text field component
 * @param config - Configuration with leading icon settings
 * @returns Function that enhances a component with leading icon
 */
// `& object` lets a component config that shares no key with LeadingIconConfig through.
export const withLeadingIcon = <T extends LeadingIconConfig & object>(config: T) =>
  <C extends InputElementComponent>(component: C): C & LeadingIconFeature => {
    // Decorative: the label names the field, and a leading icon takes no action.
    const slot = installTextSlot(component, config, config.leadingIcon, {
      part: "leading-icon",
      modifier: "leading-icon",
      inputModifier: "leading-icon",
      hidden: true,
      html: true,
    });
    return {
      ...component,
      leadingIcon: slot.element,
      setLeadingIcon(html: string) {
        this.leadingIcon = slot.set(html);
        return this;
      },
      removeLeadingIcon() {
        if (slot.remove()) this.leadingIcon = null;
        return this;
      },
    };
  };
