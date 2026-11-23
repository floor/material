/** `<m-side-sheet>`: the side sheet as a custom element. */
import type { SideSheetComponent } from "../components/side-sheet/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
/** The sheet with the `show()` the element names after `<dialog>`'s. */
export interface SideSheetElementComponent extends SideSheetComponent {
    show: () => SideSheetComponent;
}
declare const sideSheetSpec: {
    name: string;
    slots: readonly [
        "headline"
    ];
    create: (config: import("./define.js").Config) => SideSheetElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        open: {
            type: "boolean";
            update: (c: SideSheetElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        modal: {
            type: "boolean";
            config: string;
        };
        variant: {
            type: "string";
        };
        headline: {
            type: "string";
            config: string;
            update: (c: SideSheetElementComponent, v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
        position: {
            type: "string";
            config: string;
        };
        width: {
            type: "number";
            config: string;
        };
        "no-close-button": {
            type: "boolean";
            config: string;
        };
        "no-close-on-scrim-click": {
            type: "boolean";
            config: string;
        };
        "no-close-on-escape": {
            type: "boolean";
            config: string;
        };
        "aria-label": {
            type: "string";
            update: (c: SideSheetElementComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
    };
    methods: readonly [
        "show",
        "close"
    ];
    events: {
        open: {
            detail: () => null;
            state: true;
        };
        close: {
            detail: () => null;
            state: true;
        };
    };
    config: (host: HTMLElement) => {
        host: HTMLElement;
    };
    setup: (host: import("./define.js").ElementHost<SideSheetElementComponent>, component: SideSheetElementComponent) => () => void;
};
export declare const sideSheetElement: import("./define.js").ElementDefinition<SideSheetElementComponent>;
export type SideSheetSpec = typeof sideSheetSpec;
/** `<m-side-sheet>` as a ref or a query returns it. */
export type SideSheetElement = ElementInstance<SideSheetSpec, SideSheetElementComponent>;
/** Registers `<m-side-sheet>` (or `<prefix-side-sheet>`). */
export declare const defineSideSheet: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-side-sheet": SideSheetElement;
    }
}
export {};
