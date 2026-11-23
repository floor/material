/** `<m-button>`: the button as a custom element. */
import type { ButtonComponent } from "../components/button/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const buttonSpec: {
    name: string;
    create: (config: import("./define.js").Config) => ButtonComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        "aria-label": {
            type: "string";
            config: string;
            update: (c: ButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "aria-expanded": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-haspopup": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-pressed": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-controls": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-describedby": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        variant: {
            type: "string";
            config: string;
            update: (c: ButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        size: {
            type: "string";
            config: string;
            update: (c: ButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        shape: {
            type: "string";
            config: string;
            update: (c: ButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: ButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        loading: {
            type: "boolean";
            config: string;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
        };
        "icon-position": {
            type: "string";
            config: string;
        };
        toggle: {
            type: "boolean";
            config: string;
        };
        selected: {
            type: "boolean";
            config: string;
            update: (c: ButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        value: {
            type: "string";
            config: string;
            update: (c: ButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        type: {
            readonly type: "string";
            readonly update: () => undefined;
        };
    };
    properties: {
        selected: {
            get: (c: ButtonComponent) => boolean;
            set: (c: ButtonComponent, v: unknown) => undefined;
            config: string;
        };
    };
    methods: readonly [
        "setSelected"
    ];
    model: "selected";
    slot: {
        attribute: "label";
        config: string;
    };
    events: {
        change: {
            detail: (payload: unknown) => {
                selected: boolean;
                value: string;
            };
        };
    };
    form: import("./define.js").FormSpec<ButtonComponent>;
    setup: <C extends import("./define.js").ElementComponent>(host: import("./define.js").ElementHost<C>, component: C) => (() => void);
};
export declare const buttonElement: import("./define.js").ElementDefinition<ButtonComponent>;
export type ButtonSpec = typeof buttonSpec;
/** `<m-button>` as a ref or a query returns it. */
export type ButtonElement = ElementInstance<ButtonSpec, ButtonComponent>;
/** Registers `<m-button>` (or `<prefix-button>`). */
export declare const defineButton: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-button": ButtonElement;
    }
}
export {};
