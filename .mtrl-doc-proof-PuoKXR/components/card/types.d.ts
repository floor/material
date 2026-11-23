import type { TouchEvents } from "../../core/utils/mobile.js";
import type { ButtonConfig as BaseButtonConfig } from "../button/types.js";
import type { ForwardedEventPayload } from "../../core/dom/index.js";
/** Card variant types following Material Design 3 guidelines. */
export type CardVariant = 'elevated' | 'filled' | 'outlined';
/** Card elevation levels in Material Design 3. */
export type CardElevationLevel = 0 | 1 | 2 | 4;
/** Button configuration interface for buttons shorthand. */
export interface ButtonConfig extends Omit<BaseButtonConfig, "variant"> {
    /** Button text content */
    text?: string;
    /** Button variant (text, outlined, filled, etc.) */
    variant?: string;
    /** Button icon HTML content */
    icon?: string;
}
/** Card configuration interface defining all possible card options. */
export interface CardConfig {
    /** Card variant type (elevated, filled, outlined) */
    variant?: CardVariant | string;
    /** The hover and press states and their elevation, for a card the app makes interactive itself. */
    interactive?: boolean;
    /** Whether the card should take full width */
    fullWidth?: boolean;
    /** A card that acts on activation: a button (role, tab stop, Enter and Space click it) with the ripple. */
    clickable?: boolean;
    /** Opt in so a clickable card with nested actions is an article container, not a button. */
    promoteChildActions?: boolean;
    /** Whether the card is draggable */
    draggable?: boolean;
    /** Additional CSS class(es) */
    class?: string;
    /** Header configuration */
    headerConfig?: CardHeaderConfig;
    /** Content configuration */
    contentConfig?: CardContentConfig;
    /** Actions configuration */
    actionsConfig?: CardActionsConfig;
    /** Media configuration */
    mediaConfig?: CardMediaConfig;
    /** ARIA attributes for accessibility */
    aria?: CardAriaAttributes;
    /** Inline header configuration (alternative to headerConfig) */
    header?: CardHeaderConfig;
    /** Inline content configuration (alternative to contentConfig) */
    content?: CardContentConfig;
    /** Inline media configuration (alternative to mediaConfig) */
    media?: CardMediaConfig;
    /** Inline actions configuration (alternative to actionsConfig) */
    actions?: CardActionsConfig;
    /** Simple buttons array for actions (will be converted to actionsConfig) */
    buttons?: ButtonConfig[];
    /** Internal component name */
    componentName?: string;
    /** CSS class prefix */
    prefix?: string;
    /** Callback executed after component creation */
    afterCreation?: (component: BaseComponent) => void;
}
/** ARIA attributes for card accessibility. */
export interface CardAriaAttributes {
    /** ARIA label */
    label?: string;
    /** ARIA labelledby */
    labelledby?: string;
    /** ARIA describedby */
    describedby?: string;
    /** ARIA role (default: 'button' for a clickable card, 'article' for any other) */
    role?: string;
    /** Additional ARIA attributes as key-value pairs */
    [key: string]: string | undefined;
}
/** Card header configuration. */
export interface CardHeaderConfig {
    /** Header title text */
    title?: string;
    /** Header subtitle text */
    subtitle?: string;
    /** Avatar element or HTML string */
    avatar?: HTMLElement | string;
    /** Action element or HTML string */
    action?: HTMLElement | string;
    /** Additional CSS class(es) */
    class?: string;
}
/** Card content configuration. */
export interface CardContentConfig {
    /** Text content */
    text?: string;
    /** HTML content */
    html?: string;
    /** Child elements */
    children?: HTMLElement[];
    /** Whether to add padding (true by default) */
    padding?: boolean;
    /** Additional CSS class(es) */
    class?: string;
}
/** Card actions configuration. */
export interface CardActionsConfig {
    /** Action elements */
    actions?: HTMLElement[];
    /** Whether actions should be full-bleed */
    fullBleed?: boolean;
    /** Whether actions should be stacked vertically */
    vertical?: boolean;
    /** Horizontal alignment */
    align?: 'start' | 'center' | 'end' | 'space-between';
    /** Additional CSS class(es) */
    class?: string;
}
/** Card media configuration. */
export interface CardMediaConfig {
    /** Image source URL */
    src?: string;
    /** Image alt text (required for accessibility) */
    alt?: string;
    /** Custom element instead of image */
    element?: HTMLElement;
    /** Aspect ratio */
    aspectRatio?: '16:9' | '4:3' | '1:1' | string;
    /** Whether media should use object-fit: contain */
    contain?: boolean;
    /** Additional CSS class(es) */
    class?: string;
    /** Position of the media in the card */
    position?: 'top' | 'bottom';
}
/** Base component interface. */
export interface BaseComponent {
    /** The DOM element */
    element: HTMLElement;
    /** Get class name with prefix */
    getClass: (name: string) => string;
    /** Get modifier class */
    getModifierClass: (base: string, modifier: string) => string;
    /** Get element class */
    getElementClass: (base: string, element: string) => string;
    /** Add CSS class(es) */
    addClass: (...classes: string[]) => BaseComponent;
    /** Emit one of the card's own events ({@link CardEvents}), with its payload: the names and payloads `on` and `off` accept. */
    emit?: <K extends keyof CardEvents>(event: K, payload: Parameters<CardEvents[K]>[0]) => void;
    /** Component configuration */
    config: CardComponentConfig;
    /** Touch state for touch interactions */
    touchState?: TouchState;
    /** Update touch state */
    updateTouchState?: (event: TouchEvent | MouseEvent, status: 'start' | 'end') => void;
    /** Component lifecycle methods */
    lifecycle?: ComponentLifecycle;
}
/** Touch state interface for touch interactions. */
export interface TouchState {
    /** Timestamp when touch started */
    startTime: number;
    /** Starting position */
    startPosition: {
        x: number;
        y: number;
    };
    /** Whether touch is active */
    isTouching: boolean;
    /** Current touch target */
    activeTarget: EventTarget | null;
}
/** Component lifecycle interface. */
export interface ComponentLifecycle {
    /** Called when component is mounted to DOM */
    mount?: () => void;
    /** Called when component is updated */
    update?: () => void;
    /** Called when component is destroyed */
    destroy: () => void;
}
/** Card component configuration. */
export interface CardComponentConfig extends CardConfig {
    /** Component name */
    componentName: string;
    /** CSS class prefix */
    prefix: string;
}
/** The card's events. */
export interface CardEvents extends TouchEvents {
    /** Presentation state after expanding or collapsing. */
    expandedChanged: (payload: {
        expanded: boolean;
    }) => void;
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    mouseenter: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    mouseleave: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    keydown: (payload: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
    focus: (payload: ForwardedEventPayload<FocusEvent, HTMLElement>) => void;
    blur: (payload: ForwardedEventPayload<FocusEvent, HTMLElement>) => void;
    dragstart: (payload: {
        event: DragEvent;
    }) => void;
    dragend: (payload: {
        event: DragEvent;
    }) => void;
}
/** Card component interface with methods. */
export interface CardComponent extends BaseComponent {
    /** Subscribes to one of the card's events */
    on: <K extends keyof CardEvents>(event: K, handler: CardEvents[K]) => CardComponent;
    /** Removes a handler added with `on` */
    off: <K extends keyof CardEvents>(event: K, handler: CardEvents[K]) => CardComponent;
    /**
 * Adds content to the card.
 * @param contentElement
 */
    addContent: (contentElement: HTMLElement) => CardComponent;
    /**
 * Sets the card header.
 * @param headerElement
 */
    setHeader: (headerElement: HTMLElement) => CardComponent;
    /**
 * Adds media to the card.
 * @param mediaElement
 * @param position
 */
    addMedia: (mediaElement: HTMLElement, position?: 'top' | 'bottom') => CardComponent;
    /**
 * Sets the card actions section.
 * @param actionsElement
 */
    setActions: (actionsElement: HTMLElement) => CardComponent;
    /**
 * Makes the card draggable.
 * @param dragStartCallback
 */
    makeDraggable: (dragStartCallback?: (event: DragEvent) => void) => CardComponent;
    /** Sets focus to the card. */
    focus: () => CardComponent;
    /** Destroys the card component and removes event listeners. */
    destroy: () => void;
}
/** Loading feature interface. */
export interface LoadingFeature {
    /** Check if loading state is active */
    isLoading: () => boolean;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
}
/** Expandable feature interface. */
export interface ExpandableFeature {
    /** Check if expanded state is active */
    isExpanded: () => boolean;
    /** Set expanded state */
    setExpanded: (expanded: boolean) => void;
    /** Toggle expanded state */
    toggleExpanded: () => void;
}
/** Swipeable feature interface. */
export interface SwipeableFeature {
    /** Reset swipe position */
    reset: () => void;
}
/** API options interface. */
export interface ApiOptions {
    /** Lifecycle methods */
    lifecycle: {
        /** Destroy callback */
        destroy: () => void;
    };
    /** The resolved configuration the card was created from */
    config: CardComponentConfig;
}
/** Registers CardConfig with the global defaults map, so `setComponentDefaults("card", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        card?: Partial<CardConfig>;
    }
}
