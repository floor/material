/** `<m-menu>` with `<m-menu-item>` children. */
import type { MenuComponent, MenuContent } from "../components/menu/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementInstance } from "./define.js";
/** The menu, with the methods the element adds to it. */
export type MenuElementComponent = MenuComponent & {
    /** Opens the menu. */
    show: () => void;
    /** Closes the menu. */
    hide: () => void;
};
/** An anchor as a property takes it: an element, or an id. */
export type MenuAnchor = HTMLElement | string | null;
/** The items `<tag>` children declare, with their own `<tag>` children as a submenu. */
export declare const declaredMenuItems: (parent: Element, tag: string) => MenuContent[];
declare const menuSpec: {
    name: string;
    ssr: (host: HTMLElement) => boolean;
    create: (config: Config) => MenuElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        open: {
            type: "boolean";
            update: (c: MenuElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        anchor: {
            type: "string";
            config: string;
            update: (c: MenuElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        position: {
            type: "string";
            config: string;
            update: (c: MenuElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        offset: {
            type: "number";
            config: string;
        };
        variant: {
            type: "string";
            config: string;
        };
        color: {
            type: "string";
            config: string;
        };
        "no-close-on-select": {
            type: "boolean";
            config: string;
        };
        /** @deprecated See MenuConfig.dense; the dense variant is removed in 4.0. */
        dense: {
            type: "boolean";
            config: string;
        };
        "max-height": {
            type: "string";
            config: string;
            update: (c: MenuElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "aria-label": {
            type: "string";
            update: (c: MenuElementComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        anchor: {
            get: (c: MenuElementComponent) => HTMLElement | null;
            set: (c: MenuElementComponent, v: unknown) => void;
            config: string;
        };
    };
    methods: readonly [
        "show",
        "hide",
        "toggle"
    ];
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
                value: string;
            };
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: import("./define.js").ElementHost<MenuElementComponent>, c: MenuElementComponent) => () => void;
    observeChildren: (host: HTMLElement, c: MenuComponent) => boolean;
};
export declare const menuElement: import("./define.js").ElementDefinition<MenuElementComponent>;
export type MenuSpec = typeof menuSpec;
/** `<m-menu>` as a ref or a query returns it. */
export type MenuElement = ElementInstance<MenuSpec, MenuElementComponent>;
/** `<m-menu-item>` declares one item and renders nothing. */
export declare const menuItemDeclaration: {
    readonly name: "menu-item";
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
        readonly shortcut: {
            readonly type: "string";
        };
        readonly "supporting-text": {
            readonly type: "string";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
        readonly divider: {
            readonly type: "boolean";
        };
        readonly gap: {
            readonly type: "boolean";
        };
    };
};
export type MenuItemAttributes = ElementAttributes<typeof menuItemDeclaration>;
/** Registers `<m-menu-item>`, before the elements that read it. */
export declare const defineMenuItem: (options?: DefineOptions) => void;
/** Registers `<m-menu>` and `<m-menu-item>` (or with another prefix). */
export declare const defineMenu: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-menu": MenuElement;
        "m-menu-item": HTMLElement & MenuItemAttributes;
    }
}
export {};
