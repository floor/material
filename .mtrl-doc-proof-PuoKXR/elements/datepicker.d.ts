/** `<m-datepicker>`: the date picker as a form-associated custom element. */
import type { DatePickerComponent } from "../components/datepicker/types.js";
import { type DefineOptions, type ElementHost, type ElementInstance } from "./define.js";
/** The date picker, with what the element adds to it. */
export interface DatepickerElementComponent extends DatePickerComponent {
    /** Opens the calendar, unless the picker is disabled or read-only. */
    show: () => void;
}
declare const datepickerSpec: {
    name: string;
    create: (config: import("./define.js").Config) => DatepickerElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        variant: {
            type: "string";
            config: string;
        };
        "selection-mode": {
            type: "string";
            config: string;
        };
        value: {
            type: "string";
            config: string;
            update: (c: DatepickerElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        min: {
            type: "string";
            config: string;
        };
        max: {
            type: "string";
            config: string;
        };
        "date-format": {
            type: "string";
            config: string;
        };
        locale: {
            type: "string";
            config: string;
        };
        "initial-view": {
            type: "string";
            config: string;
        };
        "close-on-select": {
            type: "boolean";
            config: string;
        };
        label: {
            type: "string";
            config: string;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: DatepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "supporting-text": {
            type: "string";
            config: string;
            update: (c: DatepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        required: {
            type: "boolean";
            config: string;
            update: (c: DatepickerElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: DatepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        readonly: {
            type: "boolean";
            config: string;
            update: (c: DatepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        open: {
            type: "boolean";
            update: (c: DatepickerElementComponent, v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
    };
    properties: {
        value: {
            get: (c: DatepickerElementComponent) => string;
            set: (c: DatepickerElementComponent, value: unknown) => void;
        };
    };
    model: "value";
    methods: readonly [
        "show",
        "close"
    ];
    events: {
        change: {
            detail: (payload: unknown) => {
                value: string;
                date: Date | Date[] | null;
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
    };
    form: {
        value: (c: DatepickerElementComponent) => string;
        events: string[];
        activate: (c: DatepickerElementComponent) => void;
        state: (c: DatepickerElementComponent) => string;
        restore: (c: DatepickerElementComponent, state: string) => void;
        disable: (c: DatepickerElementComponent, disabled: boolean) => undefined;
    };
    setup: (host: ElementHost<DatepickerElementComponent>, c: DatepickerElementComponent) => () => void;
};
export declare const datepickerElement: import("./define.js").ElementDefinition<DatepickerElementComponent>;
export type DatepickerSpec = typeof datepickerSpec;
/** `<m-datepicker>` as a ref or a query returns it. */
export type DatepickerElement = ElementInstance<DatepickerSpec, DatepickerElementComponent>;
/** Registers `<m-datepicker>` (or `<prefix-datepicker>`). */
export declare const defineDatepicker: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-datepicker": DatepickerElement;
    }
}
export {};
