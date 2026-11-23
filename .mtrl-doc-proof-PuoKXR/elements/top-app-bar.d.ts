/**
 * `<m-top-app-bar>`: the app bar under its old name, kept for 3.x.
 * @deprecated use `<m-app-bar>`. Material Design 3 names the component the
 * app bar.
 * Parts: `top-app-bar`, `leading`, `headline`, `trailing`.
 */
import type { TopAppBarComponent } from "../components/top-app-bar/top-app-bar.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const topAppBarSpec: {
    name: string;
    slots: readonly [
        "leading",
        "trailing"
    ];
    create: (config: import("./define.js").Config) => TopAppBarComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        type: {
            type: "string";
            config: string;
            update: (c: TopAppBarComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        headline: {
            type: "string";
            config: string;
            update: (c: TopAppBarComponent, v: import("./define.js").AttributeValue) => void;
        };
        "no-scroll": {
            type: "boolean";
        };
        "no-compress": {
            type: "boolean";
        };
        "scroll-threshold": {
            type: "number";
            config: string;
        };
        "scroll-target": {
            type: "string";
        };
        "aria-label": {
            type: "string";
            update: (c: TopAppBarComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    methods: readonly [
        "setScrollState"
    ];
    config: (host: HTMLElement) => import("./define.js").Config;
    setup: (host: import("./define.js").ElementHost<TopAppBarComponent>, component: TopAppBarComponent) => () => void;
};
/** @deprecated use `appBarElement`. */
export declare const topAppBarElement: import("./define.js").ElementDefinition<TopAppBarComponent>;
/** @deprecated use `AppBarSpec`. */
export type TopAppBarSpec = typeof topAppBarSpec;
/** @deprecated use `AppBarElement`. */
export type TopAppBarElement = ElementInstance<TopAppBarSpec, TopAppBarComponent>;
/**
 * @deprecated use `defineAppBar`. Registers `<m-top-app-bar>` (or
 * `<prefix-top-app-bar>`).
 */
export declare const defineTopAppBar: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        /** @deprecated use `m-app-bar`. */
        "m-top-app-bar": TopAppBarElement;
    }
}
export {};
