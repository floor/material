/** `<m-icon-button>`: the icon button as a custom element. */
import type { IconButtonComponent } from "../components/icon-button/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const iconButtonSpec: {
    name: string;
    create: (config: import("./define.js").Config) => IconButtonComponent;
    styles: string[];
    hostStyles: string;
    marker: string;
    attributes: {
        "aria-label": {
            type: "string";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
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
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        size: {
            type: "string";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        shape: {
            type: "string";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        width: {
            type: "string";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        /** Markup (HTML), shown while `toggle` and `selected`. */
        "selected-icon": {
            type: "string";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        toggle: {
            type: "boolean";
            config: string;
        };
        selected: {
            type: "boolean";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        value: {
            type: "string";
            config: string;
            update: (c: IconButtonComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        type: {
            readonly type: "string";
            readonly update: () => undefined;
        };
    };
    properties: {
        selected: {
            get: (c: IconButtonComponent) => boolean;
            set: (c: IconButtonComponent, v: unknown) => undefined;
            config: string;
        };
    };
    methods: readonly [
        "select",
        "deselect",
        "toggleSelected"
    ];
    model: "selected";
    events: {
        change: {
            detail: (payload: unknown) => {
                selected: boolean;
                value: string;
            };
        };
    };
    form: import("./define.js").FormSpec<IconButtonComponent>;
    setup: <C extends import("./define.js").ElementComponent>(host: import("./define.js").ElementHost<C>, component: C) => (() => void);
};
export declare const iconButtonElement: import("./define.js").ElementDefinition<IconButtonComponent>;
export type IconButtonSpec = typeof iconButtonSpec;
/** `<m-icon-button>` as a ref or a query returns it. */
export type IconButtonElement = ElementInstance<IconButtonSpec, IconButtonComponent>;
/** Registers `<m-icon-button>` (or `<prefix-icon-button>`). */
export declare const defineIconButton: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-icon-button": IconButtonElement;
    }
}
export {};
