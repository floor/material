// src/components/text-field/features/suffix-text.ts

import { BaseComponent, ElementComponent } from '../../../core/compose/component';
import { installTextSlot } from './field';

/**
 * Extended element component with lifecycle
 */
interface LifecycleElementComponent extends ElementComponent {
  lifecycle?: {
    destroy: () => void;
  };
}

/**
 * Configuration for suffix text feature
 */
export interface SuffixTextConfig {
  /**
   * Suffix text content to display after the input
   */
  suffixText?: string;
  
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
 * Component with suffix text capabilities
 */
/**
 * What this feature installs.
 *
 * Declared apart from SuffixTextComponent because the enhancer returns
 * `C & SuffixTextFeature`: C already carries the base half, and naming the whole
 * interface made the return `C & Partial<SuffixTextComponent>`, which widened
 * `suffixTextElement` to include undefined and put the setters' `this` at odds with
 * the property they assign.
 */
export interface SuffixTextFeature {
  /**
   * Suffix text element
   */
  suffixTextElement: HTMLElement | null;
  
  /**
   * Sets suffix text content
   * @param text - Text content to display after the input
   * @returns Component instance for chaining
   */
  setSuffixText: (text: string) => SuffixTextComponent;
  
  /**
   * Removes suffix text
   * @returns Component instance for chaining
   */
  removeSuffixText: () => SuffixTextComponent;
}

/**
 * Component with suffixtext capabilities
 */
export interface SuffixTextComponent extends BaseComponent, SuffixTextFeature {}

/**
 * Adds suffix text to a text field component
 * @param config - Configuration with suffix text settings
 * @returns Function that enhances a component with suffix text
 */
// `& object` lets a component config that shares no key with SuffixTextConfig through.
export const withSuffixText = <T extends SuffixTextConfig & object>(config: T) =>
  <C extends LifecycleElementComponent>(component: C): C & SuffixTextFeature => {
    const slot = installTextSlot(component, config, config.suffixText, { part: "suffix", modifier: "suffix" });
    return {
      ...component,
      suffixTextElement: slot.element,
      setSuffixText(text: string) {
        this.suffixTextElement = slot.set(text);
        return this;
      },
      removeSuffixText() {
        if (slot.remove()) this.suffixTextElement = null;
        return this;
      },
    };
  };
