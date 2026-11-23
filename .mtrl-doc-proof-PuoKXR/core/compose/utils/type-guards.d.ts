/** Utility functions for type checking component capabilities */
import { ElementComponent } from "../component.js";
/** Interface for components with lifecycle */
export interface ComponentWithLifecycle extends ElementComponent {
    lifecycle: {
        destroy: () => void;
        [key: string]: unknown;
    };
}
/** Interface for components with emit method */
export interface ComponentWithEmit extends ElementComponent {
    emit: (event: string, data: unknown) => unknown;
}
/** Type guard to check if component has lifecycle */
export declare function hasLifecycle(component: object): component is ComponentWithLifecycle;
/** Type guard to check if component has emit method */
export declare function hasEmit(component: object): component is ComponentWithEmit;
