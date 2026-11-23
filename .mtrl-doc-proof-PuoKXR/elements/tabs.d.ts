/** `<m-tabs>` with `<m-tab>` children. */
import type { TabsComponent } from "../components/tabs/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementInstance } from "./define.js";
declare const tabsSpec: {
    name: string;
    create: (config: Config) => TabsComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        "aria-label": {
            type: "string";
            config: string;
            update: (c: TabsComponent, v: import("./define.js").AttributeValue) => void;
        };
        variant: {
            type: "string";
            config: string;
        };
        value: {
            type: "string";
        };
    };
    properties: {
        value: {
            get: (c: TabsComponent) => string | null;
            set: (c: TabsComponent, v: unknown) => undefined;
        };
    };
    model: "value";
    events: {
        change: {
            detail: (payload: unknown) => {
                value: string | null;
            };
        };
    };
    config: (host: HTMLElement) => Config;
    observeChildren: (host: HTMLElement, component: TabsComponent) => boolean;
};
export declare const tabsElement: import("./define.js").ElementDefinition<TabsComponent>;
export type TabsSpec = typeof tabsSpec;
/** `<m-tabs>` as a ref or a query returns it. */
export type TabsElement = ElementInstance<TabsSpec, TabsComponent>;
/** `<m-tab>` declares one tab and renders nothing. */
export declare const tabDeclaration: {
    readonly name: "tab";
    readonly attributes: {
        readonly "aria-label": {
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
        readonly badge: {
            readonly type: "string";
        };
        readonly disabled: {
            readonly type: "boolean";
        };
    };
};
export type TabAttributes = ElementAttributes<typeof tabDeclaration>;
/** Registers `<m-tabs>` and `<m-tab>` (or with another prefix). */
export declare const defineTabs: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-tabs": TabsElement;
        "m-tab": HTMLElement & TabAttributes;
    }
}
export {};
