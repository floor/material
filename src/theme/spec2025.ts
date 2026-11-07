// src/theme/spec2025.ts
/**
 * The 2025 colour spec (Material 3 Expressive), behind `material/theme/2025`.
 *
 * Importing this module registers the 2025 palettes and colour-calculation
 * delegates, and switches `MaterialDynamicColors` to the 2025 role table (whose
 * `extendSpecVersion` definitions fall back to 2021 for a 2021 scheme). The
 * delegates are `(source, dark, contrast, spec)` factories so a page can pick
 * the spec explicitly; the default is `"2021"`, so importing the entry never
 * changes an output by itself.
 *
 * This module is reachable only from `material/theme/2025`, so a page that
 * imports `material/theme` alone carries none of it: the base entry fixes the
 * spec at 2021 and takes no `spec` option.
 *
 * @module theme/2025
 */

import { registerSpec2025 } from "./vendor/dynamiccolor/spec_2025";
import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme";
import { Hct } from "./vendor/hct/hct";
import { Variant } from "./vendor/dynamiccolor/variant";
import { argbFromHex } from "./vendor/utils/string_utils";
import type { ThemeVariant } from "./variants";

registerSpec2025();

export { Hct };
export type { DynamicScheme };

/** The colour-spec version a scheme is generated with. */
export type SpecVersion = "2021" | "2025";

/**
 * A scheme factory that takes the spec version. `fidelity`, `content` and
 * `monochrome` only have a 2021 definition: `"2025"` falls back to `"2021"`
 * for them, as material-color-utilities' `maybeFallbackSpecVersion` does.
 */
export type Spec2025Factory = (source: Hct, dark: boolean, contrastLevel: number, spec?: SpecVersion) => DynamicScheme;

const scheme = (variant: number): Spec2025Factory => (sourceColorHct, isDark, contrastLevel, specVersion = "2021") =>
  new DynamicScheme({ sourceColorHct, variant, isDark, contrastLevel, specVersion });

/** The tonal-spot variant, Material's default theme. */
export const tonalSpot: Spec2025Factory = scheme(Variant.TONAL_SPOT);
/** The vibrant variant. */
export const vibrant: Spec2025Factory = scheme(Variant.VIBRANT);
/** The expressive variant. */
export const expressive: Spec2025Factory = scheme(Variant.EXPRESSIVE);
/** The fidelity variant; `"2025"` falls back to `"2021"`. */
export const fidelity: Spec2025Factory = scheme(Variant.FIDELITY);
/** The content variant; `"2025"` falls back to `"2021"`. */
export const content: Spec2025Factory = scheme(Variant.CONTENT);
/** The neutral variant. */
export const neutral: Spec2025Factory = scheme(Variant.NEUTRAL);
/** The monochrome variant; `"2025"` falls back to `"2021"`. */
export const monochrome: Spec2025Factory = scheme(Variant.MONOCHROME);

/** The mode of the generated scheme: a light or a dark one. */
export type SchemeMode = "light" | "dark";

export interface Spec2025Options {
  /**
   * The variant to generate, as its factory — `tonalSpot`, `vibrant`, or
   * another of the seven. Default `tonalSpot`, Material's default theme.
   */
  variant?: Spec2025Factory;
  /** Generate the dark scheme. Default `"light"`. */
  mode?: SchemeMode;
  /** The contrast level, `-1` (reduced) to `1` (high), continuous. Default `0`. */
  contrast?: number;
  /** The colour spec. Default `"2021"`. */
  spec?: SpecVersion;
}

/** The variant names `material/theme/variants` uses, in Material's order. */
export type { ThemeVariant };

/**
 * Generates a dynamic colour scheme from one seed colour.
 *
 * @param seed The seed: `#rrggbb`, an ARGB integer, or an {@link Hct}.
 * @param options The variant, the mode, the contrast level and the spec.
 *
 * @example
 * const scheme = createScheme("#6750a4", { variant: vibrant, spec: "2025" });
 */
export function createScheme(seed: string | number | Hct, options: Spec2025Options = {}): DynamicScheme {
  const source = typeof seed === "string" ? Hct.fromInt(argbFromHex(seed)) : typeof seed === "number" ? Hct.fromInt(seed) : seed;
  const variant = options.variant ?? tonalSpot;
  return variant(source, options.mode === "dark", options.contrast ?? 0, options.spec ?? "2021");
}

export interface Spec2025NamedOptions {
  /** The variant to generate by name. Default `tonal-spot`. */
  variant?: ThemeVariant;
  /** Generate the dark scheme. Default `"light"`. */
  mode?: SchemeMode;
  /** The contrast level, `-1` to `1`, continuous. Default `0`. */
  contrast?: number;
  /** The colour spec. Default `"2021"`. */
  spec?: SpecVersion;
}

const VARIANTS: Record<ThemeVariant, Spec2025Factory> = {
  "tonal-spot": tonalSpot,
  vibrant,
  expressive,
  fidelity,
  content,
  neutral,
  monochrome,
};

/**
 * Generates a dynamic colour scheme from one seed colour, the variant named.
 *
 * @example
 * const scheme = createSchemeByName("#6750a4", { variant: "vibrant", spec: "2025" });
 */
export function createSchemeByName(seed: string | number | Hct, options: Spec2025NamedOptions = {}): DynamicScheme {
  return createScheme(seed, {
    variant: VARIANTS[options.variant ?? "tonal-spot"],
    mode: options.mode,
    contrast: options.contrast,
    spec: options.spec,
  });
}
