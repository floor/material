import { Cubic, PointTransformer } from "./cubic.js";
/** How a vertex is rounded: the radius, and how much the curve is smoothed into the sides (0–1) */
export interface CornerRounding {
    radius: number;
    smoothing?: number;
}
export declare const UNROUNDED: CornerRounding;
/** A closed shape made of contiguous cubics */
export interface RoundedPolygon {
    cubics: Cubic[];
    centerX: number;
    centerY: number;
}
/** Builds a rounded polygon from a flat list of vertex coordinates [x0, y0, x1, y1, ...], a rounding for every vertex or one per vertex, and an optional centre (the vertices' centroid by default). */
export declare const roundedPolygon: (vertices: number[], rounding?: CornerRounding, perVertexRounding?: CornerRounding[], centerX?: number, centerY?: number) => RoundedPolygon;
/** A regular polygon, first vertex at angle 0 */
export declare const regularPolygon: (numVertices: number, radius?: number, centerX?: number, centerY?: number, rounding?: CornerRounding, perVertexRounding?: CornerRounding[]) => RoundedPolygon;
/** A circle approximated by a fully rounded polygon */
export declare const circle: (numVertices?: number, radius?: number, centerX?: number, centerY?: number) => RoundedPolygon;
/** A star with `numVerticesPerRadius` outer and inner vertices, outer first at angle 0 */
export declare const star: (numVerticesPerRadius: number, radius?: number, innerRadius?: number, rounding?: CornerRounding, innerRounding?: CornerRounding, perVertexRounding?: CornerRounding[], centerX?: number, centerY?: number) => RoundedPolygon;
/** A rectangle centred on (centerX, centerY), its first vertex at the bottom right (graphics-shapes rectangle) */
export declare const rectangle: (width?: number, height?: number, rounding?: CornerRounding, perVertexRounding?: CornerRounding[], centerX?: number, centerY?: number) => RoundedPolygon;
export declare const transformPolygon: (polygon: RoundedPolygon, f: PointTransformer) => RoundedPolygon;
/** Rotation about the origin, in degrees, positive clockwise on a y-down canvas */
export declare const rotatePolygon: (polygon: RoundedPolygon, degrees: number) => RoundedPolygon;
export declare const scalePolygon: (polygon: RoundedPolygon, sx: number, sy?: number) => RoundedPolygon;
/** Bounding box [left, top, right, bottom] from the hull of anchors and controls */
export declare const polygonBounds: (polygon: RoundedPolygon) => [
    number,
    number,
    number,
    number
];
/** The farthest any anchor or curve midpoint gets from the centre */
export declare const polygonMaxRadius: (polygon: RoundedPolygon) => number;
/** Fits the shape into the unit square, centred, keeping its aspect ratio */
export declare const normalizePolygon: (polygon: RoundedPolygon) => RoundedPolygon;
