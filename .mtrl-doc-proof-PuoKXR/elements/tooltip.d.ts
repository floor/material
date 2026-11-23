/** `<m-tooltip>`: a tooltip for another element, in the top layer. */
import type { TooltipComponent } from "../components/tooltip/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const tooltipSpec: {
    name: string;
    create: (config: import("./define.js").Config) => TooltipComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        for: {
            type: "string";
            update: (c: TooltipComponent) => void;
        };
        text: {
            type: "string";
            config: string;
            update: (c: TooltipComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
        position: {
            type: "string";
            config: string;
            update: (c: TooltipComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        variant: {
            type: "string";
            config: string;
        };
        "show-delay": {
            type: "number";
            config: string;
        };
        "hide-delay": {
            type: "number";
            config: string;
        };
        "no-show-on-hover": {
            type: "boolean";
            config: string;
        };
        "no-show-on-focus": {
            type: "boolean";
            config: string;
        };
    };
    properties: {
        target: {
            get: (c: TooltipComponent) => HTMLElement | null;
            set: (c: TooltipComponent, v: unknown) => void;
        };
    };
    methods: readonly [
        "show",
        "hide"
    ];
    config: (host: HTMLElement) => {
        text?: undefined;
    } | {
        text: string;
    };
    setup: (host: import("./define.js").ElementHost<TooltipComponent>, component: TooltipComponent) => () => void;
    observeChildren: (host: import("./define.js").ElementHost<TooltipComponent>, component: TooltipComponent) => true;
};
export declare const tooltipElement: import("./define.js").ElementDefinition<TooltipComponent>;
export type TooltipSpec = typeof tooltipSpec;
/** `<m-tooltip>` as a ref or a query returns it. */
export type TooltipElement = ElementInstance<TooltipSpec, TooltipComponent>;
/** Registers `<m-tooltip>` (or `<prefix-tooltip>`). */
export declare const defineTooltip: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-tooltip": TooltipElement;
    }
}
export {};
