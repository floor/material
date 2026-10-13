// src/core/theme/shape.ts
/**
 * The shape scale's corner tokens, for a radius a component writes from
 * script: as the stylesheets read it, the token with the compiled
 * value as its fallback, so a theme's corners reach inline styles too.
 */

/** A step of M3's shape scale, as `$shape` in src/styles/abstract/_variables.scss names it. */
export type ShapeStep =
  | "none" | "extra-small" | "small" | "medium" | "large" | "large-increased"
  | "extra-large" | "extra-large-increased" | "extra-extra-large";

/** `var(--mtrl-sys-shape-corner-small, 8px)`: a step's token, its px the fallback. */
export const cornerToken = (step: ShapeStep, px: number, prefix = "mtrl"): string =>
  `var(--${prefix}-sys-shape-corner-${step}, ${px}px)`;
