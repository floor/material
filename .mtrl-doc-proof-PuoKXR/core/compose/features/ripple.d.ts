import { BaseComponent, ElementComponent } from "../component.js";
import { LifecycleComponent } from "./lifecycle.js";
/** Ripple configuration interface */
export interface RippleConfig {
    /** How long, in milliseconds, a released wave lingers before it is removed */
    duration?: number;
}
/** Ripple controller interface */
export interface RippleController {
    /**
 * Mounts ripple effect to an element
 * @param element
 */
    mount: (element: HTMLElement) => void;
    /**
 * Unmounts ripple effect from an element
 * @param element
 */
    unmount: (element: HTMLElement) => void;
}
/** Configuration for ripple feature */
export interface RippleFeatureConfig {
    ripple?: boolean;
    rippleConfig?: RippleConfig;
}
/** Component with ripple capabilities */
export interface RippleComponent extends BaseComponent {
    ripple: RippleController;
}
export declare const createRipple: (config?: RippleConfig) => RippleController;
/**
 * Adds ripple effect functionality to a component
 * @param config
 */
export declare const withRipple: <T extends RippleFeatureConfig & object>(config: T) => <C extends ElementComponent & Partial<LifecycleComponent>>(component: C) => C & RippleComponent;
