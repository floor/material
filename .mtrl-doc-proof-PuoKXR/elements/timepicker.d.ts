/** `<m-timepicker>`: the time picker as a form-associated custom element. */
import { type TimePickerComponent, type TimePickerEvents } from "../components/timepicker/types.js";
import { type DefineOptions, type ElementHost, type ElementInstance } from "./define.js";
/** The time picker as the element sees it: its value can be empty. */
export interface TimepickerElementComponent {
    element: HTMLElement;
    picker: TimePickerComponent;
    /** The committed time, or "" before one is set or confirmed. */
    getValue: () => string;
    setValue: (value: string) => void;
    /** Opens the dialog, unless the picker is disabled. */
    show: () => void;
    /** Closes the dialog without committing. */
    close: () => void;
    isOpen: () => boolean;
    required: boolean;
    /** Subscribes to the time picker's events; `change` and `input` carry the element's possibly empty value. */
    on: <K extends keyof TimePickerEvents>(event: K, handler: TimePickerEvents[K]) => void;
    off: <K extends keyof TimePickerEvents>(event: K, handler: TimePickerEvents[K]) => void;
    destroy: () => void;
}
declare const timepickerSpec: {
    name: string;
    create: (config: import("./define.js").Config) => TimepickerElementComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        value: {
            type: "string";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        format: {
            type: "string";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        type: {
            type: "string";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        orientation: {
            type: "string";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        min: {
            type: "string";
            config: string;
        };
        max: {
            type: "string";
            config: string;
        };
        step: {
            type: "number";
            config: string;
        };
        "show-seconds": {
            type: "boolean";
            config: string;
        };
        label: {
            type: "string";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "aria-label": {
            type: "string";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        required: {
            type: "boolean";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue) => void;
        };
        open: {
            type: "boolean";
            update: (c: TimepickerElementComponent, v: import("./define.js").AttributeValue, host: HTMLElement) => void;
        };
    };
    properties: {
        value: {
            get: (c: TimepickerElementComponent) => string;
            set: (c: TimepickerElementComponent, value: unknown) => void;
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
            };
        };
        input: {
            detail: (payload: unknown) => {
                value: string;
                draftValue: string;
            };
        };
        confirm: {
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
    };
    form: {
        value: (c: TimepickerElementComponent) => string;
        events: string[];
        activate: (c: TimepickerElementComponent) => void;
        state: (c: TimepickerElementComponent) => string;
        restore: (c: TimepickerElementComponent, state: string) => void;
        disable: (c: TimepickerElementComponent, disabled: boolean) => void;
    };
    setup: (host: ElementHost<TimepickerElementComponent>, c: TimepickerElementComponent) => () => void;
};
export declare const timepickerElement: import("./define.js").ElementDefinition<TimepickerElementComponent>;
export type TimepickerSpec = typeof timepickerSpec;
/** `<m-timepicker>` as a ref or a query returns it. */
export type TimepickerElement = ElementInstance<TimepickerSpec, TimepickerElementComponent>;
/** Registers `<m-timepicker>` (or `<prefix-timepicker>`). */
export declare const defineTimepicker: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-timepicker": TimepickerElement;
    }
}
export {};
