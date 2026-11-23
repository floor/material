/** `<m-chips>` with `<m-chip>` children: the chip set. */
import type { ChipsComponent } from "../components/chips/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
/** The live selection: several values, or one or none in a single-select set. */
export type ChipsValue = string | string[] | null;
declare const chipsSpec: {
    name: string;
    create: (config: Config) => ChipsComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        selection: {
            type: "string";
        };
        "selection-required": {
            type: "boolean";
            config: string;
        };
        scrollable: {
            type: "boolean";
            config: string;
            update: (c: ChipsComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        vertical: {
            type: "boolean";
            config: string;
            update: (c: ChipsComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        label: {
            type: "string";
            config: string;
            update: (c: ChipsComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "label-position": {
            type: "string";
            config: string;
            update: (c: ChipsComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: ChipsComponent, v: import("./define.js").AttributeValue) => void;
        };
        value: {
            type: "string";
            update: (c: ChipsComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: ChipsComponent) => ChipsValue;
            set: (c: ChipsComponent, v: unknown) => void;
        };
    };
    model: "value";
    events: {
        change: {
            detail: (payload: unknown) => {
                value: string | string[] | null;
            };
        };
        remove: {
            detail: (payload: unknown) => {
                chipValue: string | null;
                value: string | string[] | null;
            };
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<ChipsComponent>, component: ChipsComponent) => () => undefined;
    observeChildren: (host: ElementHost<ChipsComponent>, component: ChipsComponent) => boolean;
};
export declare const chipsElement: import("./define.js").ElementDefinition<ChipsComponent>;
export type ChipsSpec = typeof chipsSpec;
/** `<m-chips>` as a ref or a query returns it. */
export type ChipsElement = ElementInstance<ChipsSpec, ChipsComponent>;
/** `<m-chip>` declares one chip and renders nothing. */
export declare const chipDeclaration: {
    readonly name: "chip";
    readonly attributes: {
        readonly value: {
            readonly type: "string";
        };
        readonly label: {
            readonly type: "string";
        };
        readonly variant: {
            readonly type: "string";
        };
        /** Markup (HTML). */
        readonly icon: {
            readonly type: "string";
        };
        /** Markup (HTML). */
        readonly "trailing-icon": {
            readonly type: "string";
        };
        /** Markup (HTML), not a person's name or an image URL. */
        readonly avatar: {
            readonly type: "string";
        };
        readonly "remove-label": {
            readonly type: "string";
        };
        readonly selected: {
            readonly type: "boolean";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
        readonly elevated: {
            readonly type: "boolean";
        };
    };
};
export type ChipAttributes = ElementAttributes<typeof chipDeclaration>;
/** Registers `<m-chips>` and `<m-chip>` (or with another prefix). */
export declare const defineChips: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-chips": ChipsElement;
        "m-chip": HTMLElement & ChipAttributes;
    }
}
export {};
