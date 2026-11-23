/** `<m-badge>`: a standalone badge. */
import type { BadgeComponent } from "../components/badge/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const badgeSpec: {
    name: string;
    create: (config: import("./define.js").Config) => BadgeComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        label: {
            type: "string";
            config: string;
            update: (c: BadgeComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
        max: {
            type: "number";
            config: string;
        };
        variant: {
            type: "string";
            config: string;
            update: (c: BadgeComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        color: {
            type: "string";
            config: string;
            update: (c: BadgeComponent, v: import("./define.js").AttributeValue) => undefined;
        };
    };
    properties: {
        visible: {
            get: (c: BadgeComponent) => boolean;
            set: (c: BadgeComponent, v: unknown) => undefined;
            config: string;
        };
    };
    config: (host: HTMLElement) => {
        label?: undefined;
    } | {
        label: string;
    };
    setup: (host: import("./define.js").ElementHost<BadgeComponent>, component: BadgeComponent) => undefined;
    observeChildren: (host: import("./define.js").ElementHost<BadgeComponent>, component: BadgeComponent) => true;
};
export declare const badgeElement: import("./define.js").ElementDefinition<BadgeComponent>;
export type BadgeSpec = typeof badgeSpec;
/** `<m-badge>` as a ref or a query returns it. */
export type BadgeElement = ElementInstance<BadgeSpec, BadgeComponent>;
/** Registers `<m-badge>` (or `<prefix-badge>`). */
export declare const defineBadge: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-badge": BadgeElement;
    }
}
export {};
