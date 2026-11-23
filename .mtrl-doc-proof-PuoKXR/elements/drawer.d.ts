/**
 * `<m-drawer>` and `<m-drawer-item>`: the navigation drawer under its old name, kept for 3.x.
 * @deprecated use `<m-navigation-drawer>`. Material Design 3 names the
 * component the navigation drawer.
 */
import type { NavigationDrawerComponent } from "../components/drawer/types.js";
import { type DefineOptions, type ElementAttributes, type ElementInstance } from "./define.js";
declare const drawerSpec: {
    name: string;
    create: (config: import("./define.js").Config) => import("../components/drawer/types.js").DrawerComponent;
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
    config: (host: HTMLElement) => import("./define.js").Config;
    setup: (host: import("./define.js").ElementHost<import("../components/drawer/types.js").DrawerComponent>, component: import("../components/drawer/types.js").DrawerComponent) => () => void;
    observeChildren: (host: import("./define.js").ElementHost<NavigationDrawerComponent>, component: NavigationDrawerComponent) => boolean;
};
/** @deprecated use `navigationDrawerElement`. */
export declare const drawerElement: import("./define.js").ElementDefinition<import("../components/drawer/types.js").DrawerComponent>;
/** @deprecated use `NavigationDrawerSpec`. */
export type DrawerSpec = typeof drawerSpec;
/** @deprecated use `NavigationDrawerElement`. */
export interface DrawerElement extends ElementInstance<DrawerSpec, NavigationDrawerComponent> {
    expandSection(id: string): this;
    collapseSection(id: string): this;
    toggleSection(id: string): this;
    isSectionExpanded(id: string): boolean;
    getExpandedSections(): string[];
}
/**
 * @deprecated use `navigationDrawerItemDeclaration`.
 * `<m-drawer-item>` declares one destination, section headline or divider,
 * and renders nothing. Its text content is the label unless `label` is set.
 */
export declare const drawerItemDeclaration: {
    readonly name: "drawer-item";
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
/** @deprecated use `NavigationDrawerItemAttributes`. */
export type DrawerItemAttributes = ElementAttributes<typeof drawerItemDeclaration>;
/**
 * @deprecated use `defineNavigationDrawer`. Registers `<m-drawer>` and
 * `<m-drawer-item>` (or with another prefix).
 */
export declare const defineDrawer: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        /** @deprecated use `m-navigation-drawer`. */
        "m-drawer": DrawerElement;
        /** @deprecated use `m-navigation-drawer-item`. */
        "m-drawer-item": HTMLElement & DrawerItemAttributes;
    }
}
export {};
