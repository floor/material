import { BaseComponent, ElementComponent } from "../component.js";
/** Configuration for throttled event handlers */
export interface ThrottleConfig {
    /** Event handlers with throttle settings */
    throttledEvents?: Record<string, {
        handler: (event: Event) => void;
        wait: number;
        options?: {
            leading?: boolean;
            trailing?: boolean;
        };
    }>;
}
/** Component with throttled event capabilities */
export interface ThrottleComponent extends BaseComponent {
    /**
 * Adds a throttled event listener
 * @param event
 * @param handler
 * @param wait
 * @param options
 */
    addThrottledEvent: (event: string, handler: (event: Event) => void, wait: number, options?: {
        leading?: boolean;
        trailing?: boolean;
    }) => ThrottleComponent;
    /**
 * Removes a throttled event listener
 * @param event
 */
    removeThrottledEvent: (event: string) => ThrottleComponent;
}
/**
 * Adds throttled event handling capabilities to a component
 * @param config
 */
export declare const withThrottle: <T extends ThrottleConfig & object>(config?: T) => <C extends ElementComponent>(component: C) => C & ThrottleComponent;
export default withThrottle;
