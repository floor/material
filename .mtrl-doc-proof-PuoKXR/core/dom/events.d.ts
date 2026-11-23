/** Event manager interface for handling DOM events */
export interface EventManager {
    /**
 * Add an event listener with options
 * @param event
 * @param handler
 * @param options
 */
    on: <T extends Event>(event: string, handler: (e: T) => void, options?: AddEventListenerOptions) => EventManager;
    /**
 * Remove an event listener
 * @param event
 * @param handler
 */
    off: <T extends Event>(event: string, handler: (e: T) => void) => EventManager;
    /** Temporarily disable all event listeners */
    pause: () => EventManager;
    /** Re-enable all event listeners */
    resume: () => EventManager;
    /** Remove all event listeners and clean up */
    destroy: () => void;
    /** Get all active handlers */
    getHandlers: () => Map<string, HandlerInfo>;
    /**
 * Check if a specific handler exists
 * @param event
 * @param handler
 */
    hasHandler: <T extends Event>(event: string, handler: (e: T) => void) => boolean;
}
/** Handler information */
interface HandlerInfo {
    original: EventListener;
    enhanced: EventListener;
    event: string;
    options: AddEventListenerOptions;
}
/**
 * Creates an event manager to handle DOM events with enhanced functionality.
 * @param element
 */
export declare const createEventManager: (element: HTMLElement) => EventManager;
export {};
