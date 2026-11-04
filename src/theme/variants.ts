// src/theme/variants.ts
/**
 * The name-based variant lookup: `createSchemeByName` and the seven names.
 *
 * A page that switches variants at runtime imports this subpath and carries
 * all seven scheme classes (about 1.1 kB minified). A page that knows its
 * variant at build time imports the constructor from `material/theme` instead
 * and carries that one.
 *
 * @module theme/variants
 */

import { Hct } from "./vendor/hct/hct";
import { SchemeContent } from "./vendor/scheme/scheme_content";
import { SchemeExpressive } from "./vendor/scheme/scheme_expressive";
import { SchemeFidelity } from "./vendor/scheme/scheme_fidelity";
import { SchemeMonochrome } from "./vendor/scheme/scheme_monochrome";
import { SchemeNeutral } from "./vendor/scheme/scheme_neutral";
import { SchemeTonalSpot } from "./vendor/scheme/scheme_tonal_spot";
import { SchemeVibrant } from "./vendor/scheme/scheme_vibrant";
import { createScheme, type DynamicScheme, type SchemeConstructor } from "./index";

/** The dynamic-scheme variants Material 3 names, in its order. */
export type ThemeVariant = "tonal-spot" | "vibrant" | "expressive" | "fidelity" | "content" | "neutral" | "monochrome";

const VARIANTS: Record<ThemeVariant, SchemeConstructor> = {
  "tonal-spot": SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
};

export interface NamedSchemeOptions {
  /** The variant to generate by name. Default `tonal-spot`. */
  variant?: ThemeVariant;
  /** Generate the dark scheme. Default `false` (light). */
  dark?: boolean;
  /** The contrast level, `-1` to `1`, continuous. Default `0`. */
  contrastLevel?: number;
}

/**
 * Generates a dynamic colour scheme from one source colour, the variant named.
 *
 * @example
 * const scheme = createSchemeByName("#6750a4", { variant: "vibrant", dark: true });
 */
export function createSchemeByName(sourceColor: string | number | Hct, options: NamedSchemeOptions = {}): DynamicScheme {
  return createScheme(sourceColor, {
    variant: VARIANTS[options.variant ?? "tonal-spot"],
    dark: options.dark,
    contrastLevel: options.contrastLevel,
  });
}
