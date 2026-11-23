/** `<m-navigation-drawer>` with `<m-navigation-drawer-item>` children: the standard (in-page) navigation drawer. */
import type { NavigationDrawerComponent } from "../components/drawer/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
/** The navigation drawer's one spec, under the tag name Material gives it. */
export declare const createDrawerSpec: (name: string) => {
    name: string;
    create: (config: Config) => import("../components/drawer/types.js").DrawerComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        value: {
            type: "string";
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => void;
        };
        open: {
            type: "boolean";
            config: string;
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        modal: {
            type: "boolean";
            config: string;
        };
        headline: {
            type: "string";
            config: string;
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        position: {
            type: "string";
            config: string;
        };
        width: {
            type: "string";
            config: string;
        };
        dense: {
            type: "boolean";
            config: string;
        };
        "no-close-on-scrim-click": {
            type: "boolean";
            update: () => undefined;
        };
        "no-close-on-escape": {
            type: "boolean";
            update: () => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: import("../components/drawer/types.js").DrawerComponent) => string | null;
            set: (c: import("../components/drawer/types.js").DrawerComponent, v: unknown) => void;
        };
    };
    model: "value";
    methods: readonly [
        "expandSection",
        "collapseSection",
        "toggleSection",
        "isSectionExpanded",
        "getExpandedSections"
    ];
    events: {
        change: {
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
        expand: {
            detail: (payload: unknown) => {
                value: string;
                expanded: boolean;
            };
            state: true;
        };
        collapse: {
            detail: (payload: unknown) => {
                value: string;
                expanded: boolean;
            };
            state: true;
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<import("../components/drawer/types.js").DrawerComponent>, component: import("../components/drawer/types.js").DrawerComponent) => () => void;
    observeChildren: (host: ElementHost<NavigationDrawerComponent>, component: NavigationDrawerComponent) => boolean;
};
export declare const navigationDrawerSpec: {
    name: string;
    create: (config: Config) => import("../components/drawer/types.js").DrawerComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        value: {
            type: "string";
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => void;
        };
        open: {
            type: "boolean";
            config: string;
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        modal: {
            type: "boolean";
            config: string;
        };
        headline: {
            type: "string";
            config: string;
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        position: {
            type: "string";
            config: string;
        };
        width: {
            type: "string";
            config: string;
        };
        dense: {
            type: "boolean";
            config: string;
        };
        "no-close-on-scrim-click": {
            type: "boolean";
            update: () => undefined;
        };
        "no-close-on-escape": {
            type: "boolean";
            update: () => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: import("../components/drawer/types.js").DrawerComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        value: {
            get: (c: import("../components/drawer/types.js").DrawerComponent) => string | null;
            set: (c: import("../components/drawer/types.js").DrawerComponent, v: unknown) => void;
        };
    };
    model: "value";
    methods: readonly [
        "expandSection",
        "collapseSection",
        "toggleSection",
        "isSectionExpanded",
        "getExpandedSections"
    ];
    events: {
        change: {
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
        expand: {
            detail: (payload: unknown) => {
                value: string;
                expanded: boolean;
            };
            state: true;
        };
        collapse: {
            detail: (payload: unknown) => {
                value: string;
                expanded: boolean;
            };
            state: true;
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<import("../components/drawer/types.js").DrawerComponent>, component: import("../components/drawer/types.js").DrawerComponent) => () => void;
    observeChildren: (host: ElementHost<NavigationDrawerComponent>, component: NavigationDrawerComponent) => boolean;
};
export declare const navigationDrawerElement: import("./define.js").ElementDefinition<import("../components/drawer/types.js").DrawerComponent>;
export type NavigationDrawerSpec = typeof navigationDrawerSpec;
/** `<m-navigation-drawer>` as a ref or a query returns it. */
export interface NavigationDrawerElement extends ElementInstance<NavigationDrawerSpec, NavigationDrawerComponent> {
    expandSection(id: string): this;
    collapseSection(id: string): this;
    toggleSection(id: string): this;
    isSectionExpanded(id: string): boolean;
    getExpandedSections(): string[];
}
/** `<m-navigation-drawer-item>` (formerly `<m-drawer-item>`) declares one destination, section headline or divider, and renders nothing. */
export declare const navigationDrawerItemDeclaration: {
    readonly name: "navigation-drawer-item";
    readonly attributes: {
        readonly type: {
            readonly type: "string";
        };
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
        readonly badge: {
            readonly type: "string";
        };
        readonly href: {
            readonly type: "string";
        };
        readonly expanded: {
            readonly type: "boolean";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
    };
};
export type NavigationDrawerItemAttributes = ElementAttributes<typeof navigationDrawerItemDeclaration>;
/** Registers `<m-navigation-drawer>` and `<m-navigation-drawer-item>` (or with another prefix). */
export declare const defineNavigationDrawer: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-navigation-drawer": NavigationDrawerElement;
        "m-navigation-drawer-item": HTMLElement & NavigationDrawerItemAttributes;
    }
}
