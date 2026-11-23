import { ElementComponent } from "../component.js";
/** Configuration for variant feature */
export interface VariantConfig {
    variant?: string;
    prefix?: string;
    componentName?: string;
}
/**
 * Adds a variant class to a component
 * @param config
 */
export declare const withVariant: <T extends VariantConfig & object>(config: T) => <C extends ElementComponent>(component: C) => C;
