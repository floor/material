/** `<m-list>` with `<m-list-item>` children. */
import type { ListComponent, ListItem } from "../components/list/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
declare const listSpec: {
    name: string;
    create: (config: Config) => ListComponent<ListItem>;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
        };
        selection: {
            type: "string";
            config: string;
        };
        value: {
            type: "string";
            config: string;
            update: (c: ListComponent<ListItem>, v: import("./define.js").AttributeValue) => void;
        };
        disabled: {
            type: "boolean";
            update: (c: ListComponent<ListItem>, _v: import("./define.js").AttributeValue, host: HTMLElement) => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: ListComponent<ListItem>, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: ListComponent<ListItem>) => string | null;
            set: (c: ListComponent<ListItem>, v: unknown) => void;
            config: string;
        };
        values: {
            get: (c: ListComponent<ListItem>) => string[];
            set: (c: ListComponent<ListItem>, v: unknown) => void;
            config: string;
        };
    };
    model: "value";
    defaults: string[];
    events: {
        activate: {
            detail: (payload: unknown) => {
                value: string;
            };
            state: true;
        };
        change: {
            detail: (payload: unknown) => {
                value: string | null;
                values: string[];
            };
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<ListComponent<ListItem>>, component: ListComponent<ListItem>) => (() => void);
    observeChildren: (host: HTMLElement, component: ListComponent<ListItem>) => boolean;
};
export declare const listElement: import("./define.js").ElementDefinition<ListComponent<ListItem>>;
export type ListSpec = typeof listSpec;
/** `<m-list>` as a ref or a query returns it. */
export type ListElement = ElementInstance<ListSpec, ListComponent<ListItem>>;
/** `<m-list-item>` declares one row and renders nothing. */
export declare const listItemDeclaration: {
    readonly name: "list-item";
    readonly attributes: {
        readonly value: {
            readonly type: "string";
        };
        readonly headline: {
            readonly type: "string";
        };
        readonly overline: {
            readonly type: "string";
        };
        readonly "supporting-text": {
            readonly type: "string";
        };
        /** Markup (HTML). */
        readonly "leading-icon": {
            readonly type: "string";
        };
        /** Markup (HTML), not a person's name or an image URL. */
        readonly "leading-avatar": {
            readonly type: "string";
        };
        readonly "leading-image": {
            readonly type: "string";
        };
        /** Markup (HTML). */
        readonly "trailing-icon": {
            readonly type: "string";
        };
        readonly "trailing-text": {
            readonly type: "string";
        };
        readonly kind: {
            readonly type: "string";
        };
        readonly inset: {
            readonly type: "boolean";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
        readonly selected: {
            readonly type: "boolean";
        };
    };
};
export type ListItemAttributes = ElementAttributes<typeof listItemDeclaration>;
/** Registers `<m-list>` and `<m-list-item>` (or with another prefix). */
export declare const defineList: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-list": ListElement;
        "m-list-item": HTMLElement & ListItemAttributes;
    }
}
export {};
