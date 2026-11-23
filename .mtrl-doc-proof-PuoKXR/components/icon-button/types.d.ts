import type { TouchEvents } from "../../core/utils/mobile.js";
import type { ForwardedEventPayload } from "../../core/dom/index.js";
import { BaseComponentConfig } from "../../core/config/component.js";
import { IconButtonVariant, IconButtonSize, IconButtonShape, IconButtonWidth } from "./constants.js";
/** Configuration interface for the IconButton component IconButtons display actions in a compact form using icons. */
export interface IconButtonConfig extends BaseComponentConfig {
    /**
 * IconButton variant that determines visual styling
 * @default 'standard'
 */
    variant?: IconButtonVariant | string;
    /**
 * IconButton size variant
 * @default 's'
 */
    size?: IconButtonSize | string;
    /**
 * IconButton shape variant
 * @default 'round'
 */
    shape?: IconButtonShape | string;
    /**
 * IconButton width variant
 * @default 'default'
 */
    width?: IconButtonWidth | string;
    /**
 * Whether the IconButton is initially disabled
 * @default false
 */
    disabled?: boolean;
    /** Icon HTML content (required for icon buttons). */
    icon?: string;
    /** Selected state icon HTML content (for toggle buttons). */
    selectedIcon?: string;
    /**
 * Whether the IconButton supports toggle (selection) behavior
 * @default false
 */
    toggle?: boolean;
    /**
 * Initial selected state (only applies when toggle is true)
 * @default false
 */
    selected?: boolean;
    /**
 * Whether a click flips the selected state of a toggle button.
 * @default true
 */
    toggleOnClick?: boolean;
    /** Additional CSS classes to add to the IconButton */
    class?: string;
    /** Button value attribute */
    value?: string;
    /**
 * Button type attribute
 * @default 'button'
 */
    type?: 'button' | 'submit' | 'reset';
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
    /** Accessible name for the IconButton (aria-label) */
    /** Accessible name. */
    ariaLabel: string;
    /**
 * Whether to show tooltip on hover
 * @default true
 */
    tooltip?: boolean;
}
/** Icon API interface for managing IconButton icons */
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
/** Toggle state manager interface for IconButton */
export interface ToggleManager {
    /** Selects the IconButton (toggle on) */
    select: () => ToggleManager;
    /** Deselects the IconButton (toggle off) */
    deselect: () => ToggleManager;
    /** Toggles the selection state */
    toggle: () => ToggleManager;
    /** Checks if the IconButton is currently selected */
    isSelected: () => boolean;
}
/** A toggle icon button's `change`. */
export interface IconButtonChangePayload {
    /** Whether the button is now selected */
    selected: boolean;
    /** The button's value, as `getValue()` returns it */
    value: string;
}
/** The icon button's events: native ones forwarded through its emitter, and a toggle button's `change`. */
export interface IconButtonEvents extends TouchEvents {
    /** A toggle button's selected state changed on a click. */
    change: (payload: IconButtonChangePayload) => void;
    /** Clicks are not forwarded while the button is disabled. */
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLButtonElement>) => void;
    /** The button took focus. */
    focus: (payload: ForwardedEventPayload<FocusEvent, HTMLButtonElement>) => void;
    /** The button lost focus. */
    blur: (payload: ForwardedEventPayload<FocusEvent, HTMLButtonElement>) => void;
}
/** IconButton component interface */
export interface IconButtonComponent {
    /** The IconButton's DOM element */
    element: HTMLButtonElement;
    /** API for managing IconButton icons */
    icon: IconAPI;
    /** API for managing disabled state */
    disabled: {
        /** Enables the IconButton */
        enable: () => void;
        /** Disables the IconButton */
        disable: () => void;
        /** Checks if the IconButton is disabled */
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
    /** Gets the IconButton's value attribute */
    getValue: () => string;
    /**
 * Sets the IconButton's value attribute
 * @param value
 */
    setValue: (value: string) => IconButtonComponent;
    /** Gets the IconButton's current variant */
    getVariant: () => IconButtonVariant | string;
    /**
 * Sets the IconButton's variant
 * @param variant
 */
    setVariant: (variant: IconButtonVariant | string) => IconButtonComponent;
    /** Gets the IconButton's current size */
    getSize: () => IconButtonSize | string;
    /**
 * Sets the IconButton's size
 * @param size
 */
    setSize: (size: IconButtonSize | string) => IconButtonComponent;
    /** Gets the IconButton's current shape */
    getShape: () => IconButtonShape | string;
    /**
 * Sets the IconButton's shape
 * @param shape
 */
    setShape: (shape: IconButtonShape | string) => IconButtonComponent;
    /** Gets the IconButton's current width */
    getWidth: () => IconButtonWidth | string;
    /**
 * Sets the IconButton's width
 * @param width
 */
    setWidth: (width: IconButtonWidth | string) => IconButtonComponent;
    /** Enables the IconButton */
    enable: () => IconButtonComponent;
    /** Disables the IconButton */
    disable: () => IconButtonComponent;
    /** Whether the icon button is disabled */
    isDisabled: () => boolean;
    /**
 * Sets the IconButton's icon
 * @param icon
 */
    setIcon: (icon: string) => IconButtonComponent;
    /** Gets the IconButton's icon HTML content */
    getIcon: () => string;
    /**
 * Sets the selected state icon (for toggle buttons)
 * @param icon
 */
    setSelectedIcon: (icon: string) => IconButtonComponent;
    /** Gets the selected state icon HTML content */
    getSelectedIcon: () => string;
    /** Checks if the IconButton is in toggle mode */
    isToggle: () => boolean;
    /** Selects the IconButton (for toggle buttons) */
    select: () => IconButtonComponent;
    /** Deselects the IconButton (for toggle buttons) */
    deselect: () => IconButtonComponent;
    /** Toggles the selection state (for toggle buttons) */
    toggleSelected: () => IconButtonComponent;
    /** Checks if the IconButton is selected */
    isSelected: () => boolean;
    /**
 * Sets the aria-label attribute for accessibility
 * @param label
 */
    setAriaLabel: (label: string) => IconButtonComponent;
    /** Destroys the IconButton component and cleans up resources */
    destroy: () => void;
    /**
 * Adds an event listener to the IconButton
 * @param event
 * @param handler
 */
    on: <K extends keyof IconButtonEvents>(event: K, handler: IconButtonEvents[K]) => IconButtonComponent;
    /**
 * Removes an event listener from the IconButton
 * @param event
 * @param handler
 */
    off: <K extends keyof IconButtonEvents>(event: K, handler: IconButtonEvents[K]) => IconButtonComponent;
    /**
 * Adds CSS classes to the IconButton element
 * @param classes
 */
    addClass: (...classes: string[]) => IconButtonComponent;
    /**
 * Removes CSS classes from the IconButton element
 * @param classes
 */
    removeClass: (...classes: string[]) => IconButtonComponent;
}
