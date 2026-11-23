import type { MenuColor, MenuVariant } from "../menu/types.js";
import type { MenuOwner } from "../menu/inner.js";
import type { TextFieldComponent } from "../text-field/types.js";
/** Available Select variants */
export type SelectVariant = "filled" | "outlined";
/** Select variant constants */
export declare const SELECT_VARIANTS: {
    readonly FILLED: "filled";
    readonly OUTLINED: "outlined";
};
/** Select option interface */
export interface SelectOption {
    /** Unique identifier for the option */
    id: string;
    /** Display text for the option */
    text: string;
    /** Whether the option is disabled */
    disabled?: boolean;
    /** Optional icon to display with the option. */
    icon?: string;
    /** Whether this option has a submenu */
    hasSubmenu?: boolean;
    /** Optional array of submenu options */
    submenu?: SelectOption[];
    /** Additional data associated with the option */
    data?: unknown;
}
/** Configuration interface for the Select component */
export interface SelectConfig {
    /** Array of options to display in the select menu */
    options?: SelectOption[];
    /** Currently selected value (option id) */
    value?: string;
    /** Visual variant (filled, outlined) */
    variant?: SelectVariant | string;
    /** Density level (default, compact) */
    density?: "default" | "compact" | string;
    /** Label text */
    label?: string;
    /** Accessible name for the focused input; the visible label is the fallback. */
    ariaLabel?: string;
    /** Input name attribute */
    name?: string;
    /** Whether select is required */
    required?: boolean;
    /** Options handed to the select's menu. */
    menu?: {
        /** Where the menu is mounted and positioned against; document.body for a menu that escapes a clipping container */
        container?: HTMLElement | null;
        /** The menu's max height (a CSS length); the list scrolls inside it */
        maxHeight?: string;
        /** Whether the menu flips above the field when there is no room below */
        autoFlip?: boolean;
        /** The menu's variant: 'vertical' is the M3 expressive menu, items apart in a rounded container */
        variant?: MenuVariant;
        /** The vertical variant's colour mapping */
        color?: MenuColor;
    };
    /** `"top"` renders the menu next to the field, in the field's own tree (a shadow root included), and shows it in the browser's top layer: above every z-index and outside any clipping ancestor. */
    layer?: "top";
    /** Whether select is disabled */
    disabled?: boolean;
    /** Supporting text content */
    supportingText?: string;
    /** Whether supporting text indicates an error */
    error?: boolean;
    /** Menu placement relative to the text field */
    placement?: string;
    /** Additional CSS classes */
    class?: string;
    /** Prefix for class names */
    prefix?: string;
    /** Component name */
    componentName?: string;
    /** Event callbacks */
    on?: {
        /** Called when the select value changes */
        change?: (event: SelectChangeEvent) => void;
        /** Called when the select menu opens */
        open?: (event: SelectEvent) => void;
        /** Called when the select menu closes */
        close?: (event: SelectEvent) => void;
    };
}
/** Select component interface */
export interface SelectComponent {
    /** The root element of the select */
    element: HTMLElement;
    /** The text field component */
    textField: TextFieldComponent;
    /** Gets the select's current value (selected option id) */
    getValue: () => string | null;
    /**
 * Sets the select's value (by option id)
 * @param value
 */
    setValue: (value: string | null | undefined) => SelectComponent;
    /** Clears the current selection */
    clear: () => SelectComponent;
    /** Gets the select's current displayed text */
    getText: () => string;
    /** Gets the selected option object */
    getSelectedOption: () => SelectOption | null;
    /** Gets all available options */
    getOptions: () => SelectOption[];
    /**
 * Sets new options
 * @param options
 */
    setOptions: (options: SelectOption[]) => SelectComponent;
    /**
 * Opens the select menu.
 * @param interactionType
 */
    open: (interactionType?: "mouse" | "keyboard") => SelectComponent;
    /** Closes the select menu. */
    close: () => SelectComponent;
    /** Checks if the menu is open */
    isOpen: () => boolean;
    /**
 * Sets the density of the select
 * @param density
 */
    setDensity: (density: "default" | "compact" | string) => SelectComponent;
    /** Gets the current density setting */
    getDensity: () => string;
    /**
 * Adds an event listener
 * @param event
 * @param handler
 */
    on: <T extends keyof SelectEvents>(event: T, handler: SelectEvents[T]) => SelectComponent;
    /**
 * Removes an event listener
 * @param event
 * @param handler
 */
    off: <T extends keyof SelectEvents>(event: T, handler: SelectEvents[T]) => SelectComponent;
    /** Enables the select */
    enable: () => SelectComponent;
    /** Disables the select */
    disable: () => SelectComponent;
    /** Whether the select is disabled */
    isDisabled: () => boolean;
    /**
 * Sets the error state on the select
 * @param error
 * @param message
 */
    setError: (error: boolean, message?: string) => SelectComponent;
    /** Clears the error state on the select */
    clearError: () => SelectComponent;
    /** Destroys the select component */
    destroy: () => void;
}
/** What `open` and `close` carry. */
export interface SelectEvent {
    /** The select component */
    select: SelectComponent;
    /** Original DOM event if available */
    originalEvent?: Event;
}
/** Select change event interface */
export interface SelectChangeEvent extends SelectEvent {
    /** The selected option id */
    value: string | null;
    /** The selected option text */
    text: string;
    /** The complete selected option object */
    option: SelectOption;
}
/** Select events interface for type-checking */
export interface SelectEvents {
    change: (event: SelectChangeEvent) => void;
    open: (event: SelectEvent) => void;
    close: (event: SelectEvent) => void;
}
/** API options interface */
export interface ApiOptions {
    select: {
        getValue: () => string | null;
        setValue: (value: string | null | undefined) => void;
        clear: () => void;
        getText: () => string;
        getSelectedOption: () => SelectOption | null;
        getOptions: () => SelectOption[];
        setOptions: (options: SelectOption[]) => void;
        open: () => void;
        close: () => void;
        isOpen: () => boolean;
    };
    events?: {
        on: <T extends keyof SelectEvents>(event: T, handler: SelectEvents[T]) => void;
        off: <T extends keyof SelectEvents>(event: T, handler: SelectEvents[T]) => void;
    };
    disabled: {
        enable: () => void;
        disable: () => void;
    };
    lifecycle: {
        destroy: () => void;
    };
}
/** Select controller added by the menu feature */
export interface SelectController {
    getValue: () => string | null;
    setValue: (value: string | null | undefined) => BaseComponent;
    clear: () => BaseComponent;
    getText: () => string;
    getSelectedOption: () => SelectOption | null;
    getOptions: () => SelectOption[];
    setOptions: (options: SelectOption[]) => BaseComponent;
    open: (event?: Event, interactionType?: "mouse" | "keyboard") => BaseComponent;
    close: (event?: Event) => BaseComponent;
    isOpen: () => boolean;
}
/** Base component interface */
export interface BaseComponent extends MenuOwner {
    element: HTMLElement;
    textField?: TextFieldComponent;
    select?: SelectController;
    on?: <T extends keyof SelectEvents>(event: T, handler: SelectEvents[T]) => void;
    off?: <T extends keyof SelectEvents>(event: T, handler: SelectEvents[T]) => void;
    emit?: (event: string, data?: unknown) => void;
    disabled?: {
        enable: () => void;
        disable: () => void;
    };
    lifecycle?: {
        destroy: () => void;
    };
}
