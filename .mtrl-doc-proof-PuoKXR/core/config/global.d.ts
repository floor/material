/** Lightweight Global Configuration System for mtrl This system allows setting default configurations for all components without adding complexity or performance overhead. */
export interface ComponentConfigMap {
}
/**
 * Sets global defaults for a specific component
 * @param component
 * @param config
 */
export declare function setComponentDefaults<K extends keyof ComponentConfigMap>(component: K, config: ComponentConfigMap[K]): void;
/**
 * Gets global defaults for a component
 * @param component
 */
export declare function getComponentDefaults<K extends keyof ComponentConfigMap>(component: K): ComponentConfigMap[K];
/**
 * Sets global defaults for multiple components at once
 * @param configs
 */
export declare function setGlobalDefaults(configs: Partial<ComponentConfigMap>): void;
/** Clears all global defaults */
export declare function clearGlobalDefaults(): void;
