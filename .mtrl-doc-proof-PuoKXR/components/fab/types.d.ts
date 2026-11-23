import type { TouchEvents } from "../../core/utils/mobile.js";
import type { IconManager } from "../../core/compose/features/icon.js";
import type { ForwardedEventPayload } from "../../core/dom/create.js";
/** FAB variants following Material Design 3 guidelines Material Design 3 offers different color variants for the FAB to match visual hierarchy and application color schemes. */
export type FabVariant = "primary-container" | "secondary-container" | "tertiary-container" | "primary" | "secondary" | "tertiary";
/** FAB size variants Material Design 3 defines multiple size options for FABs to accommodate different use cases and screen sizes. */
export type FabSize = "default" | "medium" | "large";
/** FAB position options Predefined positions for the FAB when used as a floating element. */
export type FabPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";
/** Logical viewport corners; start/end follow text direction. */
export type FabPlacement = "none" | "top-start" | "top-end" | "bottom-start" | "bottom-end";
/** Configuration interface for the FAB component Comprehensive options for creating and customizing a Floating Action Button according to Material Design 3 guidelines. */
export interface FabConfig {
    /**
 * FAB variant that determines visual styling The color variant affects the FAB's background color, icon color, and elevation.
 * @default 'primary-container'
 */
    variant?: FabVariant | string;
    /**
 * FAB size variant Controls the diameter of the FAB and the appropriate icon size.
 * @default 'default'
 */
    size?: FabSize | string;
    /**
 * Whether the FAB is initially disabled When disabled, the FAB will have a visually muted appearance and won't respond to user interactions.
 * @default false
 */
    disabled?: boolean;
    /** FAB icon HTML content. */
    icon?: string;
    /** Icon size in pixels or other CSS units Allows customizing the icon size beyond the default size for the selected FAB size. */
    iconSize?: string;
    /** Additional CSS classes to add to the FAB Custom classes for styling or identifying the FAB. */
    class?: string;
    /** Button value attribute Sets the HTML value attribute of the button element, useful when using the FAB in a form context. */
    value?: string;
    /** Position of the FAB on the screen Configures the FAB for floating positioning on the screen. */
    /** @deprecated Use placement. Physical left/right do not mirror in RTL; removal in 4.0. */
    position?: FabPosition | string;
    /** Logical corner, fixed with 16px margins; none stays in flow. */
    placement?: FabPlacement;
    /**
 * Button type attribute Sets the HTML type attribute of the button element.
 * @default 'button'
 */
    type?: "button" | "submit" | "reset";
    /** Accessible label for screen readers Sets the aria-label attribute for accessibility. */
    /** Accessible name. */
    ariaLabel: string;
    /**
 * Whether to enable ripple effect The ripple effect provides visual feedback when the user interacts with the FAB.
 * @default true
 */
    ripple?: boolean;
    /**
 * Component prefix for class names The prefix used for BEM-style class names.
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /** Ripple effect configuration Fine-grained control over the ripple effect appearance and behavior. */
    rippleConfig?: {
        /** How long, in milliseconds, a released wave lingers before it is removed */
        duration?: number;
    };
    /**
 * Whether to show the FAB with an entrance animation When true, the FAB will animate into view when added to the DOM.
 * @default false
 */
    animate?: boolean;
    /** Index signature for additional configuration options */
    [key: string]: unknown;
}
/** FAB component interface Provides methods for interacting with and manipulating a Floating Action Button. */
/** The events a FAB reports, and what each hands its handler. */
export interface FabEvents extends TouchEvents {
    /** The FAB was clicked. */
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLButtonElement>) => void;
    /** The FAB took focus. */
    focus: (payload: ForwardedEventPayload<FocusEvent, HTMLButtonElement>) => void;
    /** The FAB lost focus. */
    blur: (payload: ForwardedEventPayload<FocusEvent, HTMLButtonElement>) => void;
}
export interface FabComponent {
    /** The FAB's DOM element Direct access to the underlying button element for DOM manipulation. */
    element: HTMLButtonElement;
    /** API for managing FAB icons Access to low-level icon methods and elements. */
    icon: {
        /** Sets the icon HTML content */
        setIcon: (html: string) => IconManager;
        /** Gets the current icon HTML content */
        getIcon: () => string;
        /** Gets the icon DOM element */
        getElement: () => HTMLElement | null;
    };
    /** API for managing disabled state Access to low-level disabled state methods. */
    disabled: {
        /** Enables the FAB */
        enable: () => void;
        /** Disables the FAB */
        disable: () => void;
        /** Checks if the FAB is disabled */
        isDisabled: () => boolean;
    };
    /** API for managing component lifecycle Access to low-level lifecycle methods. */
    lifecycle: {
        /** Destroys the component and cleans up resources */
        destroy: () => void;
    };
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /** Gets the FAB's value attribute */
    getValue: () => string;
    /**
 * Sets the FAB's value attribute
 * @param value
 */
    setValue: (value: string) => FabComponent;
    /** Enables the FAB (removes disabled attribute) Makes the FAB interactive and visually enabled. */
    enable: () => FabComponent;
    /** Disables the FAB (adds disabled attribute) Makes the FAB non-interactive and visually disabled. */
    disable: () => FabComponent;
    /** Whether the FAB is disabled */
    isDisabled: () => boolean;
    /**
 * Sets the FAB's icon
 * @param icon
 */
    setIcon: (icon: string) => FabComponent;
    /** Gets the FAB's icon HTML content */
    getIcon: () => string;
    /**
 * Sets the FAB's position Positions the FAB in one of the four corners of the viewport.
 * @param position
 */
    /** @deprecated Physical position alias; use the placement option/attribute. Removal in 4.0. */
    setPosition: (position: string) => FabComponent;
    /** Gets the current position of the FAB */
    /** @deprecated Reads only the physical position alias. Removal in 4.0. */
    getPosition: () => string | null;
    /** Lowers the FAB (useful for pressed state) Visually lowers the FAB by reducing its elevation, typically used to indicate a pressed or active state. */
    lower: () => FabComponent;
    /** Raises the FAB back to its default elevation Restores the default elevation after it has been lowered. */
    raise: () => FabComponent;
    /** Destroys the FAB component and cleans up resources Removes event listeners and prepares the component for garbage collection. */
    destroy: () => void;
    /**
 * Adds an event listener to the FAB
 * @param event
 * @param handler
 */
    on: <K extends keyof FabEvents>(event: K, handler: FabEvents[K]) => FabComponent;
    /**
 * Removes an event listener from the FAB
 * @param event
 * @param handler
 */
    off: <K extends keyof FabEvents>(event: K, handler: FabEvents[K]) => FabComponent;
    /**
 * Adds CSS classes to the FAB element
 * @param classes
 */
    addClass: (...classes: string[]) => FabComponent;
}
