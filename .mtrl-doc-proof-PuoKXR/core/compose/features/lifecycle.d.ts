import { BaseComponent, ElementComponent } from "../component.js";
/** Component managers that can be passed to lifecycle */
export interface ComponentManagers {
    events?: {
        destroy: () => void;
    };
    text?: {
        getElement: () => HTMLElement | null;
    };
    icon?: {
        getElement: () => HTMLElement | null;
    };
    [key: string]: unknown;
}
/** Lifecycle methods interface */
export interface Lifecycle {
    /**
 * Registers a handler for mount event
 * @param handler
 */
    onMount: (handler: () => void) => () => void;
    /**
 * Registers a handler for unmount event
 * @param handler
 */
    onUnmount: (handler: () => void) => () => void;
    /** Mounts the component */
    mount: () => void;
    /** Unmounts the component */
    unmount: () => void;
    /** Checks if component is mounted */
    isMounted: () => boolean;
    /** Destroys the component */
    destroy: () => void;
}
/** Component with lifecycle capabilities */
export interface LifecycleComponent extends BaseComponent {
    lifecycle: Lifecycle;
}
/** Adds lifecycle management to a component */
export declare const withLifecycle: () => <T extends BaseComponent & Partial<Pick<ElementComponent, "element" | "destroy">>>(component: T) => T & LifecycleComponent;
