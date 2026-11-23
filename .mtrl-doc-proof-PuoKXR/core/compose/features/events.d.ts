import { EventCallback } from "../../state/emitter.js";
import { BaseComponent } from "../component.js";
/** A component's events, by name: each one's handler. */
export type EventMap<E> = {
    [K in keyof E]: EventCallback;
};
/** The map of a component that does not name its events. */
export type AnyEvents = Record<string, EventCallback>;
/** Component with event capabilities */
export interface EventComponent<E extends EventMap<E> = AnyEvents> extends BaseComponent {
    /**
 * Subscribe to an event
 * @param event
 * @param handler
 */
    on<K extends keyof E & string>(event: K, handler: E[K]): this;
    /**
 * Unsubscribe from an event
 * @param event
 * @param handler
 */
    off<K extends keyof E & string>(event: K, handler: E[K]): this;
    /**
 * Emit an event
 * @param event
 * @param data
 */
    emit(event: string, data?: unknown): this;
}
/** Adds event handling capabilities to a component Returns event system ready to use immediately `withEvents<Events>()` names the component's events: `on` and `off` then check each name and its handler's payload. */
export declare const withEvents: <E extends EventMap<E> = AnyEvents>() => <T extends BaseComponent>(component: T) => T & EventComponent<E>;
