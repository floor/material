/** `<m-snackbar>`: a snackbar, in the top layer. */
import type { SnackbarComponent } from "../components/snackbar/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const snackbarSpec: {
    name: string;
    create: (config: import("./define.js").Config) => SnackbarComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        message: {
            type: "string";
            config: string;
            update: (c: SnackbarComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => undefined;
        };
        action: {
            type: "string";
            config: string;
        };
        dismissible: {
            type: "boolean";
            config: string;
        };
        "close-label": {
            type: "string";
            config: string;
        };
        duration: {
            type: "string";
            config: string;
            update: (c: SnackbarComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        position: {
            type: "string";
            config: string;
            update: (c: SnackbarComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "queue-behavior": {
            type: "string";
            config: string;
        };
        "focus-shortcut": {
            type: "string";
            config: string;
        };
    };
    properties: {
        open: {
            get: (c: SnackbarComponent) => boolean;
            set: (c: SnackbarComponent, v: unknown) => undefined;
        };
    };
    methods: readonly [
        "show",
        "hide"
    ];
    events: {
        open: {
            detail: () => null;
            state: true;
        };
        action: {
            detail: () => null;
        };
        close: {
            detail: (event: unknown) => {
                reason: import("../components/snackbar/index.js").SnackbarCloseReason | undefined;
            };
            state: true;
        };
        focus: {
            detail: () => null;
        };
    };
    config: (host: HTMLElement) => {
        message?: undefined;
    } | {
        message: string;
    };
    setup: (host: import("./define.js").ElementHost<SnackbarComponent>, component: SnackbarComponent) => void;
    observeChildren: (host: import("./define.js").ElementHost<SnackbarComponent>, component: SnackbarComponent) => true;
};
export declare const snackbarElement: import("./define.js").ElementDefinition<SnackbarComponent>;
export type SnackbarSpec = typeof snackbarSpec;
/** `<m-snackbar>` as a ref or a query returns it. */
export type SnackbarElement = ElementInstance<SnackbarSpec, SnackbarComponent>;
/** Registers `<m-snackbar>` (or `<prefix-snackbar>`). */
export declare const defineSnackbar: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-snackbar": SnackbarElement;
    }
}
export {};
