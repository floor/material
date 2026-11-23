import type { TouchEvents } from "../../core/utils/mobile.js";
import type { IconManager } from "../../core/compose/features/icon.js";
import type { TextManager } from "../../core/compose/features/text.js";
import type { ForwardedEventPayload } from "../../core/dom/index.js";
/** Extended FAB variants following Material Design 3 guidelines Material Design 3 offers different color variants for the Extended FAB to match visual hierarchy and application color schemes. */
export type ExtendedFabVariant = "primary-container" | "secondary-container" | "tertiary-container" | "primary" | "secondary" | "tertiary";
/** Expressive extended FAB size: small 56dp, medium 80dp, large 96dp. */
export type ExtendedFabSize = "small" | "medium" | "large";
/** Extended FAB width behavior Controls how the Extended FAB's width is calculated. */
export type ExtendedFabWidth = "fixed" | "fluid";
/** Extended FAB position on the screen Predefined positions for the Extended FAB when used as a floating element. */
export type ExtendedFabPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";
/** Logical viewport corners; start/end follow text direction. */
export type ExtendedFabPlacement = "none" | "top-start" | "top-end" | "bottom-start" | "bottom-end";
/** Configuration interface for the Extended FAB component Comprehensive options for creating and customizing an Extended Floating Action Button according to Material Design 3 guidelines. */
export interface ExtendedFabConfig {
    /** Expressive container, icon and label size. */
    size?: ExtendedFabSize;
    /**
 * Extended FAB variant that determines visual styling The color variant affects the Extended FAB's background color, text color, and elevation.
 * @default 'primary-container'
 */
    variant?: ExtendedFabVariant | string;
    /**
 * Whether the Extended FAB is initially disabled When disabled, the Extended FAB will have a visually muted appearance and won't respond to user interactions.
 * @default false
 */
    disabled?: boolean;
    /** Extended FAB icon HTML content. */
    icon?: string;
    /** Icon size in pixels or other CSS units Allows customizing the icon size beyond the default 24px size. */
    iconSize?: string;
    /**
 * Position of the icon relative to the text Controls whether the icon appears before or after the text label.
 * @default 'start'
 */
    iconPosition?: "start" | "end";
    /** Text label for the Extended FAB The text should be short, typically one or two words describing the primary action. */
    text?: string;
    /** Additional CSS classes to add to the Extended FAB Custom classes for styling or identifying the Extended FAB. */
    class?: string;
    /** Button value attribute Sets the HTML value attribute of the button element, useful when using the Extended FAB in a form context. */
    value?: string;
    /** Position of the Extended FAB on the screen Configures the Extended FAB for floating positioning on the screen. */
    /** @deprecated Use placement. Physical left/right do not mirror in RTL; removal in 4.0. */
    position?: ExtendedFabPosition | string;
    /** Logical corner, fixed with 16px margins; none stays in flow. */
    placement?: ExtendedFabPlacement;
    /**
 * Button type attribute Sets the HTML type attribute of the button element.
 * @default 'button'
 */
    type?: "button" | "submit" | "reset";
    /** Accessible label for screen readers Sets the aria-label attribute. */
    ariaLabel?: string;
    /**
 * Whether to enable ripple effect The ripple effect provides visual feedback when the user interacts with the Extended FAB.
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
 * Whether to show the Extended FAB with an entrance animation When true, the Extended FAB will animate into view when added to the DOM.
 * @default false
 */
    animate?: boolean;
    /**
 * Width behavior of the Extended FAB
 * @default 'fixed'
 */
    width?: ExtendedFabWidth | string;
    /**
 * Whether the Extended FAB should collapse to a standard FAB on scroll When true, the Extended FAB will automatically shrink to a circular FAB (hiding the text) when the user scrolls down, and expand back to the Extended FAB when scrolling up.
 * @default false
 */
    collapseOnScroll?: boolean;
    /** Index signature for additional configuration options */
    [key: string]: unknown;
}
/** Native events forwarded through the Extended FAB's emitter. */
export interface ExtendedFabEvents extends TouchEvents {
    /** Clicks are not forwarded while the button is disabled. */
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLButtonElement>) => void;
    /** The button took focus. */
    focus: (payload: ForwardedEventPayload<FocusEvent, HTMLButtonElement>) => void;
    /** The button lost focus. */
    blur: (payload: ForwardedEventPayload<FocusEvent, HTMLButtonElement>) => void;
    /** `collapse()` ran, by call or on scroll */
    collapse: () => void;
    /** `expand()` ran, by call or on scroll */
    expand: () => void;
}
/** Extended FAB component interface Provides methods for interacting with and manipulating an Extended Floating Action Button. */
export interface ExtendedFabComponent {
    /** The Extended FAB's DOM element Direct access to the underlying button element for DOM manipulation. */
    element: HTMLButtonElement;
    /** API for managing Extended FAB icons Access to low-level icon methods and elements. */
    icon: {
        /** Sets the icon HTML content */
        setIcon: (html: string) => IconManager;
        /** Gets the current icon HTML content */
        getIcon: () => string;
        /** Gets the icon DOM element */
        getElement: () => HTMLElement | null;
    };
    /** API for managing text content Access to low-level text methods and elements. */
    text: {
        /** Sets the text content */
        setText: (text: string) => TextManager;
        /** Gets the current text content */
        getText: () => string;
        /** Gets the text DOM element */
        getElement: () => HTMLElement | null;
    };
    /** API for managing disabled state Access to low-level disabled state methods. */
    disabled: {
        /** Enables the Extended FAB */
        enable: () => void;
        /** Disables the Extended FAB */
        disable: () => void;
        /** Checks if the Extended FAB is disabled */
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
    /** Gets the Extended FAB's value attribute */
    getValue: () => string;
    /**
 * Sets the Extended FAB's value attribute
 * @param value
 */
    setValue: (value: string) => ExtendedFabComponent;
    /** Enables the Extended FAB (removes disabled attribute) Makes the Extended FAB interactive and visually enabled. */
    enable: () => ExtendedFabComponent;
    /** Disables the Extended FAB (adds disabled attribute) Makes the Extended FAB non-interactive and visually disabled. */
    disable: () => ExtendedFabComponent;
    /** Whether the extended FAB is disabled */
    isDisabled: () => boolean;
    /**
 * Sets the Extended FAB's icon
 * @param icon
 */
    setIcon: (icon: string) => ExtendedFabComponent;
    /** Gets the Extended FAB's icon HTML content */
    getIcon: () => string;
    /**
 * Sets the Extended FAB's text content
 * @param text
 */
    setText: (text: string) => ExtendedFabComponent;
    /** Gets the Extended FAB's text content */
    getText: () => string;
    /**
 * Sets the Extended FAB's position Positions the Extended FAB in one of the four corners of the viewport.
 * @param position
 */
    /** @deprecated Physical position alias; use the placement option/attribute. Removal in 4.0. */
    setPosition: (position: string) => ExtendedFabComponent;
    /** Gets the current position of the Extended FAB */
    /** @deprecated Reads only the physical position alias. Removal in 4.0. */
    getPosition: () => string | null;
    /** Lowers the Extended FAB (useful for pressed state) Visually lowers the Extended FAB by reducing its elevation, typically used to indicate a pressed or active state. */
    lower: () => ExtendedFabComponent;
    /** Raises the Extended FAB back to its default elevation Restores the default elevation after it has been lowered. */
    raise: () => ExtendedFabComponent;
    /** Collapses the Extended FAB into a standard FAB Hides the text label, showing only the icon in a circular container. */
    collapse: () => ExtendedFabComponent;
    /** Expands a collapsed Extended FAB back to its full size Shows the text label alongside the icon. */
    expand: () => ExtendedFabComponent;
    /** Destroys the Extended FAB component and cleans up resources Removes event listeners and prepares the component for garbage collection. */
    destroy: () => void;
    /**
 * Adds an event listener to the Extended FAB
 * @param event
 * @param handler
 */
    on: <K extends keyof ExtendedFabEvents>(event: K, handler: ExtendedFabEvents[K]) => ExtendedFabComponent;
    /**
 * Removes an event listener from the Extended FAB
 * @param event
 * @param handler
 */
    off: <K extends keyof ExtendedFabEvents>(event: K, handler: ExtendedFabEvents[K]) => ExtendedFabComponent;
    /**
 * Adds CSS classes to the Extended FAB element
 * @param classes
 */
    addClass: (...classes: string[]) => ExtendedFabComponent;
}
