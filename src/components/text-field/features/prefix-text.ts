// src/components/text-field/features/prefix-text.ts

import { BaseComponent, ElementComponent } from '../../../core/compose/component';
import { createTextSlot } from './text-slot';

/**
 * Extended element component with lifecycle
 */
interface LifecycleElementComponent extends ElementComponent {
  lifecycle?: {
    destroy: () => void;
  };
}

/**
 * Configuration for prefix text feature
 */
export interface PrefixTextConfig {
  /**
   * Prefix text content to display before the input
   */
  prefixText?: string;
  
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
 * Component with prefix text capabilities
 */
/**
 * What this feature installs.
 *
 * Declared apart from PrefixTextComponent because the enhancer returns
 * `C & PrefixTextFeature`: C already carries the base half, and naming the whole
 * interface made the return `C & Partial<PrefixTextComponent>`, which widened
 * `prefixTextElement` to include undefined and put the setters' `this` at odds with
 * the property they assign.
 */
export interface PrefixTextFeature {
  /**
   * Prefix text element
   */
  prefixTextElement: HTMLElement | null;
  
  /**
   * Sets prefix text content
   * @param text - Text content to display before the input
   * @returns Component instance for chaining
   */
  setPrefixText: (text: string) => PrefixTextComponent;
  
  /**
   * Removes prefix text
   * @returns Component instance for chaining
   */
  removePrefixText: () => PrefixTextComponent;
}

/**
 * Component with prefixtext capabilities
 */
export interface PrefixTextComponent extends BaseComponent, PrefixTextFeature {}

/**
 * Adds prefix text to a text field component
 * @param config - Configuration with prefix text settings
 * @returns Function that enhances a component with prefix text
 */
// `& object` lets a component config that shares no key with PrefixTextConfig through.
export const withPrefixText = <T extends PrefixTextConfig & object>(config: T) =>
  <C extends LifecycleElementComponent>(component: C): C & PrefixTextFeature => {
    return createTextSlot(config, component, 'prefix');
  };
