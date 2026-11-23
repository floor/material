import type { EventCallback } from "./emitter.js";
/** Event manager interface for handling component events */
export interface EventManagerState {
    /**
 * Adds an event listener
 * @param event
 * @param handler
 */
    on: (event: string, handler: EventCallback) => EventManagerState;
    /**
 * Removes an event listener
 * @param event
 * @param handler
 */
    off: (event: string, handler: EventCallback) => EventManagerState;
    /** Removes all event listeners and cleans up */
    destroy: () => void;
    /** Gets all active handlers */
    getHandlers: () => Map<EventCallback, string>;
}
/**
 * Creates an event manager for a component
 * @param element
 */
export declare const createEventManager: (element: HTMLElement) => EventManagerState;
