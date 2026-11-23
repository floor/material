/** Canvas drawing utilities */
/**
 * Creates a rounded rectangle path
 * @param ctx
 * @param x
 * @param y
 * @param width
 * @param height
 * @param radius
 */
export declare const createRoundedRectPath: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number | [
    number,
    number,
    number,
    number
]) => void;
/**
 * Draws a filled rounded rectangle
 * @param ctx
 * @param x
 * @param y
 * @param width
 * @param height
 * @param radius
 * @param fillStyle
 */
export declare const fillRoundedRect: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number | [
    number,
    number,
    number,
    number
], fillStyle?: string | CanvasGradient | CanvasPattern) => void;
/**
 * Creates a clipping region with rounded corners
 * @param ctx
 * @param x
 * @param y
 * @param width
 * @param height
 * @param radius
 */
export declare const clipRoundedRect: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number | [
    number,
    number,
    number,
    number
]) => (() => void);
/**
 * Draws a rounded rectangle with different left and right radii
 * @param ctx
 * @param x
 * @param y
 * @param width
 * @param height
 * @param leftRadius
 * @param rightRadius
 * @param fillStyle
 */
export declare const fillRoundedRectLR: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, leftRadius: number, rightRadius: number, fillStyle?: string | CanvasGradient | CanvasPattern) => void;
/**
 * Clears a canvas with optional background color
 * @param ctx
 * @param width
 * @param height
 * @param backgroundColor
 */
export declare const clearCanvas: (ctx: CanvasRenderingContext2D, width: number, height: number, backgroundColor?: string) => void;
