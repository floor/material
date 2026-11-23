import { BaseComponent, ElementComponent } from "../component.js";
/** Available position values */
export declare enum POSITIONS {
    LEFT = "left",
    RIGHT = "right",
    TOP = "top",
    BOTTOM = "bottom",
    START = "start",
    END = "end",
    CENTER = "center"
}
/** Configuration for position feature */
export interface PositionConfig {
    position?: string;
    prefix?: string;
    componentName?: string;
}
/** Position manager interface */
export interface PositionManager {
    /**
 * Sets the component's position
 * @param newPosition
 */
    setPosition: (newPosition: string) => PositionManager;
    /** Gets the current position */
    getPosition: () => string;
}
/** Component with position capabilities */
export interface PositionComponent extends BaseComponent {
    position: PositionManager;
}
/**
 * Adds positioning functionality to a component
 * @param config
 */
export declare const withPosition: <T extends PositionConfig & object>(config: T) => <C extends ElementComponent>(component: C) => C & PositionComponent;
