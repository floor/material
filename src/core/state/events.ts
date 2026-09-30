// src/core/state/events.ts

import type { EventCallback } from "./emitter";

/**
 * Event manager interface for handling component events
 */
export interface EventManagerState {
  /**
   * Adds an event listener
   * @param event - Event name
   * @param handler - Event handler
   * @returns EventManagerState instance for chaining
   */
  on: (event: string, handler: EventCallback) => EventManagerState;
  
  /**
   * Removes an event listener
   * @param event - Event name
   * @param handler - Event handler
   * @returns EventManagerState instance for chaining
   */
  off: (event: string, handler: EventCallback) => EventManagerState;
  
  /**
   * Removes all event listeners and cleans up
   */
  destroy: () => void;
  
  /**
   * Gets all active handlers
   * @returns Map of event names to handlers
   */
  getHandlers: () => Map<EventCallback, string>;
}

/**
 * Creates an event manager for a component
 * Simple event handling mechanism for components
 * 
 * @param element - Component's DOM element
 * @returns Event manager interface
 */
export const createEventManager = (element: HTMLElement): EventManagerState => {
  const handlers = new Map<string, Set<EventCallback>>();

  return {
    /**
     * Adds an event listener
     * @param event - Event name
     * @param handler - Event handler
     * @returns EventManagerState instance for chaining
     */
    on(event: string, handler: EventCallback): EventManagerState {
      element.addEventListener(event, handler as EventListener);
      let callbacks = handlers.get(event);
      if (!callbacks) handlers.set(event, callbacks = new Set());
      callbacks.add(handler);
      return this;
    },

    /**
     * Removes an event listener
     * @param event - Event name
     * @param handler - Event handler
     * @returns EventManagerState instance for chaining
     */
    off(event: string, handler: EventCallback): EventManagerState {
      element.removeEventListener(event, handler as EventListener);
      const callbacks = handlers.get(event);
      callbacks?.delete(handler);
      if (!callbacks?.size) handlers.delete(event);
      return this;
    },

    /**
     * Removes all event listeners and cleans up
     */
    destroy(): void {
      handlers.forEach((callbacks, event) => {
        callbacks.forEach(handler => element.removeEventListener(event, handler as EventListener));
      });
      handlers.clear();
    },

    /**
     * Gets all active handlers
     * @returns Map of handlers to event names
     */
    getHandlers(): Map<EventCallback, string> {
      // Preserve the legacy snapshot shape; cleanup tracks each event separately.
      const snapshot = new Map<EventCallback, string>();
      handlers.forEach((callbacks, event) => callbacks.forEach(handler => snapshot.set(handler, event)));
      return snapshot;
    }
  };
};