/** An event handler. */
export type EventCallback = {
    handler(...args: unknown[]): void;
}["handler"];
/** Interface for the event emitter */
export interface Emitter {
    /**
 * Subscribe to an event
 * @param event
 * @param callback
 */
    on(event: string, callback: EventCallback): () => void;
    /**
 * Unsubscribe from an event
 * @param event
 * @param callback
 */
    off(event: string, callback: EventCallback): void;
    /**
 * Emit an event
 * @param event
 * @param args
 */
    emit(event: string, ...args: unknown[]): void;
    /** Clear all event listeners */
    clear(): void;
}
/** Creates an event emitter with subscription management */
export declare const createEmitter: () => Emitter;
