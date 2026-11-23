/** Tooltip positions */
export declare const TOOLTIP_POSITIONS: {
    readonly TOP: "top";
    readonly RIGHT: "right";
    readonly BOTTOM: "bottom";
    readonly LEFT: "left";
    readonly TOP_START: "top-start";
    readonly TOP_END: "top-end";
    readonly RIGHT_START: "right-start";
    readonly RIGHT_END: "right-end";
    readonly BOTTOM_START: "bottom-start";
    readonly BOTTOM_END: "bottom-end";
    readonly LEFT_START: "left-start";
    readonly LEFT_END: "left-end";
};
/** Tooltip variants */
export declare const TOOLTIP_VARIANTS: {
    readonly DEFAULT: "default";
    readonly RICH: "rich";
    readonly PLAIN: "plain";
};
/** Default values */
export declare const DEFAULT_SHOW_DELAY = 300;
export declare const DEFAULT_HIDE_DELAY = 100;
export declare const DEFAULT_OFFSET = 8;
export declare const DEFAULT_ARROW_SIZE = 8;
/** Available Tooltip variants */
export type TooltipVariant = 'default' | 'rich' | 'plain';
/** Available Tooltip positions */
export type TooltipPosition = typeof TOOLTIP_POSITIONS[keyof typeof TOOLTIP_POSITIONS];
/** Configuration interface for the Tooltip component */
export interface TooltipConfig {
    /** Tooltip content text */
    text?: string;
    /** HTML element that triggers the tooltip */
    target?: HTMLElement;
    /**
 * Tooltip position relative to the target
 * @default 'bottom'
 */
    position?: TooltipPosition | string;
    /**
 * Tooltip variant that determines visual styling
 * @default 'default'
 */
    variant?: TooltipVariant | string;
    /**
 * Whether the tooltip is initially visible
 * @default false
 */
    visible?: boolean;
    /**
 * Show delay in milliseconds
 * @default 300
 */
    showDelay?: number;
    /**
 * Hide delay in milliseconds
 * @default 100
 */
    hideDelay?: number;
    /**
 * Whether to show the tooltip on focus
 * @default true
 */
    showOnFocus?: boolean;
    /**
 * Whether to show the tooltip on hover
 * @default true
 */
    showOnHover?: boolean;
    /** Additional CSS classes to add to the tooltip */
    class?: string;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /** Optional z-index for the tooltip */
    zIndex?: number;
    /** `"top"` renders the tooltip in place, after its target, and shows it in the browser's top layer as a `popover="manual"` element: above every z-index, outside any clipping ancestor, and in the target's tree (a shadow root's included), so it takes that tree's styles. */
    layer?: "top";
}
/** Tooltip component interface */
export interface TooltipComponent {
    /** The tooltip's DOM element */
    element: HTMLElement;
    /** The tooltip's target element */
    target: HTMLElement | null;
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
    /**
 * Sets the tooltip text content
 * @param text
 */
    setText: (text: string) => TooltipComponent;
    /** Gets the tooltip text content */
    getText: () => string;
    /**
 * Sets the tooltip position
 * @param position
 */
    setPosition: (position: TooltipPosition) => TooltipComponent;
    /** Gets the current tooltip position */
    getPosition: () => TooltipPosition;
    /**
 * Sets the tooltip target element
 * @param target
 */
    setTarget: (target: HTMLElement) => TooltipComponent;
    /**
 * Shows the tooltip.
 * @param immediate
 */
    show: (immediate?: boolean) => TooltipComponent;
    /**
 * Hides the tooltip, after the hide delay and without an event; `hide(true)` hides it at once.
 * @param immediate
 */
    hide: (immediate?: boolean) => TooltipComponent;
    /** Checks if the tooltip is currently visible */
    isVisible: () => boolean;
    /** Updates the tooltip's position relative to its target */
    updatePosition: () => TooltipComponent;
    /** Destroys the tooltip component and cleans up resources */
    destroy: () => void;
}
