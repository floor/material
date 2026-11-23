/** A cubic Bézier: anchor 0, control 0, control 1, anchor 1 */
export type Cubic = readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
/** A 2D point */
export type Point = readonly [
    number,
    number
];
/** Below this distance two points are the same point */
export declare const DISTANCE_EPSILON = 0.0001;
export declare const lerp: (start: number, stop: number, fraction: number) => number;
export declare const distance: (x: number, y: number) => number;
/** Unit vector in the direction of (x, y) */
export declare const direction: (x: number, y: number) => Point;
export declare const rotate90: ([x, y]: Point) => Point;
export declare const dot: (a: Point, b: Point) => number;
/** A straight segment expressed as a cubic */
export declare const straightLine: (x0: number, y0: number, x1: number, y1: number) => Cubic;
/** A circular arc from (x0, y0) to (x1, y1) around (centerX, centerY), approximated by one cubic; the arc must be under 180 degrees. */
export declare const circularArc: (centerX: number, centerY: number, x0: number, y0: number, x1: number, y1: number) => Cubic;
export declare const pointOnCurve: (c: Cubic, t: number) => Point;
/** Splits a cubic at `t` into two that together trace it (de Casteljau) */
export declare const splitCubic: (c: Cubic, t: number) => [
    Cubic,
    Cubic
];
export declare const reverseCubic: (c: Cubic) => Cubic;
export declare const zeroLength: (c: Cubic) => boolean;
export type PointTransformer = (x: number, y: number) => Point;
export declare const transformCubic: (c: Cubic, f: PointTransformer) => Cubic;
/** The bounding box of a cubic as [left, top, right, bottom]. */
export declare const cubicBounds: (c: Cubic) => [
    number,
    number,
    number,
    number
];
