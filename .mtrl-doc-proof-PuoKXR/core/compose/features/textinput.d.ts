import { ElementComponent } from "../component.js";
/** Configuration for text input feature */
export interface TextInputConfig {
    /** Input type (text, password, etc.) */
    type?: string;
    /** Whether to use textarea instead of input */
    multiline?: boolean;
    /** Input name attribute */
    name?: string;
    /** Whether input is required */
    required?: boolean;
    /** Whether input is disabled */
    disabled?: boolean;
    /** Maximum allowed length */
    maxLength?: number;
    /** Input validation pattern */
    pattern?: string;
    /** Autocomplete setting */
    autocomplete?: string;
    /** Virtual keyboard to show for the input (`inputmode`) */
    inputMode?: string;
    /** The virtual keyboard's Enter key label (`enterkeyhint`) */
    enterKeyHint?: string;
    /** Initial input value */
    value?: string;
    /** Placeholder attribute */
    placeholder?: string;
    /** Accessible name for the native input or textarea. */
    ariaLabel?: string;
    /** Whether input is readonly */
    readonly?: boolean;
}
/** What withTextInput adds to a component. */
export interface TextInputFeature {
    /** Input element */
    input: HTMLInputElement | HTMLTextAreaElement;
    /**
 * Sets the input value
 * @param value
 */
    setValue(value: string): this;
    /** Gets the current input value */
    getValue: () => string;
    /**
 * Sets an attribute on the input
 * @param name
 * @param value
 */
    setAttribute(name: string, value: string): this;
    /**
 * Gets an attribute from the input
 * @param name
 */
    getAttribute(name: string): string | null;
    /**
 * Removes an attribute from the input
 * @param name
 */
    removeAttribute(name: string): this;
    /** Event emission method if available */
    emit?(event: string, data: unknown): this;
}
/** Component with text input element and related methods */
export interface TextInputComponent extends ElementComponent, TextInputFeature {
}
/**
 * Enhances a component with text input functionality
 * @param config
 */
export declare const withTextInput: <T extends TextInputConfig & object>(config?: T) => <C extends ElementComponent>(component: C) => C & TextInputFeature;
