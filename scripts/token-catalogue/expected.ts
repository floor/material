/**
 * scripts/token-catalogue/expected.ts
 *
 * The independent Material expectations: the values the browser check asserts
 * on the built stylesheets, transcribed from the retained source digests
 * (sources.ts) on the day they were read — never copied from the Sass maps or
 * regenerated from production output. Updating a production snapshot must not
 * update these; changing one requires a fresh same-day source read.
 *
 * Units: Material's pages state type and shape values in dp/pt; the CSS
 * realization is 1dp = 1px. `full` has no number on the page — the page says
 * "fully rounded corners" — so the row verifies the semantic, and 9999px is
 * recorded as the library's CSS realization of it, not as a page value.
 */

export const SHAPE_SOURCE = "m3-shape-scale";

/** The ten-step corner scale as read, dp values; `full` is qualitative. */
export const shapeScale: Record<string, { dp: number } | { fullyRounded: true }> = {
  none: { dp: 0 },
  "extra-small": { dp: 4 },
  small: { dp: 8 },
  medium: { dp: 12 },
  large: { dp: 16 },
  "large-increased": { dp: 20 },
  "extra-large": { dp: 28 },
  "extra-large-increased": { dp: 32 },
  "extra-extra-large": { dp: 48 },
  full: { fullyRounded: true },
};

export const TYPE_SCALE_SOURCE = "m3-type-scale";

/** A baseline role's five axes as read from the expanded token module. */
export interface TypeRole {
  font: string;
  weight: number;
  size: number;
  /** Tracking in px, signed; the page states pt, realized 1:1. */
  tracking: number;
  lineHeight: number;
  /** The reference face the page assigns this role group to. */
  face: "brand" | "plain";
}

export const typescale: Record<string, TypeRole> = {
  "display-large": { font: "Roboto", weight: 400, size: 57, tracking: -0.25, lineHeight: 64, face: "brand" },
  "display-medium": { font: "Roboto", weight: 400, size: 45, tracking: 0, lineHeight: 52, face: "brand" },
  "display-small": { font: "Roboto", weight: 400, size: 36, tracking: 0, lineHeight: 44, face: "brand" },
  "headline-large": { font: "Roboto", weight: 400, size: 32, tracking: 0, lineHeight: 40, face: "brand" },
  "headline-medium": { font: "Roboto", weight: 400, size: 28, tracking: 0, lineHeight: 36, face: "brand" },
  "headline-small": { font: "Roboto", weight: 400, size: 24, tracking: 0, lineHeight: 32, face: "brand" },
  "title-large": { font: "Roboto", weight: 400, size: 22, tracking: 0, lineHeight: 28, face: "brand" },
  "title-medium": { font: "Roboto", weight: 500, size: 16, tracking: 0.15, lineHeight: 24, face: "brand" },
  "title-small": { font: "Roboto", weight: 500, size: 14, tracking: 0.1, lineHeight: 20, face: "brand" },
  "body-large": { font: "Roboto", weight: 400, size: 16, tracking: 0.5, lineHeight: 24, face: "plain" },
  "body-medium": { font: "Roboto", weight: 400, size: 14, tracking: 0.25, lineHeight: 20, face: "plain" },
  "body-small": { font: "Roboto", weight: 400, size: 12, tracking: 0.4, lineHeight: 16, face: "plain" },
  "label-large": { font: "Roboto", weight: 500, size: 14, tracking: 0.1, lineHeight: 20, face: "plain" },
  "label-medium": { font: "Roboto", weight: 500, size: 12, tracking: 0.5, lineHeight: 16, face: "plain" },
  "label-small": { font: "Roboto", weight: 500, size: 11, tracking: 0.5, lineHeight: 16, face: "plain" },
};

/** The page names the split by example ("like Headline and Display"); the
 * library's title→brand assignment extends the example, and the row says so. */
export const typefaceSplit = {
  brand: { roles: ["display", "headline", "title"], pageWords: "larger type styles, like Headline and Display" },
  plain: { roles: ["body", "label"], pageWords: "smaller type styles, like Body and Label" },
} as const;

/** The default the page states for both faces. */
export const typefaceDefault = "Roboto, sans-serif";

export const MOTION_SOURCE = "m3-motion-tokens";

/** The easing and duration tokens the page states for CSS, read 2026-11-10. */
export const motionTokens = {
  easing: {
    "md.sys.motion.easing.emphasized": "N/A for CSS (use Standard as a fallback)",
    "md.sys.motion.easing.emphasized.decelerate": "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
    "md.sys.motion.easing.emphasized.accelerate": "cubic-bezier(0.3, 0.0, 0.8, 0.15)",
    "md.sys.motion.easing.standard": "cubic-bezier(0.2, 0.0, 0, 1.0)",
    "md.sys.motion.easing.standard.decelerate": "cubic-bezier(0, 0, 0, 1)",
    "md.sys.motion.easing.standard.accelerate": "cubic-bezier(0.3, 0, 1, 1)",
  },
  duration: {
    "md.sys.motion.duration.short1": "50ms", "md.sys.motion.duration.short2": "100ms",
    "md.sys.motion.duration.short3": "150ms", "md.sys.motion.duration.short4": "200ms",
    "md.sys.motion.duration.medium1": "250ms", "md.sys.motion.duration.medium2": "300ms",
    "md.sys.motion.duration.medium3": "350ms", "md.sys.motion.duration.medium4": "400ms",
    "md.sys.motion.duration.long1": "450ms", "md.sys.motion.duration.long2": "500ms",
    "md.sys.motion.duration.long3": "550ms", "md.sys.motion.duration.long4": "600ms",
    "md.sys.motion.duration.extra-long1": "700ms", "md.sys.motion.duration.extra-long2": "800ms",
    "md.sys.motion.duration.extra-long3": "900ms", "md.sys.motion.duration.extra-long4": "1000ms",
  },
} as const;
