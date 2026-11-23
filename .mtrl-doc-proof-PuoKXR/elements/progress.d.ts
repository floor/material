/** `<m-progress>`: the linear or circular progress indicator as a custom element. */
import type { ProgressComponent } from "../components/progress/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const progressSpec: {
    name: string;
    create: (config: import("./define.js").Config) => ProgressComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
        };
        value: {
            type: "number";
            config: string;
            update: (c: ProgressComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        max: {
            type: "number";
            config: string;
        };
        buffer: {
            type: "number";
            config: string;
            update: (c: ProgressComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        indeterminate: {
            type: "boolean";
            config: string;
            update: (c: ProgressComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: ProgressComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        shape: {
            type: "string";
            config: string;
            update: (c: ProgressComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        thickness: {
            type: "string";
            config: string;
            update: (c: ProgressComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        size: {
            type: "number";
            config: string;
        };
        "show-label": {
            type: "boolean";
            config: string;
            update: (c: ProgressComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
        };
    };
    properties: {
        value: {
            get: (c: ProgressComponent) => number;
            set: (c: ProgressComponent, v: unknown) => undefined;
            config: string;
        };
        indeterminate: {
            get: (c: ProgressComponent) => boolean;
            set: (c: ProgressComponent, v: unknown) => undefined;
            config: string;
        };
    };
};
export declare const progressElement: import("./define.js").ElementDefinition<ProgressComponent>;
export type ProgressSpec = typeof progressSpec;
/** `<m-progress>` as a ref or a query returns it. */
export type ProgressElement = ElementInstance<ProgressSpec, ProgressComponent>;
/** Registers `<m-progress>` (or `<prefix-progress>`). */
export declare const defineProgress: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-progress": ProgressElement;
    }
}
export {};
