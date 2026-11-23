import { BaseComponent, ElementComponent } from "../component.js";
/** Event manager interface */
export interface EnhancedEventManager {
    /** Add an event listener */
    on: (event: string, handler: Function) => EnhancedEventManager;
    /** Remove an event listener */
    off: (event: string, handler: Function) => EnhancedEventManager;
    /** Add multiple event listeners at once */
    addListeners: (listeners: Record<string, Function>) => EnhancedEventManager;
    /** Remove multiple event listeners at once */
    removeListeners: (listeners: Record<string, Function>) => EnhancedEventManager;
    /** One-time event handler */
    once: (event: string, handler: Function) => EnhancedEventManager;
    /** Clean up all event listeners */
    destroy: () => void;
}
/** Component with enhanced event capabilities */
export interface EnhancedEventComponent extends BaseComponent {
    events: EnhancedEventManager;
    on(event: string, handler: Function): this;
    off(event: string, handler: Function): this;
}
/**
 * Adds enhanced event handling capabilities to a component
 * @param target
 */
export declare const withEvents: (target?: HTMLElement) => <C extends ElementComponent>(component: C) => C & EnhancedEventComponent;
