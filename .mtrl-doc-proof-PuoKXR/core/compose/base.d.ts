/** Configuration for component creation */
export interface ComponentConfig {
    [key: string]: unknown;
}
/** Basic component interface */
export interface Component {
    /** Component element */
    element: HTMLElement | null;
    /** Component configuration */
    config: ComponentConfig;
    /** Setup method */
    setup: () => Component;
}
/**
 * Creates a basic component with minimal structure
 * @param config
 */
export declare const createComponent: (config?: object) => Component;
