import { ElementComponent } from "../component.js";
/** Configuration for style feature */
export interface StyleConfig {
    variant?: string;
    size?: string;
}
/**
 * Adds style classes to a component based on configuration
 * @param config
 */
export declare const withStyle: <T extends StyleConfig & object>(config?: T) => <C extends ElementComponent>(component: C) => C;
