/** `<m-toolbar>`: M3 Expressive's docked and floating toolbars as a container with slots. */
import type { ToolbarComponent } from "../components/toolbar/types.js";
import { type Config, type DefineOptions, type ElementInstance } from "./define.js";
declare const toolbarSpec: {
    name: string;
    slots: readonly [
        "fab",
        "overflow"
    ];
    create: (config: Config) => ToolbarComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
        };
        color: {
            type: "string";
            config: string;
            update: (c: ToolbarComponent, v: import("./define.js").AttributeValue) => ToolbarComponent;
        };
        orientation: {
            type: "string";
            config: string;
        };
        placement: {
            type: "string";
            config: string;
        };
        arrangement: {
            type: "string";
            config: string;
        };
        flat: {
            type: "boolean";
            update: (c: ToolbarComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "fab-position": {
            type: "string";
            config: string;
        };
        "scroll-behavior": {
            type: "string";
            config: string;
        };
        "scroll-threshold": {
            type: "number";
            config: string;
        };
        "overflow-label": {
            type: "string";
            config: string;
        };
        "aria-label": {
            type: "string";
            update: (c: ToolbarComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    methods: readonly [
        "show",
        "hide"
    ];
    events: {
        show: {
            detail: () => null;
            state: true;
        };
        hide: {
            detail: () => null;
            state: true;
        };
        collapse: {
            detail: () => null;
            state: true;
        };
        expand: {
            detail: () => null;
            state: true;
        };
    };
    config: (host: HTMLElement) => Config;
    observeChildren: (host: import("./define.js").ElementHost<ToolbarComponent>, component: ToolbarComponent) => boolean;
    setup: (host: import("./define.js").ElementHost<ToolbarComponent>, component: ToolbarComponent) => () => void;
};
export declare const toolbarElement: import("./define.js").ElementDefinition<ToolbarComponent>;
export type ToolbarSpec = typeof toolbarSpec;
/** `<m-toolbar>` as a ref or a query returns it. */
export type ToolbarElement = ElementInstance<ToolbarSpec, ToolbarComponent>;
/** Registers `<m-toolbar>` (or `<prefix-toolbar>`). */
export declare const defineToolbar: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-toolbar": ToolbarElement;
    }
}
export {};
