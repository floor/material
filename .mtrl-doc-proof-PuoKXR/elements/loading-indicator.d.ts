/** `<m-loading-indicator>`: the expressive loading indicator as a custom element. */
import type { LoadingIndicatorComponent } from "../components/loading-indicator/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const loadingIndicatorSpec: {
    name: string;
    create: (config: import("./define.js").Config) => LoadingIndicatorComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        size: {
            type: "number";
            config: string;
            update: (c: LoadingIndicatorComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        contained: {
            type: "boolean";
            config: string;
        };
        value: {
            type: "number";
            config: string;
            update: (c: LoadingIndicatorComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: LoadingIndicatorComponent, v: import("./define.js").AttributeValue) => undefined;
        };
    };
    methods: readonly [
        "start",
        "stop"
    ];
};
export declare const loadingIndicatorElement: import("./define.js").ElementDefinition<LoadingIndicatorComponent>;
export type LoadingIndicatorSpec = typeof loadingIndicatorSpec;
/** `<m-loading-indicator>` as a ref or a query returns it. */
export type LoadingIndicatorElement = ElementInstance<LoadingIndicatorSpec, LoadingIndicatorComponent>;
/** Registers `<m-loading-indicator>` (or `<prefix-loading-indicator>`). */
export declare const defineLoadingIndicator: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-loading-indicator": LoadingIndicatorElement;
    }
}
export {};
