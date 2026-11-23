/** `<m-navigation-rail>` with `<m-navigation-rail-item>` children: the standard (in-page) navigation rail. */
import type { NavigationRailComponent, NavigationRailItemConfig } from "../components/navigation-rail/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
/** The declared destinations, `active` as given; the navigation bar reads its items the same way. */
export declare const declaredItems: (host: HTMLElement, active: string | null) => NavigationRailItemConfig[];
declare const navigationRailSpec: {
    name: string;
    slots: readonly [
        "header"
    ];
    create: (config: Config) => NavigationRailComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        value: {
            type: "string";
            update: (c: NavigationRailComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        expanded: {
            type: "boolean";
            config: string;
            update: (c: NavigationRailComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "hide-when-collapsed": {
            type: "boolean";
            config: string;
        };
        layout: {
            type: "string";
            config: string;
        };
        "expanded-width": {
            type: "number";
            config: string;
        };
        "no-toggle": {
            type: "boolean";
        };
        "no-ripple": {
            type: "boolean";
        };
        "expand-label": {
            type: "string";
            config: string;
        };
        "collapse-label": {
            type: "string";
            config: string;
        };
        /** Markup (HTML). */
        "expand-icon": {
            type: "string";
            config: string;
        };
        /** Markup (HTML). */
        "collapse-icon": {
            type: "string";
            config: string;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: NavigationRailComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: NavigationRailComponent) => string | null;
            set: (c: NavigationRailComponent, v: unknown) => undefined;
        };
    };
    methods: readonly [
        "expand",
        "collapse",
        "toggle"
    ];
    model: "value";
    events: {
        change: {
            detail: (payload: unknown) => {
                value: string;
            };
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
    setup: (host: ElementHost<NavigationRailComponent>, component: NavigationRailComponent) => () => NavigationRailComponent;
    observeChildren: (host: ElementHost<NavigationRailComponent>, component: NavigationRailComponent) => boolean;
};
export declare const navigationRailElement: import("./define.js").ElementDefinition<NavigationRailComponent>;
export type NavigationRailSpec = typeof navigationRailSpec;
/** `<m-navigation-rail>` as a ref or a query returns it. */
export type NavigationRailElement = ElementInstance<NavigationRailSpec, NavigationRailComponent>;
/** `<m-navigation-rail-item>` declares one destination and renders nothing. */
export declare const navigationRailItemDeclaration: {
    readonly name: "navigation-rail-item";
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
        readonly href: {
            readonly type: "string";
        };
        readonly badge: {
            readonly type: "string";
        };
        readonly "badge-label": {
            readonly type: "string";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
    };
};
export type NavigationRailItemAttributes = ElementAttributes<typeof navigationRailItemDeclaration>;
/** Registers `<m-navigation-rail>` and `<m-navigation-rail-item>` (or with another prefix). */
export declare const defineNavigationRail: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-navigation-rail": NavigationRailElement;
        "m-navigation-rail-item": HTMLElement & NavigationRailItemAttributes;
    }
}
export {};
