// src/core/shapes/index.ts
//
// Rounded polygons and the Material 3 shapes (a port of the geometry in
// androidx.graphics.shapes and Compose Material 3 MaterialShapes).

export type { Cubic, Point, PointTransformer } from './cubic';
export { straightLine, circularArc, pointOnCurve, cubicBounds, splitCubic } from './cubic';
export type { CornerRounding, RoundedPolygon } from './polygon';
export {
  UNROUNDED,
  roundedPolygon,
  rectangle,
  regularPolygon,
  circle,
  star,
  transformPolygon,
  rotatePolygon,
  scalePolygon,
  polygonBounds,
  polygonMaxRadius,
  normalizePolygon,
} from './polygon';
export type { MaterialShapeName, RadialProfile } from './material';
export {
  materialShape,
  materialShapePath,
  polygonPath,
  radialProfile,
  shapeCircle,
  shapeSquare,
  shapeSlanted,
  shapeArch,
  shapeFan,
  shapeArrow,
  shapeSemiCircle,
  shapeOval,
  shapePill,
  shapeTriangle,
  shapeDiamond,
  shapeClamShell,
  shapePentagon,
  shapeGem,
  shapeSunny,
  shapeVerySunny,
  shapeCookie4Sided,
  shapeCookie6Sided,
  shapeCookie7Sided,
  shapeCookie9Sided,
  shapeCookie12Sided,
  shapeGhostish,
  shapeClover4Leaf,
  shapeClover8Leaf,
  shapeBurst,
  shapeSoftBurst,
  shapeBoom,
  shapeSoftBoom,
  shapeFlower,
  shapePuffy,
  shapePuffyDiamond,
  shapePixelCircle,
  shapePixelTriangle,
  shapeBun,
  shapeHeart,
} from './material';
