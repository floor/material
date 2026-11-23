/** `<m-navigation-bar>` with `<m-navigation-bar-item>` children: the M3 Expressive navigation bar. */
import type { NavigationBarComponent } from "../components/navigation-bar/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementHost, type ElementInstance } from "./define.js";
declare const navigationBarSpec: {
    name: string;
    create: (config: Config) => NavigationBarComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        value: {
            type: "string";
            update: (c: NavigationBarComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "item-layout": {
            type: "string";
            config: string;
        };
        "hide-on-scroll": {
            type: "boolean";
            config: string;
        };
        "no-ripple": {
            type: "boolean";
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: NavigationBarComponent, v: import("./define.js").AttributeValue) => undefined;
        };
    };
    properties: {
        value: {
            get: (c: NavigationBarComponent) => string | null;
            set: (c: NavigationBarComponent, v: unknown) => undefined;
        };
    };
    methods: readonly [
        "hide",
        "show"
    ];
    model: "value";
    events: {
        change: {
            detail: (payload: unknown) => {
                value: string;
            };
        };
        visibility: {
            detail: (payload: unknown) => {
                hidden: boolean;
            };
            state: true;
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: ElementHost<NavigationBarComponent>, component: NavigationBarComponent) => () => NavigationBarComponent;
    observeChildren: (host: ElementHost<NavigationBarComponent>, component: NavigationBarComponent) => boolean;
};
export declare const navigationBarElement: import("./define.js").ElementDefinition<NavigationBarComponent>;
export type NavigationBarSpec = typeof navigationBarSpec;
/** `<m-navigation-bar>` as a ref or a query returns it. */
export type NavigationBarElement = ElementInstance<NavigationBarSpec, NavigationBarComponent>;
/** `<m-navigation-bar-item>` declares one destination and renders nothing. */
export declare const navigationBarItemDeclaration: {
    readonly name: "navigation-bar-item";
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
export type NavigationBarItemAttributes = ElementAttributes<typeof navigationBarItemDeclaration>;
/** Registers `<m-navigation-bar>` and `<m-navigation-bar-item>` (or with another prefix). */
export declare const defineNavigationBar: (options?: DefineOptions) => string;
declare global {
    interface HTMLElementTagNameMap {
        "m-navigation-bar": NavigationBarElement;
        "m-navigation-bar-item": HTMLElement & NavigationBarItemAttributes;
    }
}
export {};
