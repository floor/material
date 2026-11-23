/** `<m-carousel>` with `<m-carousel-item>` children. */
import type { CarouselComponent } from "../components/carousel/types.js";
import { type Config, type DefineOptions, type ElementAttributes, type ElementInstance } from "./define.js";
declare const carouselSpec: {
    name: string;
    ssr: false;
    create: (config: Config) => CarouselComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        wheel: {
            type: "boolean";
            config: string;
            update: (c: CarouselComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        variant: {
            type: "string";
            config: string;
        };
        index: {
            type: "number";
            config: string;
            update: (c: CarouselComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "item-width": {
            type: "number";
            config: string;
        };
        gap: {
            type: "number";
            config: string;
        };
        padding: {
            type: "number";
            config: string;
        };
        "corner-radius": {
            type: "number";
            config: string;
        };
        "min-small-item-width": {
            type: "number";
            config: string;
        };
        "max-small-item-width": {
            type: "number";
            config: string;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: CarouselComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    properties: {
        index: {
            get: (c: CarouselComponent) => number;
            set: (c: CarouselComponent, v: unknown) => undefined;
            config: string;
        };
    };
    model: "index";
    methods: readonly [
        "next",
        "prev",
        "goTo"
    ];
    events: {
        change: {
            detail: (payload: unknown) => {
                value: number;
            };
        };
    };
    config: (host: HTMLElement) => Config;
    observeChildren: (host: HTMLElement, component: CarouselComponent) => boolean;
};
export declare const carouselElement: import("./define.js").ElementDefinition<CarouselComponent>;
export type CarouselSpec = typeof carouselSpec;
/** `<m-carousel>` as a ref or a query returns it. */
export type CarouselElement = ElementInstance<CarouselSpec, CarouselComponent>;
/** `<m-carousel-item>` declares one item and renders nothing. */
export declare const carouselItemDeclaration: {
    readonly name: "carousel-item";
    readonly attributes: {
        readonly value: {
            readonly type: "string";
        };
        readonly src: {
            readonly type: "string";
        };
        readonly alt: {
            readonly type: "string";
        };
        readonly width: {
            readonly type: "number";
        };
        readonly height: {
            readonly type: "number";
        };
        readonly loading: {
            readonly type: "string";
        };
        readonly decoding: {
            readonly type: "string";
        };
        readonly label: {
            readonly type: "string";
        };
        readonly title: {
            readonly type: "string";
        };
        readonly description: {
            readonly type: "string";
        };
        readonly "button-text": {
            readonly type: "string";
        };
        readonly "button-url": {
            readonly type: "string";
        };
    };
};
export type CarouselItemAttributes = ElementAttributes<typeof carouselItemDeclaration>;
/** Registers `<m-carousel>` and `<m-carousel-item>` (or with another prefix). */
export declare const defineCarousel: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-carousel": CarouselElement;
        "m-carousel-item": HTMLElement & CarouselItemAttributes;
    }
}
export {};
