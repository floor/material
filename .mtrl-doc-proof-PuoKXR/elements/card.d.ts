/** `<m-card>`: the card as a custom element. */
import type { CardComponent } from "../components/card/types.js";
import { type Config, type DefineOptions, type ElementInstance } from "./define.js";
declare const cardSpec: {
    name: string;
    slots: readonly [
        "avatar",
        "header-action",
        "headline",
        "subhead",
        "media",
        "actions"
    ];
    create: (config: Config) => CardComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
        };
        clickable: {
            type: "boolean";
            config: string;
        };
        "promote-child-actions": {
            type: "boolean";
            config: string;
        };
        "full-width": {
            type: "boolean";
            config: string;
            update: (c: CardComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        headline: {
            type: "string";
            config: string;
        };
        subhead: {
            type: "string";
            config: string;
        };
        "actions-align": {
            type: "string";
            config: string;
        };
        disabled: {
            type: "boolean";
            update: (c: CardComponent, v: import("./define.js").AttributeValue) => void;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: CardComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    config: (host: HTMLElement) => Config;
    setup: (host: import("./define.js").ElementHost<CardComponent>, c: CardComponent) => void;
    observeChildren: (host: HTMLElement, component: CardComponent) => boolean;
};
export declare const cardElement: import("./define.js").ElementDefinition<CardComponent>;
export type CardSpec = typeof cardSpec;
/** `<m-card>` as a ref or a query returns it. */
export type CardElement = ElementInstance<CardSpec, CardComponent>;
/** Registers `<m-card>` (or `<prefix-card>`). */
export declare const defineCard: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-card": CardElement;
    }
}
export {};
