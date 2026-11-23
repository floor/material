import { BaseComponentConfig } from "../../core/config/component.js";
import { ProgressConfig, ProgressComponent } from "../progress/types.js";
import { ButtonSize, ButtonShape } from "./constants.js";
/** Button variant types - controls the visual style of the button */
export type ButtonVariant = "filled" | "tonal" | "outlined" | "elevated" | "text";
/** Configuration interface for the Button component */
export interface ButtonConfig extends BaseComponentConfig {
    /**
 * Button variant that determines visual styling
 * @default 'filled'
 */
    variant?: ButtonVariant | string;
    /**
 * Button size variant
 * @default 's'
 */
    size?: ButtonSize | string;
    /**
 * Button shape variant
 * @default 'round'
 */
    shape?: ButtonShape | string;
    /**
 * Whether the button is initially disabled
 * @default false
 */
    disabled?: boolean;
    /** Initial button text content, or a node placed where the text goes (the */
    text?: string | Node;
    /** Initial button icon HTML content. */
    icon?: string;
    /** Icon size in pixels or other CSS units */
    iconSize?: string;
    /** Additional CSS classes to add to the button */
    class?: string;
    /** Button value attribute */
    value?: string;
    /**
 * Button type attribute
 * @default 'button'
 */
    type?: "button" | "submit" | "reset";
    /**
 * Whether to enable ripple effect
 * @default true
 */
    ripple?: boolean;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /** Ripple effect configuration */
    rippleConfig?: {
        /** How long, in milliseconds, a released wave lingers before it is removed */
        duration?: number;
    };
    /** Accessible name for the button (aria-label) */
    ariaLabel?: string;
    /** Progress indicator configuration */
    progress?: ProgressConfig | boolean;
    /**
 * Whether to show progress initially
 * @default false
 */
    showProgress?: boolean;
    /** Initial busy and disabled state. */
    loading?: boolean;
    /**
 * Makes the button a toggle button: a click flips its selected state, the element carries aria-pressed, and the selected state uses the M3 toggle colours and swaps the resting shape (round to square, square to round).
 * @default false
 */
    toggle?: boolean;
    /**
 * Initial selected state of a toggle button
 * @default false
 */
    selected?: boolean;
    /**
 * Whether a click flips the selected state of a toggle button.
 * @default true
 */
    toggleOnClick?: boolean;
}
/** Icon API interface for managing button icons */
export interface IconAPI {
    /**
 * Sets the icon HTML content
 * @param html
 */
    setIcon: (html: string) => IconAPI;
    /** Gets the current icon HTML content */
    getIcon: () => string;
    /** Gets the icon DOM element */
    getElement: () => HTMLElement | null;
}
/** Text API interface for managing button text */
export interface TextAPI {
    /**
 * Sets the text content
 * @param content
 */
    setText: (content: string) => TextAPI;
    /** Gets the current text content */
    getText: () => string;
    /** Gets the text DOM element */
    getElement: () => HTMLElement | null;
}
/** Button component interface */
/** What a forwarded DOM event hands a button listener. */
export interface ButtonEventPayload<E extends Event = Event> {
    /** The DOM event that triggered the forward. */
    event: E;
    /** The button's root element, which is the element listened on. */
    element: HTMLElement;
    /** The same DOM event as `event`; both names have always been provided. */
    originalEvent: E;
}
/** A toggle button's `change`. */
export interface ButtonChangePayload {
    /** Whether the button is now selected */
    selected: boolean;
    /** The button's value, as `getValue()` returns it */
    value: string;
}
/** The events a button reports, and what each hands its handler. */
export interface ButtonEvents {
    /** A toggle button's selected state changed on a click. */
    change: (payload: ButtonChangePayload) => void;
    /** The button was clicked. */
    click: (payload: ButtonEventPayload<MouseEvent>) => void;
    /** The button took focus. */
    focus: (payload: ButtonEventPayload<FocusEvent>) => void;
    /** The button lost focus. */
    blur: (payload: ButtonEventPayload<FocusEvent>) => void;
}
export interface ButtonComponent {
    /** The button's DOM element */
    element: HTMLButtonElement;
    /** API for managing button text */
    text: TextAPI;
    /** API for managing button icons */
    icon: IconAPI;
    /** API for managing disabled state */
    disabled: {
        /** Enables the button */
        enable: () => void;
        /** Disables the button */
        disable: () => void;
        /** Checks if the button is disabled */
        isDisabled: () => boolean;
    };
    /** API for managing component lifecycle */
    lifecycle: {
        /** Destroys the component and cleans up resources */
        destroy: () => void;
    };
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /** Gets the button's value attribute */
    getValue: () => string;
    /**
 * Sets the button's value attribute
 * @param value
 */
    setValue: (value: string) => ButtonComponent;
    /** Gets the button's current variant */
    getVariant: () => ButtonVariant | string;
    /**
 * Sets the button's variant (visual style)
 * @param variant
 */
    setVariant: (variant: ButtonVariant | string) => ButtonComponent;
    /** Gets the button's current size */
    getSize: () => ButtonSize | string;
    /**
 * Sets the button's size
 * @param size
 */
    setSize: (size: ButtonSize | string) => ButtonComponent;
    /** Gets the button's current shape */
    getShape: () => ButtonShape | string;
    /**
 * Sets the button's shape
 * @param shape
 */
    setShape: (shape: ButtonShape | string) => ButtonComponent;
    /** Enables the button (removes disabled attribute) */
    enable: () => ButtonComponent;
    /** Disables the button (adds disabled attribute) */
    disable: () => ButtonComponent;
    /** Whether the button is disabled */
    isDisabled: () => boolean;
    /**
 * Sets the button's text content
 * @param content
 */
    setText: (content: string) => ButtonComponent;
    /** Gets the button's text content */
    getText: () => string;
    /** Checks if the button has an icon */
    hasIcon: () => boolean;
    /**
 * Sets the button's icon
 * @param icon
 */
    setIcon: (icon: string) => ButtonComponent;
    /** Gets the button's icon HTML content */
    getIcon: () => string;
    /** Destroys the button component and cleans up resources */
    destroy: () => void;
    /**
 * Sets the active state of the button
 * @param active
 */
    setActive: (active: boolean) => ButtonComponent;
    /**
 * Sets the selected state of a toggle button (no-op unless `toggle` is set)
 * @param selected
 */
    setSelected: (selected: boolean) => ButtonComponent;
    /** Whether a toggle button is selected */
    isSelected: () => boolean;
    /**
 * Adds an event listener to the button
 * @param event
 * @param handler
 */
    on: <K extends keyof ButtonEvents>(event: K, handler: ButtonEvents[K]) => ButtonComponent;
    /**
 * Removes an event listener from the button
 * @param event
 * @param handler
 */
    off: <K extends keyof ButtonEvents>(event: K, handler: ButtonEvents[K]) => ButtonComponent;
    /**
 * Adds CSS classes to the button element
 * @param classes
 */
    addClass: (...classes: string[]) => ButtonComponent;
    /**
 * Sets the aria-label attribute for accessibility
 * @param label
 */
    setAriaLabel: (label: string) => ButtonComponent;
    /** Progress component instance (if progress is enabled) */
    progress?: ProgressComponent;
    /** Shows the progress indicator (if progress is enabled) */
    showProgress?: () => Promise<ButtonComponent>;
    /** Shows the progress indicator synchronously (if progress is enabled) */
    showProgressSync?: () => ButtonComponent;
    /** Hides the progress indicator (if progress is enabled) */
    hideProgress?: () => Promise<ButtonComponent>;
    /** Hides the progress indicator synchronously (if progress is enabled) */
    hideProgressSync?: () => ButtonComponent;
    /**
 * Sets the progress value (0-100) (if progress is enabled)
 * @param value
 */
    setProgress?: (value: number) => Promise<ButtonComponent>;
    /**
 * Sets the progress value synchronously (0-100) (if progress is enabled)
 * @param value
 */
    setProgressSync?: (value: number) => ButtonComponent;
    /**
 * Sets the progress to indeterminate mode (if progress is enabled)
 * @param indeterminate
 */
    setIndeterminate?: (indeterminate: boolean) => Promise<ButtonComponent>;
    /**
 * Sets the progress to indeterminate mode synchronously (if progress is enabled)
 * @param indeterminate
 */
    setIndeterminateSync?: (indeterminate: boolean) => ButtonComponent;
    /**
 * Updates both button text and progress for loading states (if progress is enabled)
 * @param loading
 * @param text
 */
    setLoading?: (loading: boolean, text?: string) => Promise<ButtonComponent>;
    /**
 * Updates both button text and progress for loading states synchronously (if progress is enabled)
 * @param loading
 * @param text
 */
    setLoadingSync?: (loading: boolean, text?: string) => ButtonComponent;
}
/** Registers ButtonConfig with the global defaults map, so `setComponentDefaults("button", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        button?: Partial<ButtonConfig>;
    }
}
