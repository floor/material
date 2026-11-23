/** `<m-slider>`: the slider as a form-associated custom element. */
import type { SliderComponent } from "../components/slider/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const sliderSpec: {
    name: string;
    create: (config: import("./define.js").Config) => SliderComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        value: {
            type: "number";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "second-value": {
            type: "number";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        min: {
            type: "number";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        max: {
            type: "number";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        step: {
            type: "number";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        range: {
            type: "boolean";
            config: string;
        };
        centered: {
            type: "boolean";
            config: string;
        };
        ticks: {
            type: "boolean";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "show-value": {
            type: "boolean";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        color: {
            type: "string";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        size: {
            type: "string";
            config: string;
            update: (c: SliderComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        orientation: {
            type: "string";
            config: string;
        };
        "top-to-bottom": {
            type: "boolean";
            config: string;
        };
        label: {
            type: "string";
            config: string;
        };
        "label-position": {
            type: "string";
            config: string;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
        };
        "icon-position": {
            type: "string";
            config: string;
        };
        /** Markup (HTML). */
        "inset-icon": {
            type: "string";
            config: string;
            update: (c: SliderComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => undefined;
        };
        /** Markup (HTML). */
        "inset-icon-at-min": {
            type: "string";
            config: string;
            update: (c: SliderComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => undefined;
        };
        "aria-label": {
            type: "string";
            update: (c: SliderComponent, _v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
    };
    properties: {
        value: {
            get: (c: SliderComponent) => number;
            set: (c: SliderComponent, v: unknown) => void;
            config: string;
        };
        secondValue: {
            get: (c: SliderComponent) => number | null;
            set: (c: SliderComponent, v: unknown) => void;
        };
    };
    model: "value";
    defaults: readonly [
        "secondValue"
    ];
    events: {
        input: {
            detail: (payload: unknown) => {
                value: number;
                secondValue?: number;
            };
        };
        change: {
            detail: (payload: unknown) => {
                value: number;
                secondValue?: number;
            };
        };
    };
    form: {
        value: (c: SliderComponent, host: HTMLElement) => string | FormData | null;
        events: string[];
        state: (c: SliderComponent) => string;
        restore: (c: SliderComponent, state: string) => void;
        disable: (c: SliderComponent, disabled: boolean) => undefined;
    };
    setup: (host: import("./define.js").ElementHost<SliderComponent>, component: SliderComponent) => void;
};
export declare const sliderElement: import("./define.js").ElementDefinition<SliderComponent>;
export type SliderSpec = typeof sliderSpec;
/** `<m-slider>` as a ref or a query returns it. */
export type SliderElement = ElementInstance<SliderSpec, SliderComponent>;
/** Registers `<m-slider>` (or `<prefix-slider>`). */
export declare const defineSlider: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-slider": SliderElement;
    }
}
export {};
