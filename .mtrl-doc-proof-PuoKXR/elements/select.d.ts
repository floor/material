/** `<m-select>` with `<m-select-option>` children: the select as a form-associated custom element. */
import type { SelectComponent } from "../components/select/types.js";
import { type AttributeValue, type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
declare const selectSpec: {
    name: string;
    create: (config: Config) => SelectComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => undefined;
        };
        density: {
            type: "string";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => undefined;
        };
        label: {
            type: "string";
            config: string;
        };
        value: {
            type: "string";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => void;
        };
        placement: {
            type: "string";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => undefined;
        };
        "supporting-text": {
            type: "string";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => void;
        };
        required: {
            type: "boolean";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => void;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => undefined;
        };
        error: {
            type: "boolean";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: SelectComponent, v: AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: SelectComponent) => string | null;
            set: (c: SelectComponent, value: unknown) => void;
        };
    };
    model: "value";
    events: {
        change: {
            detail: (payload: unknown) => {
                value: string | null;
            };
        };
    };
    form: {
        value: (c: SelectComponent) => string | null;
        events: string[];
        activate: (c: SelectComponent) => void;
        state: (c: SelectComponent) => string;
        restore: (c: SelectComponent, state: string) => void;
        disable: (c: SelectComponent, disabled: boolean) => undefined;
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<SelectComponent>, c: SelectComponent) => () => undefined;
    observeChildren: (host: HTMLElement, c: SelectComponent) => boolean;
};
export declare const selectElement: import("./define.js").ElementDefinition<SelectComponent>;
export type SelectSpec = typeof selectSpec;
/** `<m-select>` as a ref or a query returns it. */
export type SelectElement = ElementInstance<SelectSpec, SelectComponent>;
/** `<m-select-option>` declares one option and renders nothing. */
export declare const selectOptionDeclaration: {
    readonly name: "select-option";
    readonly attributes: {
        readonly value: {
            readonly type: "string";
        };
        readonly label: {
            readonly type: "string";
        };
        /** Markup (HTML). */
        readonly icon: {
            readonly type: "string";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
    };
};
export type SelectOptionAttributes = ElementAttributes<typeof selectOptionDeclaration>;
/** Registers `<m-select>` and `<m-select-option>` (or with another prefix). */
export declare const defineSelect: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-select": SelectElement;
        "m-select-option": HTMLElement & SelectOptionAttributes;
    }
}
export {};
