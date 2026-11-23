/** `<m-extended-fab>`: the extended floating action button as a custom element. */
import type { ExtendedFabComponent } from "../components/extended-fab/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const extendedFabSpec: {
    name: string;
    create: (config: import("./define.js").Config) => ExtendedFabComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        "aria-label": {
            type: "string";
            config: string;
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
        };
        size: {
            type: "string";
            config: string;
        };
        width: {
            type: "string";
            config: string;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: ExtendedFabComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
            update: (c: ExtendedFabComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "icon-position": {
            type: "string";
            config: string;
        };
        /** @deprecated Physical alias, does not mirror in RTL; removal in 4.0. */
        position: {
            type: "string";
            config: string;
        };
        placement: {
            type: "string";
            config: string;
        };
        "collapse-on-scroll": {
            type: "boolean";
            config: string;
        };
        value: {
            type: "string";
            config: string;
            update: (c: ExtendedFabComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        type: {
            readonly type: "string";
            readonly update: () => undefined;
        };
    };
    methods: readonly [
        "lower",
        "raise",
        "collapse",
        "expand"
    ];
    events: {
        collapse: {
            detail: () => null;
        };
        expand: {
            detail: () => null;
        };
    };
    slot: {
        attribute: "label";
        config: string;
    };
    form: import("./define.js").FormSpec<ExtendedFabComponent>;
    setup: <C extends import("./define.js").ElementComponent>(host: import("./define.js").ElementHost<C>, component: C) => (() => void);
};
export declare const extendedFabElement: import("./define.js").ElementDefinition<ExtendedFabComponent>;
export type ExtendedFabSpec = typeof extendedFabSpec;
/** `<m-extended-fab>` as a ref or a query returns it. */
export type ExtendedFabElement = ElementInstance<ExtendedFabSpec, ExtendedFabComponent>;
/** Registers `<m-extended-fab>` (or `<prefix-extended-fab>`). */
export declare const defineExtendedFab: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-extended-fab": ExtendedFabElement;
    }
}
export {};
