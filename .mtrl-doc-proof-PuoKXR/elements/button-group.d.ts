/** `<m-button-group>` with `<m-button-group-item>` children. */
import type { ButtonGroupComponent } from "../components/button-group/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
/** The live selection: one value, several, or none. */
export type ButtonGroupValue = string | string[] | null;
declare const buttonGroupSpec: {
    name: string;
    create: (config: Config) => ButtonGroupComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
            update: (c: ButtonGroupComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        kind: {
            type: "string";
            config: string;
        };
        selection: {
            type: "string";
            config: string;
        };
        required: {
            type: "boolean";
            config: string;
        };
        size: {
            type: "string";
            config: string;
        };
        shape: {
            type: "string";
            config: string;
        };
        labels: {
            type: "string";
            config: string;
        };
        orientation: {
            type: "string";
            config: string;
            update: (c: ButtonGroupComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        density: {
            type: "string";
            config: string;
            update: (c: ButtonGroupComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "equal-width": {
            type: "boolean";
            config: string;
        };
        "expanded-ratio": {
            type: "number";
            config: string;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: ButtonGroupComponent, v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: ButtonGroupComponent, v: import("./define.js").AttributeValue) => void;
        };
        value: {
            type: "string";
            update: (c: ButtonGroupComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: ButtonGroupComponent) => ButtonGroupValue;
            set: (c: ButtonGroupComponent, v: unknown) => void;
        };
    };
    model: "value";
    events: {
        change: {
            detail: (payload: unknown) => {
                value: ButtonGroupValue;
            };
        };
        action: {
            detail: (payload: unknown) => {
                value: string;
                index: number;
            };
            state: true;
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<ButtonGroupComponent>, component: ButtonGroupComponent) => () => undefined;
    observeChildren: (host: ElementHost<ButtonGroupComponent>, component: ButtonGroupComponent) => boolean;
};
export declare const buttonGroupElement: import("./define.js").ElementDefinition<ButtonGroupComponent>;
export type ButtonGroupSpec = typeof buttonGroupSpec;
/** `<m-button-group>` as a ref or a query returns it. */
export type ButtonGroupElement = ElementInstance<ButtonGroupSpec, ButtonGroupComponent>;
/** `<m-button-group-item>` declares one button and renders nothing. */
export declare const buttonGroupItemDeclaration: {
    readonly name: "button-group-item";
    readonly attributes: {
        readonly value: {
            readonly type: "string";
        };
        readonly label: {
            readonly type: "string";
        };
        /** Markup (HTML). */
        readonly icon: {
            readonly type: "string";
        };
        /** Markup (HTML). */
        readonly "selected-icon": {
            readonly type: "string";
        };
        readonly "aria-label": {
            readonly type: "string";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
        readonly selected: {
            readonly type: "boolean";
        };
    };
};
export type ButtonGroupItemAttributes = ElementAttributes<typeof buttonGroupItemDeclaration>;
/** Registers `<m-button-group>` and `<m-button-group-item>` (or with another prefix). */
export declare const defineButtonGroup: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-button-group": ButtonGroupElement;
        "m-button-group-item": HTMLElement & ButtonGroupItemAttributes;
    }
}
export {};
