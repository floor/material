/** `<m-split-button>` with `<m-menu-item>` children. */
import type { SplitButtonComponent, SplitButtonEvent, SplitButtonEventType } from "../components/split-button/types.js";
import { type Config, type DefineOptions, type ElementInstance } from "./define.js";
/** The factory's events, and the element's own names for two of them. */
export type SplitButtonElementEventType = SplitButtonEventType | "open" | "close";
/** The split button, with the element's events. */
export interface SplitButtonElementComponent extends Omit<SplitButtonComponent, "on" | "off"> {
    /** Subscribes by the element's event names (`open`, `close`) as well as the factory's. */
    on: (event: SplitButtonElementEventType, handler: (event: SplitButtonEvent) => void) => SplitButtonElementComponent;
    off: (event: SplitButtonElementEventType, handler: (event: SplitButtonEvent) => void) => SplitButtonElementComponent;
}
declare const splitButtonSpec: {
    name: string;
    ssr: (host: HTMLElement) => boolean;
    create: (config: Config) => SplitButtonElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        "aria-label": {
            type: "string";
            config: string;
            update: (c: SplitButtonElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        "aria-expanded": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-haspopup": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-pressed": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-controls": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        "aria-describedby": import("./define.js").AttributeSpec<import("./form-button.js").ButtonControl> & {
            type: "string";
        };
        label: {
            type: "string";
            update: (c: SplitButtonElementComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => undefined;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
            update: (c: SplitButtonElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        variant: {
            type: "string";
            config: string;
        };
        size: {
            type: "string";
            config: string;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: SplitButtonElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "trailing-label": {
            type: "string";
            config: string;
        };
        "group-label": {
            type: "string";
            config: string;
        };
    };
    events: {
        open: {
            detail: () => {};
            state: true;
        };
        close: {
            detail: () => {};
            state: true;
        };
        select: {
            detail: (payload: unknown) => {
                value: string | null;
            };
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: import("./define.js").ElementHost<SplitButtonElementComponent>, c: SplitButtonElementComponent) => () => void;
    observeChildren: (host: HTMLElement, c: SplitButtonElementComponent) => boolean;
};
export declare const splitButtonElement: import("./define.js").ElementDefinition<SplitButtonElementComponent>;
export type SplitButtonSpec = typeof splitButtonSpec;
/** `<m-split-button>` as a ref or a query returns it. */
export type SplitButtonElement = ElementInstance<SplitButtonSpec, SplitButtonElementComponent>;
/** Registers `<m-split-button>` and `<m-menu-item>` (or with another prefix). */
export declare const defineSplitButton: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-split-button": SplitButtonElement;
    }
}
export {};
