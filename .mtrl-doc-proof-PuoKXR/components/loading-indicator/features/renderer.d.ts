import { RadialProfile, MaterialShapeName } from "../../../core/shapes/index.js";
import { BaseComponent, LoadingIndicatorConfig } from "../types.js";
/** A frame: which morph, how far along it, and the rotation in degrees */
export interface Frame {
    /** Index of the shape the morph starts from */
    index: number;
    /** 0 at the shape, 1 at the next; may overshoot */
    progress: number;
    /** Clockwise rotation in degrees */
    rotation: number;
}
export interface Renderer {
    /** Draws one frame with the given shape sequence */
    draw: (shapes: readonly RadialProfile[], frame: Frame) => void;
    /** Resizes the canvas to the element's size */
    resize: (size: number) => void;
    /** Re-reads the indicator colour from the element's computed style */
    refreshColor: () => void;
    /** The last frame drawn, redrawn on resize and theme change */
    redraw: () => void;
    /** Profiles for a shape sequence, cached per name */
    profiles: (names: readonly MaterialShapeName[]) => RadialProfile[];
}
/**
 * Adds the canvas and the drawing routine
 * @param config
 */
export declare const withRenderer: (config: LoadingIndicatorConfig) => (component: BaseComponent) => BaseComponent;
