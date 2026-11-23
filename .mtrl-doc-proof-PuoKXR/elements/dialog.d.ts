/** `<m-dialog>`: the dialog as a custom element. */
import type { DialogComponent } from "../components/dialog/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
/** The dialog with the `show()` the element names after `<dialog>`'s. */
export interface DialogElementComponent extends DialogComponent {
    show: () => DialogComponent;
}
declare const dialogSpec: {
    name: string;
    slots: readonly [
        "headline",
        "actions"
    ];
    create: (config: import("./define.js").Config) => DialogElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        open: {
            type: "boolean";
            update: (c: DialogElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        headline: {
            type: "string";
            config: string;
            update: (c: DialogElementComponent, v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
        subtitle: {
            type: "string";
            config: string;
            update: (c: DialogElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        size: {
            type: "string";
            config: string;
        };
        animation: {
            type: "string";
            config: string;
        };
        fullscreen: {
            type: "boolean";
            config: string;
        };
        "close-button": {
            type: "boolean";
            config: string;
        };
        divider: {
            type: "boolean";
            config: string;
        };
        "footer-alignment": {
            type: "string";
            config: string;
            update: (c: DialogElementComponent, v: import("./define.js").AttributeValue) => void;
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
            update: (c: DialogElementComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => void;
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
        cancel: {
            detail: () => null;
        };
    };
    setup: (host: import("./define.js").ElementHost<DialogElementComponent>, component: DialogElementComponent) => () => void;
};
export declare const dialogElement: import("./define.js").ElementDefinition<DialogElementComponent>;
export type DialogSpec = typeof dialogSpec;
/** `<m-dialog>` as a ref or a query returns it. */
export type DialogElement = ElementInstance<DialogSpec, DialogElementComponent>;
/** Registers `<m-dialog>` (or `<prefix-dialog>`). */
export declare const defineDialog: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-dialog": DialogElement;
    }
}
export {};
