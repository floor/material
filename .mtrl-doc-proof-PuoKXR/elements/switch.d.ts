/** `<m-switch>`: the switch as a form-associated custom element. */
import type { SwitchComponent } from "../components/switch/types.js";
import { type DefineOptions, type ElementInstance } from "./define.js";
declare const switchSpec: {
    name: string;
    create: (config: import("./define.js").Config) => SwitchComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        checked: {
            type: "boolean";
            config: string;
            update: (c: SwitchComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        disabled: {
            type: "boolean";
            config: string;
            update: (c: SwitchComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        required: {
            type: "boolean";
            config: string;
        };
        "aria-label": {
            type: "string";
            config: string;
        };
        value: {
            type: "string";
            config: string;
            update: (c: SwitchComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        /** Markup (HTML). */
        icon: {
            type: "string";
            config: string;
        };
        error: {
            type: "boolean";
            config: string;
            update: (c: SwitchComponent, v: import("./define.js").AttributeValue) => undefined;
        };
        "supporting-text": {
            type: "string";
            config: string;
            update: (c: SwitchComponent, v: import("./define.js").AttributeValue) => undefined;
        };
    };
    properties: {
        checked: {
            get: (c: SwitchComponent) => boolean;
            set: (c: SwitchComponent, v: unknown) => undefined;
            config: string;
        };
    };
    methods: readonly [
        "toggle",
        "check",
        "uncheck"
    ];
    model: "checked";
    events: {
        change: {
            detail: (payload: unknown) => {
                checked: boolean;
                value: boolean;
                valueAttribute: string;
                nativeEvent: Event | undefined;
            };
        };
    };
    slot: {
        attribute: "label";
        config: string;
    };
    form: {
        value: (c: SwitchComponent) => string | null;
        control: (c: SwitchComponent) => HTMLInputElement;
        events: string[];
        activate: (c: SwitchComponent) => void;
        state: (c: SwitchComponent) => "checked" | "unchecked";
        restore: (c: SwitchComponent, state: string) => undefined;
        disable: (c: SwitchComponent, disabled: boolean) => undefined;
    };
};
export declare const switchElement: import("./define.js").ElementDefinition<SwitchComponent>;
export type SwitchSpec = typeof switchSpec;
/** `<m-switch>` as a ref or a query returns it. */
export type SwitchElement = ElementInstance<SwitchSpec, SwitchComponent>;
/** Registers `<m-switch>` (or `<prefix-switch>`). */
export declare const defineSwitch: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-switch": SwitchElement;
    }
}
export {};
