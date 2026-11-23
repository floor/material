import type { TouchEvents } from "../../core/utils/mobile.js";
import type { EventCallback } from "../../core/state/emitter.js";
/** Checkbox label position types - controls where the label appears */
export type CheckboxLabelPosition = "start" | "end";
/** Configuration interface for the Checkbox component */
export interface CheckboxConfig {
    /** Input name attribute, used for form submission */
    name?: string;
    /**
 * Initial checked state
 * @default false
 */
    checked?: boolean;
    /**
 * Initial indeterminate state (partially checked)
 * @default false
 */
    indeterminate?: boolean;
    /**
 * Whether input is required for form validation
 * @default false
 */
    required?: boolean;
    /**
 * Whether checkbox is disabled (non-interactive)
 * @default false
 */
    disabled?: boolean;
    /** Input value attribute, used for form submission */
    value?: string;
    /** Label text displayed next to the checkbox */
    label?: string;
    /**
 * Label position (start/end)
 * @default "end"
 */
    labelPosition?: CheckboxLabelPosition | string;
    /**
 * Error state: the outline, the selected container and the state layers take the error role, and the input is marked `aria-invalid`.
 * @default false
 */
    error?: boolean;
    /** Accessible name when there is no visible label */
    ariaLabel?: string;
    /**
 * Put ariaLabel only on the input/handle, omitting the generated wrapper label.
 * @default false
 */
    controlLabelOnly?: boolean;
    /** Whether Enter toggles as Space does. */
    enterToggles?: boolean;
    /** Additional CSS classes to apply to the checkbox */
    class?: string;
    /**
 * CSS class prefix for all checkbox classes
 * @default "mtrl"
 */
    prefix?: string;
    /**
 * Component name used in CSS class generation
 * @default "checkbox"
 */
    componentName?: string;
}
/** A checked-state change from native input activation. */
export interface CheckboxChangePayload {
    /** The new checked state. */
    checked: boolean;
    /** The checked model value, matching getValue() at dispatch. */
    value: boolean;
    /** The input's HTML value attribute, used for native form submission. */
    valueAttribute: string;
    /** The original native change event, when supplied by the emitter. */
    nativeEvent?: Event;
}
/** Events emitted by the checkbox API. */
export interface CheckboxEvents extends TouchEvents {
    change: (payload: CheckboxChangePayload) => void;
}
/** Checkbox component interface */
export interface CheckboxComponent {
    /** The checkbox's root DOM element (container) */
    element: HTMLElement;
    /** The actual input element (native checkbox) */
    input: HTMLInputElement;
    /** Gets the checkbox's checked state (boolean) for form compatibility */
    getValue: () => boolean;
    /**
 * Sets the checkbox's checked state.
 * @param value
 */
    setValue: (value: boolean | string) => CheckboxComponent;
    /** Gets the HTML value attribute (rarely needed) */
    getValueAttribute: () => string;
    /**
 * Sets the HTML value attribute (rarely needed)
 * @param value
 */
    setValueAttribute: (value: string) => CheckboxComponent;
    /** Checks the checkbox (sets checked=true). */
    check: () => CheckboxComponent;
    /** Unchecks the checkbox (sets checked=false). */
    uncheck: () => CheckboxComponent;
    /** Toggles the checkbox's checked state. */
    toggle: () => CheckboxComponent;
    /** Checks if the checkbox is currently checked */
    isChecked: () => boolean;
    /**
 * Sets the checkbox's indeterminate state
 * @param state
 */
    setIndeterminate: (state: boolean) => CheckboxComponent;
    /**
 * Sets or clears the error state
 * @param error
 */
    setError: (error: boolean) => CheckboxComponent;
    /**
 * Sets the checkbox's label text
 * @param text
 */
    setLabel: (text: string) => CheckboxComponent;
    /** Gets the checkbox's current label text */
    getLabel: () => string;
    /**
 * Adds an event listener to the checkbox
 * @param event
 * @param handler
 */
    on: <K extends keyof CheckboxEvents>(event: K, handler: CheckboxEvents[K]) => CheckboxComponent;
    /**
 * Removes an event listener from the checkbox
 * @param event
 * @param handler
 */
    off: <K extends keyof CheckboxEvents>(event: K, handler: CheckboxEvents[K]) => CheckboxComponent;
    /** Enables the checkbox, making it interactive */
    enable: () => CheckboxComponent;
    /** Disables the checkbox, making it non-interactive */
    disable: () => CheckboxComponent;
    /** Whether the checkbox is disabled */
    isDisabled: () => boolean;
    /** Destroys the checkbox component and cleans up resources */
    destroy: () => void;
}
/** API options interface for internal use */
export interface ApiOptions {
    disabled: {
        enable: () => void;
        disable: () => void;
        isDisabled: () => boolean;
    };
    lifecycle: {
        destroy: () => void;
    };
    checkable: {
        check: () => void;
        uncheck: () => void;
        toggle: () => void;
        isChecked: () => boolean;
    };
}
/** Base component interface for internal composition */
export interface BaseComponent {
    element: HTMLElement;
    input?: HTMLInputElement;
    getValue?: () => boolean;
    setValue?: (value: boolean) => void;
    setIndeterminate?: (state: boolean) => void;
    setError?: (error: boolean) => void;
    label?: {
        setText: (content: string) => void;
        getText: () => string;
    };
    on?: (event: string, handler: EventCallback) => this;
    off?: (event: string, handler: EventCallback) => this;
    disabled?: {
        enable: () => void;
        disable: () => void;
        isDisabled: () => boolean;
    };
    lifecycle?: {
        destroy: () => void;
    };
    checkable?: {
        check: () => void;
        uncheck: () => void;
        toggle: () => void;
        isChecked: () => boolean;
    };
}
/** Component as it reaches the API step of the pipeline. */
export type ApiComponent = BaseComponent & Required<Pick<BaseComponent, "checkable" | "disabled" | "lifecycle">>;
/** Registers CheckboxConfig with the global defaults map, so `setComponentDefaults("checkbox", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        checkbox?: Partial<CheckboxConfig>;
    }
}
