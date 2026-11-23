/** `<m-fab-menu>` with `<m-fab-menu-item>` children. */
import type { FabMenuComponent } from "../components/fab-menu/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementInstance } from "./define.js";
/** The FAB menu, with the methods the element adds to it. */
export type FabMenuElementComponent = FabMenuComponent & {
    /** Opens the menu. */
    show: () => void;
    /** Closes the menu. */
    hide: () => void;
};
declare const fabMenuSpec: {
    name: string;
    ssr: false;
    create: (config: Config) => FabMenuElementComponent;
    styles: string[];
    attributes: {
        open: {
            type: "boolean";
            update: (c: FabMenuElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: FabMenuElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        color: {
            type: "string";
            config: string;
        };
        size: {
            type: "string";
            config: string;
        };
        presentation: {
            type: "string";
            config: string;
        };
        placement: {
            type: "string";
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
    setup: (host: import("./define.js").ElementHost<FabMenuElementComponent>, c: FabMenuElementComponent) => void;
    observeChildren: (host: import("./define.js").ElementHost<FabMenuElementComponent>, c: FabMenuElementComponent) => boolean;
};
export declare const fabMenuElement: import("./define.js").ElementDefinition<FabMenuElementComponent>;
export type FabMenuSpec = typeof fabMenuSpec;
/** `<m-fab-menu>` as a ref or a query returns it. */
export type FabMenuElement = ElementInstance<FabMenuSpec, FabMenuElementComponent>;
/** `<m-fab-menu-item>` declares one action and renders nothing. */
export declare const fabMenuItemDeclaration: {
    readonly name: "fab-menu-item";
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
    };
};
export type FabMenuItemAttributes = ElementAttributes<typeof fabMenuItemDeclaration>;
/** Registers `<m-fab-menu>` and `<m-fab-menu-item>` (or with another prefix). */
export declare const defineFabMenu: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-fab-menu": FabMenuElement;
        "m-fab-menu-item": HTMLElement & FabMenuItemAttributes;
    }
}
export {};
