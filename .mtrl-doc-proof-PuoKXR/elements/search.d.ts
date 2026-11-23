/** `<m-search>` with `<m-search-suggestion>` children: the search as a form-associated custom element. */
import type { SearchComponent, SearchEvents } from "../components/search/types.js";
import { type AttributeValue, type Config, type DefineOptions, type ElementAttributes, type ElementInstance } from "./define.js";
/** The factory's events, and the element's own names for four of them. */
export interface SearchElementEvents extends SearchEvents {
    change: SearchEvents["submit"];
    select: SearchEvents["suggestionSelect"];
    open: SearchEvents["expand"];
    close: SearchEvents["collapse"];
}
/** The search, with the element's events, methods and input. */
export interface SearchElementComponent extends Omit<SearchComponent, "on" | "off"> {
    /** Subscribes by the element's event names (`open`, `select`…) as well as the factory's. */
    on: <K extends keyof SearchElementEvents>(event: K, handler: SearchElementEvents[K]) => SearchElementComponent;
    off: <K extends keyof SearchElementEvents>(event: K, handler: SearchElementEvents[K]) => SearchElementComponent;
    /** Opens the view. */
    show: () => SearchElementComponent;
    /** Closes the view. */
    close: () => SearchElementComponent;
    /** The combobox. */
    input: HTMLInputElement;
}
declare const searchSpec: {
    name: string;
    create: (config: Config) => SearchElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        placeholder: {
            type: "string";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue, host: HTMLElement) => void;
        };
        value: {
            type: "string";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => void;
        };
        variant: {
            type: "string";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => undefined;
        };
        "view-mode": {
            type: "string";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => undefined;
        };
        "min-width": {
            type: "string";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => void;
        };
        "max-width": {
            type: "string";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => void;
        };
        "no-clear-button": {
            type: "boolean";
            config: string;
        };
        "no-expand-on-focus": {
            type: "boolean";
            config: string;
        };
        "no-collapse-on-blur": {
            type: "boolean";
            config: string;
        };
        "full-width": {
            type: "boolean";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => undefined;
        };
        /** Markup (HTML). */
        "leading-icon": {
            type: "string";
            config: string;
        };
        /** Markup (HTML). */
        "trailing-icon": {
            type: "string";
            config: string;
        };
        "trailing-label": {
            type: "string";
            config: string;
        };
        /** Markup (HTML), not a person's name or an image URL. */
        avatar: {
            type: "string";
            config: string;
        };
        "avatar-label": {
            type: "string";
            config: string;
        };
        open: {
            type: "boolean";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => void;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => void;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: SearchElementComponent, v: AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: SearchElementComponent) => string;
            set: (c: SearchElementComponent, value: unknown) => void;
        };
    };
    methods: readonly [
        "show",
        "close",
        "focus"
    ];
    model: "value";
    events: {
        input: {
            detail: (payload: unknown) => {
                value: string;
            };
        };
        change: {
            detail: (payload: unknown) => {
                value: string;
            };
        };
        select: {
            detail: (payload: unknown) => {
                value: string;
            };
        };
        open: {
            detail: () => null;
            state: true;
        };
        close: {
            detail: () => null;
            state: true;
        };
        action: {
            detail: (payload: unknown) => {
                value: string;
            };
        };
    };
    form: {
        value: (c: SearchElementComponent) => string;
        control: (c: SearchElementComponent) => HTMLInputElement;
        activate: (c: SearchElementComponent) => undefined;
        state: (c: SearchElementComponent) => string;
        restore: (c: SearchElementComponent, state: string) => void;
        disable: (c: SearchElementComponent, disabled: boolean) => void;
    };
    config: (host: HTMLElement) => Config;
    setup: (host: import("./define.js").ElementHost<SearchElementComponent>, c: SearchElementComponent) => () => void;
    observeChildren: (host: HTMLElement, c: SearchElementComponent) => boolean;
};
export declare const searchElement: import("./define.js").ElementDefinition<SearchElementComponent>;
export type SearchSpec = typeof searchSpec;
/** `<m-search>` as a ref or a query returns it. */
export type SearchElement = ElementInstance<SearchSpec, SearchElementComponent>;
/** `<m-search-suggestion>` declares one suggestion and renders nothing. */
export declare const searchSuggestionDeclaration: {
    readonly name: "search-suggestion";
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
        readonly group: {
            readonly type: "string";
        };
    };
};
export type SearchSuggestionAttributes = ElementAttributes<typeof searchSuggestionDeclaration>;
/** Registers `<m-search>` and `<m-search-suggestion>` (or with another prefix). */
export declare const defineSearch: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-search": SearchElement;
        "m-search-suggestion": HTMLElement & SearchSuggestionAttributes;
    }
}
export {};
