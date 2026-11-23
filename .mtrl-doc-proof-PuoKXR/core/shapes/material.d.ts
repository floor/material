import { RoundedPolygon, polygonMaxRadius } from "./polygon.js";
/** Circle */
export declare const shapeCircle: () => RoundedPolygon;
/** A rounded square */
export declare const shapeSquare: () => RoundedPolygon;
/** A slanted square */
export declare const shapeSlanted: () => RoundedPolygon;
/** An arch */
export declare const shapeArch: () => RoundedPolygon;
/** A fan */
export declare const shapeFan: () => RoundedPolygon;
/** An arrow */
export declare const shapeArrow: () => RoundedPolygon;
/** A semicircle */
export declare const shapeSemiCircle: () => RoundedPolygon;
/** An oval */
export declare const shapeOval: () => RoundedPolygon;
/** A pill */
export declare const shapePill: () => RoundedPolygon;
/** A triangle */
export declare const shapeTriangle: () => RoundedPolygon;
/** A diamond */
export declare const shapeDiamond: () => RoundedPolygon;
/** A clam shell */
export declare const shapeClamShell: () => RoundedPolygon;
/** A pentagon */
export declare const shapePentagon: () => RoundedPolygon;
/** A gem */
export declare const shapeGem: () => RoundedPolygon;
/** A sunny shape: an 8-point star */
export declare const shapeSunny: () => RoundedPolygon;
/** A very sunny shape */
export declare const shapeVerySunny: () => RoundedPolygon;
/** A 4-sided cookie */
export declare const shapeCookie4Sided: () => RoundedPolygon;
/** A 6-sided cookie */
export declare const shapeCookie6Sided: () => RoundedPolygon;
/** A 7-sided cookie */
export declare const shapeCookie7Sided: () => RoundedPolygon;
/** A 9-sided cookie */
export declare const shapeCookie9Sided: () => RoundedPolygon;
/** A 12-sided cookie */
export declare const shapeCookie12Sided: () => RoundedPolygon;
/** A ghost-ish shape */
export declare const shapeGhostish: () => RoundedPolygon;
/** A 4-leaf clover */
export declare const shapeClover4Leaf: () => RoundedPolygon;
/** An 8-leaf clover */
export declare const shapeClover8Leaf: () => RoundedPolygon;
/** A burst */
export declare const shapeBurst: () => RoundedPolygon;
/** A soft burst */
export declare const shapeSoftBurst: () => RoundedPolygon;
/** A boom */
export declare const shapeBoom: () => RoundedPolygon;
/** A soft boom */
export declare const shapeSoftBoom: () => RoundedPolygon;
/** A flower */
export declare const shapeFlower: () => RoundedPolygon;
/** A puffy shape */
export declare const shapePuffy: () => RoundedPolygon;
/** A puffy diamond */
export declare const shapePuffyDiamond: () => RoundedPolygon;
/** A pixelated circle */
export declare const shapePixelCircle: () => RoundedPolygon;
/** A pixelated triangle */
export declare const shapePixelTriangle: () => RoundedPolygon;
/** A bun */
export declare const shapeBun: () => RoundedPolygon;
/** A heart */
export declare const shapeHeart: () => RoundedPolygon;
declare const byName: {
    circle: () => RoundedPolygon;
    square: () => RoundedPolygon;
    slanted: () => RoundedPolygon;
    arch: () => RoundedPolygon;
    fan: () => RoundedPolygon;
    arrow: () => RoundedPolygon;
    semiCircle: () => RoundedPolygon;
    oval: () => RoundedPolygon;
    pill: () => RoundedPolygon;
    triangle: () => RoundedPolygon;
    diamond: () => RoundedPolygon;
    clamShell: () => RoundedPolygon;
    pentagon: () => RoundedPolygon;
    gem: () => RoundedPolygon;
    sunny: () => RoundedPolygon;
    verySunny: () => RoundedPolygon;
    cookie4Sided: () => RoundedPolygon;
    cookie6Sided: () => RoundedPolygon;
    cookie7Sided: () => RoundedPolygon;
    cookie9Sided: () => RoundedPolygon;
    cookie12Sided: () => RoundedPolygon;
    ghostish: () => RoundedPolygon;
    clover4Leaf: () => RoundedPolygon;
    clover8Leaf: () => RoundedPolygon;
    burst: () => RoundedPolygon;
    softBurst: () => RoundedPolygon;
    boom: () => RoundedPolygon;
    softBoom: () => RoundedPolygon;
    flower: () => RoundedPolygon;
    puffy: () => RoundedPolygon;
    puffyDiamond: () => RoundedPolygon;
    pixelCircle: () => RoundedPolygon;
    pixelTriangle: () => RoundedPolygon;
    bun: () => RoundedPolygon;
    heart: () => RoundedPolygon;
};
/** Names of the Material shapes: Compose's, camelCased. */
export type MaterialShapeName = keyof typeof byName;
/** A Material shape by name, normalised into the unit square. */
export declare const materialShape: (name: MaterialShapeName) => RoundedPolygon;
/** A polygon's outline as an SVG path ("M … C … Z"), scaled by `size`: a normalised shape fills a `size` × `size` box. */
export declare const polygonPath: (polygon: RoundedPolygon, size?: number) => string;
/** A Material shape as an SVG path in a `size` × `size` box. */
export declare const materialShapePath: (name: MaterialShapeName, size?: number) => string;
/** A shape's outline as radii at evenly spaced angles around its centre */
export interface RadialProfile {
    /** Radius at angle i * 2π / radii.length, clockwise from the positive x axis on a y-down canvas */
    radii: Float32Array;
    /** The area centroid the radii are measured from */
    centerX: number;
    centerY: number;
    /** The largest radius, for fitting the shape into a circle */
    maxRadius: number;
}
/** radialProfile without its star-shape check, for callers whose shapes are known to be star-shaped: the loading indicator's, which the tests check. */
export declare const sampleProfile: (polygon: RoundedPolygon, samples?: number, stepsPerCubic?: number) => RadialProfile;
/** Samples the outline at `samples` angles around the shape's area centroid. */
export declare const radialProfile: (polygon: RoundedPolygon, samples?: number, stepsPerCubic?: number) => RadialProfile;
export { polygonMaxRadius };
