/** `<m-checkbox>`: the checkbox as a form-associated custom element. */
import type { CheckboxComponent } from "../components/checkbox/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const checkboxSpec: {
    name: string;
    create: (config: import("./define.js").Config) => CheckboxComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        checked: {
            type: "boolean";
            config: string;
            update: (c: CheckboxComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: CheckboxComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        required: {
            type: "boolean";
            config: string;
        };
        value: {
            type: "string";
            config: string;
            update: (c: CheckboxComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        error: {
            type: "boolean";
            config: string;
            update: (c: CheckboxComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "label-position": {
            type: "string";
            config: string;
        };
        "aria-label": {
            type: "string";
            config: string;
        };
    };
    properties: {
        checked: {
            get: (c: CheckboxComponent) => boolean;
            set: (c: CheckboxComponent, v: unknown) => undefined;
            config: string;
        };
        indeterminate: {
            get: (c: CheckboxComponent) => boolean;
            set: (c: CheckboxComponent, v: unknown) => undefined;
            config: string;
        };
    };
    methods: readonly [
        "toggle",
        "check",
        "uncheck"
    ];
    model: "checked";
    events: {
        change: {
            detail: (payload: unknown) => {
                checked: boolean;
                value: boolean;
                valueAttribute: string;
                nativeEvent: Event | undefined;
            };
        };
    };
    slot: {
        attribute: "label";
        config: string;
    };
    form: {
        value: (c: CheckboxComponent) => string | null;
        control: (c: CheckboxComponent) => HTMLInputElement;
        events: string[];
        activate: (c: CheckboxComponent) => void;
        state: (c: CheckboxComponent) => "checked" | "unchecked";
        restore: (c: CheckboxComponent, state: string) => undefined;
        disable: (c: CheckboxComponent, disabled: boolean) => undefined;
    };
};
export declare const checkboxElement: import("./define.js").ElementDefinition<CheckboxComponent>;
export type CheckboxSpec = typeof checkboxSpec;
/** `<m-checkbox>` as a ref or a query returns it. */
export type CheckboxElement = ElementInstance<CheckboxSpec, CheckboxComponent>;
/** Registers `<m-checkbox>` (or `<prefix-checkbox>`). */
export declare const defineCheckbox: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-checkbox": CheckboxElement;
    }
}
export {};
