// src/core/compose/features/events.ts
/**
 * @module core/compose/features
 */

import { getCleanup } from '../cleanup';
import { createEmitter, Emitter, EventCallback } from '../../state/emitter';
import { BaseComponent } from '../component';

/**
 * A component's events, by name: each one's handler. Without a map a
 * component takes any event name, and its handlers get `unknown` payloads.
 */
export type EventMap<E> = { [K in keyof E]: EventCallback };

/** The map of a component that does not name its events. */
export type AnyEvents = Record<string, EventCallback>;

/**
 * Component with event capabilities
 */
export interface EventComponent<E extends EventMap<E> = AnyEvents> extends BaseComponent {
  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler
   * @returns Component instance for chaining
   */
  // `this`, not EventComponent: these return the component they were
  // called on, which by then carries every feature applied so far.
  // Declared as the narrow interface, chaining threw the rest away.
  on<K extends keyof E & string>(event: K, handler: E[K]): this;
  
  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Event handler
   * @returns Component instance for chaining
   */
  off<K extends keyof E & string>(event: K, handler: E[K]): this;
  
  /**
   * Emit an event
   * @param event - Event name
   * @param data - Event data
   * @returns Component instance for chaining
   */
  emit(event: string, data?: unknown): this;
}

/**
 * Adds event handling capabilities to a component
 * Returns event system ready to use immediately
 *
 * `withEvents<Events>()` names the component's events (FLO-295): `on` and
 * `off` then check each name and its handler's payload.
 *
 * @returns Function that enhances a component with event capabilities
 */
export const withEvents = <E extends EventMap<E> = AnyEvents>() =>
  <T extends BaseComponent>(component: T): T & EventComponent<E> => {
    const emitter: Emitter = createEmitter();
    const resources = getCleanup(component);
    resources.add(() => emitter.clear());

    return {
      ...component,
      on<K extends keyof E & string>(event: K, handler: E[K]) {
        if (!resources.destroyed) emitter.on(event, handler);
        return this;
      },

      off<K extends keyof E & string>(event: K, handler: E[K]) {
        emitter.off(event, handler);
        return this;
      },

      emit(event: string, data?: unknown) {
        emitter.emit(event, data);
        return this;
      }
    };
  };