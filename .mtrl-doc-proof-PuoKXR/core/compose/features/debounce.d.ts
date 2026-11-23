import { BaseComponent, ElementComponent } from "../component.js";
/** Interface for components with lifecycle */
export interface ComponentWithLifecycle extends ElementComponent {
    lifecycle: {
        destroy: () => void;
        [key: string]: unknown;
    };
}
/** Configuration for debounced event handlers */
export interface DebounceConfig {
    /** Event handlers with debounce settings */
    debouncedEvents?: Record<string, {
        handler: (event: Event) => void;
        wait: number;
        options?: {
            leading?: boolean;
            maxWait?: number;
        };
    }>;
}
/** Component with debounced event capabilities */
export interface DebounceComponent extends BaseComponent {
    /**
 * Adds a debounced event listener
 * @param event
 * @param handler
 * @param wait
 * @param options
 */
    addDebouncedEvent: (event: string, handler: (event: Event) => void, wait: number, options?: {
        leading?: boolean;
        maxWait?: number;
    }) => DebounceComponent;
    /**
 * Removes a debounced event listener
 * @param event
 */
    removeDebouncedEvent: (event: string) => DebounceComponent;
}
/**
 * Adds debounced event handling capabilities to a component
 * @param config
 */
export declare const withDebounce: <T extends DebounceConfig & object>(config?: T) => <C extends ElementComponent>(component: C) => C & DebounceComponent;
export default withDebounce;
