import { ElementComponent } from "../component.js";
/** Input configuration options */
export interface InputConfig {
    /** Input name attribute */
    name?: string;
    /** Initial checked state */
    checked?: boolean;
    /** Whether input is required */
    required?: boolean;
    /** Whether input is disabled */
    disabled?: boolean;
    /** Input value attribute */
    value?: string;
    /** Accessibility label text */
    label?: string | Node;
    /** Alternative accessibility label */
    ariaLabel?: string;
    /** Component name for classes */
    componentName?: string;
    /**
 * Whether Enter toggles the input as Space does
 * @default true
 */
    enterToggles?: boolean;
}
/** What withInput adds to a component. */
export interface InputFeature {
    /** Input element */
    input: HTMLInputElement;
    /** Gets the checked state: the `value` a `change` carries */
    getValue: () => boolean;
    /**
 * Checks or unchecks the input.
 * @param value
 */
    setValue(value: boolean): this;
    /** Gets the input's `value` attribute: the string a form submits while checked */
    getValueAttribute: () => string;
    /**
 * Sets the input's `value` attribute.
 * @param value
 */
    setValueAttribute(value: string): this;
    /** Event emission method if available */
    emit?(event: string, data: unknown): this;
}
/** Component with input element and related methods */
export interface InputComponent extends ElementComponent, InputFeature {
}
/**
 * Creates an input element and adds it to a component Handles both input creation and event emission for state changes `change` carries `{ checked, value, valueAttribute, nativeEvent }`: `value` is the checked boolean, as the checkbox and the switch report it, and `valueAttribute` the input's string value.
 * @param config
 */
export declare const withInput: <T extends InputConfig & object>(config?: T) => <C extends ElementComponent>(component: C) => C & InputFeature;
