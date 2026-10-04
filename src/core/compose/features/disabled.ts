// src/core/compose/features/disabled.ts

import { BaseComponent, ElementComponent } from '../component';

// Interface for components with input that can be disabled
interface ComponentWithInput extends ElementComponent {
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;
}

/** An element with a native `disabled`: a button, an input, a select, a textarea, a fieldset. */
const isFormControl = (element: HTMLElement): element is HTMLElement & { disabled: boolean } =>
  'disabled' in element;

// Type guard to check if component has a disableable input
function hasDisableableInput(component: object): component is ComponentWithInput {
  return 'input' in component && 
         component.input instanceof HTMLElement &&
         ('disabled' in component.input);
}

/**
 * Configuration for disabled feature
 */
export interface DisabledConfig {
  disabled?: boolean;
  componentName?: string;
}

/**
 * Disabled state manager interface
 */
export interface DisabledManager {
  /**
   * Enables the component
   * @returns DisabledManager instance for chaining
   */
  enable(): DisabledManager;
  
  /**
   * Disables the component
   * @returns DisabledManager instance for chaining
   */
  disable(): DisabledManager;
  
  /**
   * Toggles the disabled state
   * @returns DisabledManager instance for chaining
   */
  toggle(): DisabledManager;
  
  /**
   * Checks if the component is disabled
   * @returns true if disabled
   */
  isDisabled(): boolean;
}

/**
 * Component with disabled state capabilities
 */
export interface DisabledComponent extends BaseComponent {
  disabled: DisabledManager;
}

/**
 * Adds disabled state management to a component
 * 
 * @param config - Configuration object
 * @returns Function that enhances a component with disabled state management
 */
// `& object` lets a component config that shares no key with DisabledConfig through.
export const withDisabled = <T extends DisabledConfig & object>(config: T) => 
  <C extends ElementComponent>(component: C): C & DisabledComponent => {
    // Get the disabled class based on component name
    const disabledClass = `${component.getClass(config.componentName || component.componentName || 'component')}--disabled`;

    // Directly implement disabled functionality
    const disabled: DisabledManager = {
      enable() {
        component.element.classList.remove(disabledClass);
        
        if (hasDisableableInput(component)) {
          component.input.disabled = false;
          component.input.removeAttribute('disabled');
        } else if (isFormControl(component.element)) {
          component.element.disabled = false;
          component.element.removeAttribute('disabled');
        } else {
          component.element.removeAttribute('aria-disabled');
        }
        
        return this;
      },

      disable() {
        component.element.classList.add(disabledClass);
        
        if (hasDisableableInput(component)) {
          component.input.disabled = true;
          component.input.setAttribute('disabled', 'true');
        } else if (isFormControl(component.element)) {
          component.element.disabled = true;
          component.element.setAttribute('disabled', 'true');
        } else {
          // A root that is not a form control has no `disabled`: the bare
          // attribute is not valid there and tells assistive technology
          // nothing. aria-disabled does.
          component.element.setAttribute('aria-disabled', 'true');
        }
        
        return this;
      },

      toggle() {
        if (this.isDisabled()) {
          this.enable();
        } else {
          this.disable();
        }
        return this;
      },

      isDisabled() {
        if (hasDisableableInput(component)) {
          return component.input.disabled;
        }
        
        if (isFormControl(component.element)) {
          return component.element.disabled;
        }

        // A root that is not a form control carries no `disabled` property, so
        // the aria-disabled `disable()` writes is the record of the state:
        // `toggle()` branches on it.
        return component.element.getAttribute('aria-disabled') === 'true';
      }
    };

    // Initialize disabled state if configured
    if (config.disabled) {
      disabled.disable();
    }

    return {
      ...component,
      disabled
    };
  };