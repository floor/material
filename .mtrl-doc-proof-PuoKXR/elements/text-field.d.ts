/** `<m-text-field>`: the text field as a form-associated custom element. */
import type { TextFieldComponent } from "../components/text-field/types.js";
import { type AttributeValue, type DefineOptions, type ElementInstance } from "./define.js";
/** The text field, with the methods the element adds to it. */
export type TextFieldElementComponent = TextFieldComponent & {
    /** Selects the field's text. */
    select: () => void;
};
declare const textFieldSpec: {
    name: string;
    create: (config: import("./define.js").Config) => TextFieldElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        density: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        label: {
            type: "string";
            config: string;
        };
        type: {
            type: "string";
            config: string;
        };
        value: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
        placeholder: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        "supporting-text": {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        "prefix-text": {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        "suffix-text": {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        /** Markup (HTML). */
        "leading-icon": {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        /** Markup (HTML). */
        "trailing-icon": {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue, host: HTMLElement) => undefined;
        };
        /** The trailing icon button's accessible name. */
        "trailing-icon-label": {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue, host: HTMLElement) => void;
        };
        maxlength: {
            type: "number";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
        pattern: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
        required: {
            type: "boolean";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        readonly: {
            type: "boolean";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        error: {
            type: "boolean";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => undefined;
        };
        autocomplete: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
        inputmode: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
        enterkeyhint: {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: TextFieldElementComponent, v: AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: TextFieldElementComponent) => string;
            set: (c: TextFieldElementComponent, v: unknown) => undefined;
        };
    };
    methods: readonly [
        "select",
        "setError"
    ];
    model: "value";
    events: {
        input: {
            detail: (payload: unknown) => {
                value: string;
            };
        };
        change: {
            detail: (payload: unknown) => {
                value: string;
            };
        };
        trailing: {
            detail: (payload: unknown) => {
                value: string;
                event: MouseEvent;
            };
            state: true;
        };
    };
    form: {
        value: (c: TextFieldElementComponent) => string;
        control: (c: TextFieldElementComponent) => HTMLInputElement | HTMLTextAreaElement;
        events: string[];
        activate: (c: TextFieldElementComponent) => void;
        state: (c: TextFieldElementComponent) => string;
        restore: (c: TextFieldElementComponent, state: string) => undefined;
        disable: (c: TextFieldElementComponent, disabled: boolean) => undefined;
    };
    setup: (_host: import("./define.js").ElementHost<TextFieldElementComponent>, c: TextFieldElementComponent) => () => void;
};
export declare const textFieldElement: import("./define.js").ElementDefinition<TextFieldElementComponent>;
export type TextFieldSpec = typeof textFieldSpec;
/** `<m-text-field>` as a ref or a query returns it. */
export type TextFieldElement = ElementInstance<TextFieldSpec, TextFieldElementComponent>;
/** Registers `<m-text-field>` (or `<prefix-text-field>`). */
export declare const defineTextField: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-text-field": TextFieldElement;
    }
}
export {};
