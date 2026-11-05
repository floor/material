// src/theme/variants.ts
/**
 * The name-based variant lookup: `createSchemeByName` and the seven names.
 *
 * A page that switches variants at runtime imports this subpath and carries
 * all seven variant factories (about 1.1 kB minified). A page that knows its
 * variant at build time imports the factory from `material/theme` instead and
 * carries that one.
 *
 * @module theme/variants
 */

import { Hct } from "./vendor/hct/hct";
import {
  content,
  createScheme,
  expressive,
  fidelity,
  monochrome,
  neutral,
  tonalSpot,
  vibrant,
  type DynamicScheme,
  type SchemeFactory,
  type SchemeMode,
} from "./index";

/** The dynamic-scheme variants Material 3 names, in its order. */
export type ThemeVariant = "tonal-spot" | "vibrant" | "expressive" | "fidelity" | "content" | "neutral" | "monochrome";

const VARIANTS: Record<ThemeVariant, SchemeFactory> = {
  "tonal-spot": tonalSpot,
  vibrant,
  expressive,
  fidelity,
  content,
  neutral,
  monochrome,
};

export interface NamedSchemeOptions {
  /** The variant to generate by name. Default `tonal-spot`. */
  variant?: ThemeVariant;
  /** Generate the dark scheme. Default `"light"`. */
  mode?: SchemeMode;
  /** The contrast level, `-1` to `1`, continuous. Default `0`. */
  contrast?: number;
}

/**
 * Generates a dynamic colour scheme from one seed colour, the variant named.
 *
 * @example
 * const scheme = createSchemeByName("#6750a4", { variant: "vibrant", mode: "dark" });
 */
export function createSchemeByName(seed: string | number | Hct, options: NamedSchemeOptions = {}): DynamicScheme {
  return createScheme(seed, {
    variant: VARIANTS[options.variant ?? "tonal-spot"],
    mode: options.mode,
    contrast: options.contrast,
  });
}
