/** `<m-bottom-sheet>`: the bottom sheet as a custom element. */
import type { BottomSheetComponent, BottomSheetEventHandlers } from "../components/bottom-sheet/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
/** The sheet's events, and `expand` and `collapse`, which the element tells apart from its state changes. */
export interface BottomSheetElementEvents extends BottomSheetEventHandlers {
    expand?: () => void;
    collapse?: () => void;
}
/** The sheet with the `show()` the element names after `<dialog>`'s, and its `expand` and `collapse` events. */
export interface BottomSheetElementComponent extends Omit<BottomSheetComponent, "on" | "off"> {
    show: () => BottomSheetComponent;
    on: <T extends keyof BottomSheetElementEvents>(event: T, handler: NonNullable<BottomSheetElementEvents[T]>) => unknown;
    off: <T extends keyof BottomSheetElementEvents>(event: T, handler: NonNullable<BottomSheetElementEvents[T]>) => unknown;
}
declare const bottomSheetSpec: {
    name: string;
    slots: readonly [
        "headline"
    ];
    create: (config: import("./define.js").Config) => BottomSheetElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        open: {
            type: "boolean";
            update: (c: BottomSheetElementComponent, v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
        expanded: {
            type: "boolean";
            update: (c: BottomSheetElementComponent, v: import("./define.js").AttributeValue) => void;
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
            update: (c: BottomSheetElementComponent, v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
        "peek-height": {
            type: "number";
            config: string;
        };
        "max-width": {
            type: "number";
            config: string;
        };
        "no-drag-handle": {
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
            update: (c: BottomSheetElementComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
    };
    methods: readonly [
        "show",
        "close",
        "expand",
        "collapse"
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
        expand: {
            detail: () => null;
            state: true;
        };
        collapse: {
            detail: () => null;
            state: true;
        };
    };
    config: (host: HTMLElement) => {
        host: HTMLElement;
    };
    setup: (host: import("./define.js").ElementHost<BottomSheetElementComponent>, component: BottomSheetElementComponent) => () => void;
};
export declare const bottomSheetElement: import("./define.js").ElementDefinition<BottomSheetElementComponent>;
export type BottomSheetSpec = typeof bottomSheetSpec;
/** `<m-bottom-sheet>` as a ref or a query returns it. */
export type BottomSheetElement = ElementInstance<BottomSheetSpec, BottomSheetElementComponent>;
/** Registers `<m-bottom-sheet>` (or `<prefix-bottom-sheet>`). */
export declare const defineBottomSheet: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-bottom-sheet": BottomSheetElement;
    }
}
export {};
