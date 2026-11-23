import { ElementComponent } from "../../core/compose/component.js";
/** Badge variant types - determines the badge size and appearance */
export type BadgeVariant = 'small' | 'large';
/** Badge color types - determines the badge's background color */
export type BadgeColor = 'error' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info';
/** Badge position types - determines where the badge appears relative to its target */
export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
/** Configuration interface for the Badge component */
export interface BadgeConfig {
    /**
 * Badge variant (small dot or large numbered)
 * @default 'large'
 */
    variant?: BadgeVariant | string;
    /**
 * Badge color (follows Material Design 3 color system)
 * @default 'error'
 */
    color?: BadgeColor | string;
    /**
 * Badge position relative to its container element
 * @default 'top-right'
 */
    position?: BadgePosition | string;
    /** Text label inside the badge (for large badges) Up to 4 characters, numbers exceeding max will show "{max}+" For a small dot, nonnumeric text supplies its accessible announcement; otherwise it announces "New notification" without rendering text. */
    label?: string | number;
    /** Maximum value to display (shows "{max}+" if label exceeds max) */
    max?: number;
    /**
 * Whether the badge should be initially visible
 * @default true
 */
    visible?: boolean;
    /** Target element to which badge will be attached */
    target?: HTMLElement;
    /** Additional CSS classes to apply to the badge element */
    class?: string;
    /**
 * CSS class prefix for all badge classes
 * @default "mtrl"
 */
    prefix?: string;
    /**
 * Component name used in CSS class generation
 * @default "badge"
 */
    componentName?: string;
}
/** The visibility control withVisibility installs on a badge. */
export interface BadgeVisibility {
    /** Shows the badge */
    show: () => void;
    /** Hides the badge */
    hide: () => void;
    /** Toggles badge visibility, or forces it when given a flag */
    toggle: (visible?: boolean) => void;
    /** Whether the badge is currently visible */
    isVisible: () => boolean;
}
/** What a badge feature enhancer needs from the component it is handed. */
export interface BadgeFeatureHost extends ElementComponent {
    config: BadgeConfig & Record<string, unknown>;
    wrapper?: HTMLElement;
}
/** Badge component interface */
export interface BadgeComponent {
    /** The badge's root DOM element */
    element: HTMLElement;
    /** Badge wrapper element (if badge is attached to target) */
    wrapper?: HTMLElement;
    /**
 * Sets the badge's text label
 * @param label
 */
    setLabel: (label: string | number) => BadgeComponent;
    /** Gets the badge's current text label */
    getLabel: () => string;
    /**
 * Sets the badge's content (alias for setLabel)
 * @param content
 */
    setContent: (content: string | number) => BadgeComponent;
    /** Gets the badge's current content (alias for getLabel) */
    getContent: () => string;
    /** Shows the badge (makes it visible) */
    show: () => BadgeComponent;
    /** Hides the badge (makes it invisible) */
    hide: () => BadgeComponent;
    /**
 * Toggles badge visibility
 * @param visible
 */
    toggle: (visible?: boolean) => BadgeComponent;
    /** Checks if the badge is currently visible */
    isVisible: () => boolean;
    /**
 * Sets maximum value (after which badge shows max+)
 * @param max
 */
    setMax: (max: number) => BadgeComponent;
    /**
 * Sets badge color
 * @param color
 */
    setColor: (color: BadgeColor | string) => BadgeComponent;
    /**
 * Sets badge variant (size style)
 * @param variant
 */
    setVariant: (variant: BadgeVariant | string) => BadgeComponent;
    /**
 * Sets badge position relative to target
 * @param position
 */
    setPosition: (position: BadgePosition | string) => BadgeComponent;
    /**
 * Attaches badge to a target element
 * @param target
 */
    attachTo: (target: HTMLElement) => BadgeComponent;
    /** Makes badge standalone (removes from wrapper) */
    detach: () => BadgeComponent;
    /** Destroys the badge component and cleans up resources */
    destroy: () => void;
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /**
 * Adds CSS classes to the badge element
 * @param classes
 */
    addClass: (...classes: string[]) => BadgeComponent;
    /**
 * Removes CSS classes from the badge element
 * @param classes
 */
    removeClass: (...classes: string[]) => BadgeComponent;
    /**
 * Adds an event listener to the badge
 * @param event
 * @param handler
 */
    on: (event: string, handler: Function) => BadgeComponent;
    /**
 * Removes an event listener from the badge
 * @param event
 * @param handler
 */
    off: (event: string, handler: Function) => BadgeComponent;
}
