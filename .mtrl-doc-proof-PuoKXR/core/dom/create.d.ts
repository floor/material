/** Event handler function type */
export type EventHandler = (event: Event) => void;
/** Element type that can be either HTMLElement or SVGElement */
export type DOMElement = HTMLElement | SVGElement;
/** Component context passed to created elements for event forwarding */
export interface ElementContext {
    /** Emits forwarded events */
    emit?(event: string, data: ForwardedEventPayload): void;
    /** Subscribes to events */
    on?(event: string, handler: (...args: unknown[]) => void): unknown;
}
/** Event condition type */
export type EventCondition = boolean | {
    condition(context: ElementContext & {
        element: DOMElement;
    }, event: Event): boolean;
}["condition"];
/** Options for element creation with comprehensive configuration */
export interface CreateElementOptions {
    /** HTML tag name */
    tag?: string;
    /** Container to append element to */
    container?: HTMLElement | null;
    /** Inner HTML content */
    html?: string;
    /** Text content */
    text?: string;
    /** Element ID */
    id?: string;
    /** Form element name */
    name?: string;
    /** Element title (native browser tooltip on hover) */
    title?: string;
    /** Keyboard navigation order (-1 to remove from tab order, 0+ for custom order) */
    tabIndex?: number;
    /** Inline styles (string or object) */
    /** Inline styles. */
    style?: Partial<CSSStyleDeclaration>;
    /** Dataset attributes (e.g., { name: 'value' } → data-name="value") */
    data?: Record<string, string>;
    /** ARIA role (e.g., 'button', 'menuitem', 'dialog') */
    role?: string;
    /** Accessible label for screen readers */
    ariaLabel?: string;
    /** ID of element that describes this element */
    ariaDescribedBy?: string;
    /** ID of element that labels this element */
    ariaLabelledBy?: string;
    /** Hide from screen readers */
    ariaHidden?: boolean;
    /** CSS classes (will be automatically prefixed with 'mtrl-') - alias for className */
    class?: string | string[];
    /** CSS classes (will be automatically prefixed with 'mtrl-') - alias for class */
    className?: string | string[];
    /** HTML attributes */
    attributes?: object;
    /** Events to forward when component has emit method */
    forwardEvents?: Record<string, EventCondition>;
    /** Callback after element creation */
    onCreate?(element: HTMLElement, context?: ElementContext): void;
    /** Component context */
    context?: ElementContext & object;
}
/** Options for SVG element creation */
export interface CreateSVGElementOptions extends Omit<CreateElementOptions, "container" | "onCreate"> {
    container?: DOMElement | null;
    onCreate?(element: SVGElement, context?: ElementContext): void;
}
/** Event handler storage */
export interface EventHandlerStorage {
    [eventName: string]: EventHandler;
}
/** What `forwardEvents` hands the component's emitter. */
export interface ForwardedEventPayload<E extends Event = Event, TElement extends DOMElement = DOMElement> {
    /** The DOM event that triggered the forward. */
    event: E;
    /** The element the listener is attached to, which is the component root. */
    element: TElement;
    /** The same DOM event as `event`. */
    originalEvent: E;
}
/**
 * Create an HTML element with comprehensive options and optimizations
 * @param options
 */
export declare const createElement: (options?: CreateElementOptions) => HTMLElement;
/**
 * Create an SVG element
 * @param options
 */
export declare const createSVGElement: (options?: CreateSVGElementOptions) => SVGElement;
/**
 * Remove event handlers from an element
 * @param element
 */
export declare const removeEventHandlers: (element: HTMLElement | SVGElement) => void;
declare global {
    interface HTMLElement {
        __eventHandlers?: EventHandlerStorage;
    }
    interface SVGElement {
        __eventHandlers?: EventHandlerStorage;
    }
}
