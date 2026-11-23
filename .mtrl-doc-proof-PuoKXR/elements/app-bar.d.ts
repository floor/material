/** `<m-app-bar>`: the app bar as a container with slots. */
import type { TopAppBarComponent } from "../components/top-app-bar/top-app-bar.js";
import { type Config, type DefineOptions, type ElementInstance } from "./define.js";
/** The app bar's one spec, under the tag name Material gives it. */
export declare const createBarSpec: (name: string) => {
    name: string;
    slots: readonly [
        "leading",
        "trailing"
    ];
    create: (config: Config) => TopAppBarComponent;
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
    config: (host: HTMLElement) => Config;
    setup: (host: import("./define.js").ElementHost<TopAppBarComponent>, component: TopAppBarComponent) => () => void;
};
export declare const appBarSpec: {
    name: string;
    slots: readonly [
        "leading",
        "trailing"
    ];
    create: (config: Config) => TopAppBarComponent;
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
    config: (host: HTMLElement) => Config;
    setup: (host: import("./define.js").ElementHost<TopAppBarComponent>, component: TopAppBarComponent) => () => void;
};
export declare const appBarElement: import("./define.js").ElementDefinition<TopAppBarComponent>;
export type AppBarSpec = typeof appBarSpec;
/** `<m-app-bar>` as a ref or a query returns it. */
export type AppBarElement = ElementInstance<AppBarSpec, TopAppBarComponent>;
/** Registers `<m-app-bar>` (or `<prefix-app-bar>`). */
export declare const defineAppBar: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-app-bar": AppBarElement;
    }
}
