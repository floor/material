/** `<m-fab>`: the floating action button as a custom element. */
import type { FabComponent } from "../components/fab/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const fabSpec: {
    name: string;
    create: (config: import("./define.js").Config) => FabComponent;
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
        disabled: {
            type: "boolean";
            config: string;
            update: (c: FabComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
            update: (c: FabComponent, v: import("./define.js").AttributeValue) => undefined;
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
        value: {
            type: "string";
            config: string;
            update: (c: FabComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        type: {
            readonly type: "string";
            readonly update: () => undefined;
        };
    };
    methods: readonly [
        "lower",
        "raise"
    ];
    form: import("./define.js").FormSpec<FabComponent>;
    setup: <C extends import("./define.js").ElementComponent>(host: import("./define.js").ElementHost<C>, component: C) => (() => void);
};
export declare const fabElement: import("./define.js").ElementDefinition<FabComponent>;
export type FabSpec = typeof fabSpec;
/** `<m-fab>` as a ref or a query returns it. */
export type FabElement = ElementInstance<FabSpec, FabComponent>;
/** Registers `<m-fab>` (or `<prefix-fab>`). */
export declare const defineFab: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-fab": FabElement;
    }
}
export {};
