/** `<m-divider>`: the divider as a custom element. */
import type { DividerComponent } from "../components/divider/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const dividerSpec: {
    name: string;
    create: (config: import("./define.js").Config) => DividerComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        orientation: {
            type: "string";
            config: string;
            update: (c: DividerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        variant: {
            type: "string";
            config: string;
            update: (c: DividerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "inset-start": {
            type: "number";
            config: string;
        };
        "inset-end": {
            type: "number";
            config: string;
        };
        thickness: {
            type: "number";
            config: string;
            update: (c: DividerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        color: {
            type: "string";
            config: string;
            update: (c: DividerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
    };
};
export declare const dividerElement: import("./define.js").ElementDefinition<DividerComponent>;
export type DividerSpec = typeof dividerSpec;
/** `<m-divider>` as a ref or a query returns it. */
export type DividerElement = ElementInstance<DividerSpec, DividerComponent>;
/** Registers `<m-divider>` (or `<prefix-divider>`). */
export declare const defineDivider: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-divider": DividerElement;
    }
}
export {};
