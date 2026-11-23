import { BaseComponent, ElementComponent } from "../../core/compose/index.js";
/** The three slices of a divider, one per enhancer in features.ts. */
export interface DividerOrientation {
    /** Gets current orientation of the divider */
    getOrientation(): 'horizontal' | 'vertical';
    /**
 * Sets orientation of the divider Changes the divider's orientation between horizontal (default) and vertical.
 * @param orientation
 */
    setOrientation(orientation: 'horizontal' | 'vertical'): this;
}
/** The inset slice. */
export interface DividerInset {
    /** Gets current variant of the divider */
    getVariant(): 'full-width' | 'inset' | 'middle-inset';
    /**
 * Sets variant of the divider
 * @param variant
 */
    setVariant(variant: 'full-width' | 'inset' | 'middle-inset'): this;
    /**
 * Sets custom inset values for the divider Allows fine-grained control over inset spacing, overriding the default values applied by the variant.
 * @param insetStart
 * @param insetEnd
 */
    setInset(insetStart?: number, insetEnd?: number): this;
}
/** The style slice. */
export interface DividerStyle {
    /**
 * Sets thickness of the divider Changes the divider's thickness (height for horizontal, width for vertical).
 * @param thickness
 */
    setThickness(thickness: number): this;
    /**
 * Sets custom color for the divider By default, dividers use the 'outline-variant' color from the theme.
 * @param color
 */
    setColor(color: string): this;
}
/** Divider component interface Represents a Material Design 3 divider that separates content into distinct sections. */
export interface DividerComponent extends BaseComponent, ElementComponent, DividerOrientation, DividerInset, DividerStyle {
}
