import { ElementComponent } from "../component.js";
/** Configuration for size feature */
export interface SizeConfig {
    size?: string;
    prefix?: string;
    componentName?: string;
}
/**
 * Adds a size class to a component
 * @param config
 */
export declare const withSize: <T extends SizeConfig & object>(config: T) => <C extends ElementComponent>(component: C) => C;
