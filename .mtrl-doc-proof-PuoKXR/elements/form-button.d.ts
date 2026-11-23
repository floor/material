/** What the button-like elements (`<m-button>`, `<m-icon-button>`, `<m-fab>`, `<m-extended-fab>`) share: `type="submit"` and `type="reset"` act on the host's form, which a button inside a shadow root cannot reach by itself. */
import type { AttributeSpec, ElementComponent, ElementHost, FormSpec } from "./define.js";
export interface ButtonControl {
    element: HTMLElement;
    leadingElement?: HTMLElement;
    isSelected?: () => boolean;
}
export declare const buttonAria: {
    "aria-expanded": AttributeSpec<ButtonControl> & {
        type: "string";
    };
    "aria-haspopup": AttributeSpec<ButtonControl> & {
        type: "string";
    };
    "aria-pressed": AttributeSpec<ButtonControl> & {
        type: "string";
    };
    "aria-controls": AttributeSpec<ButtonControl> & {
        type: "string";
    };
    "aria-describedby": AttributeSpec<ButtonControl> & {
        type: "string";
    };
};
export declare const syncButtonAria: (host: HTMLElement, component: ButtonControl) => void;
/** The part of a button-like component the form wiring uses. */
interface Disableable {
    enable: () => unknown;
    disable: () => unknown;
}
/** The `type` attribute: read by the click handler, never passed to the factory, whose inner button stays `type="button"`. */
export declare const typeAttribute: {
    readonly type: "string";
    readonly update: () => undefined;
};
/** Form association without a value, so `internals.form` is the host's form and a disabled fieldset disables the button. */
export declare const buttonForm: <C extends Disableable>() => FormSpec<C>;
/** Submits or resets the host's form on click, as `type` asks. */
export declare const setupFormButton: <C extends ElementComponent>(host: ElementHost<C>, component: C) => (() => void);
export {};
