/** `<m-radios>` with `<m-radio>` children: the radio group as a form-associated custom element. */
import type { RadiosComponent } from "../components/radios/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
declare const radiosSpec: {
    name: string;
    create: (config: Config) => RadiosComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        value: {
            type: "string";
            config: string;
            update: (c: RadiosComponent, v: import("./define.js").AttributeValue) => void;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: RadiosComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        required: {
            type: "boolean";
            config: string;
            update: (c: RadiosComponent, v: import("./define.js").AttributeValue) => void;
        };
        direction: {
            type: "string";
            config: string;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: RadiosComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: RadiosComponent) => string | null;
            set: (c: RadiosComponent, v: unknown) => void;
            config: string;
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
        value: (c: RadiosComponent) => string | null;
        control: (component: RadiosComponent) => HTMLInputElement | null;
        events: string[];
        activate: (c: RadiosComponent) => void | undefined;
        state: (c: RadiosComponent) => string;
        restore: (c: RadiosComponent, state: string) => void;
        disable: (c: RadiosComponent, disabled: boolean) => undefined;
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<RadiosComponent>, c: RadiosComponent) => void;
    observeChildren: (host: ElementHost<RadiosComponent>, component: RadiosComponent) => boolean;
};
export declare const radiosElement: import("./define.js").ElementDefinition<RadiosComponent>;
export type RadiosSpec = typeof radiosSpec;
/** `<m-radios>` as a ref or a query returns it. */
export type RadiosElement = ElementInstance<RadiosSpec, RadiosComponent>;
/** `<m-radio>` declares one radio and renders nothing. */
export declare const radioDeclaration: {
    readonly name: "radio";
    readonly attributes: {
        readonly value: {
            readonly type: "string";
        };
        readonly label: {
            readonly type: "string";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
    };
};
export type RadioAttributes = ElementAttributes<typeof radioDeclaration>;
/** Registers `<m-radios>` and `<m-radio>` (or with another prefix). */
export declare const defineRadios: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-radios": RadiosElement;
        "m-radio": HTMLElement & RadioAttributes;
    }
}
export {};
