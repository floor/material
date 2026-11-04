// src/theme/index.ts
/**
 * Runtime colour: a Material 3 scheme generated from a source colour, written
 * to the page as the `--mtrl-sys-color-*` tokens the stylesheet already reads.
 *
 * The colour science is vendored from Google's material-color-utilities
 * (Apache-2.0, `src/theme/vendor`, headers kept, notice in NOTICE): HCT, the
 * tonal palettes, the seven dynamic-scheme variants, the contrast levels, and
 * the image quantizer and scorer behind {@link sourceColorFromImage}. Nothing
 * here is on the root entry: a page pays for this subpath only when it imports
 * `material/theme`, and only for what it imports — the image path stays out of
 * a bundle that asks for the scheme alone.
 *
 * @module theme
 */

import { THEME_ROLES } from "../core/theme/tokens";
import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme.js";
import { MaterialDynamicColors } from "./vendor/dynamiccolor/material_dynamic_colors.js";
import { Hct } from "./vendor/hct/hct.js";
import { SchemeContent } from "./vendor/scheme/scheme_content.js";
import { SchemeExpressive } from "./vendor/scheme/scheme_expressive.js";
import { SchemeFidelity } from "./vendor/scheme/scheme_fidelity.js";
import { SchemeMonochrome } from "./vendor/scheme/scheme_monochrome.js";
import { SchemeNeutral } from "./vendor/scheme/scheme_neutral.js";
import { SchemeTonalSpot } from "./vendor/scheme/scheme_tonal_spot.js";
import { SchemeVibrant } from "./vendor/scheme/scheme_vibrant.js";
import { argbFromHex, hexFromArgb } from "./vendor/utils/string_utils.js";
import { sourceColorFromImage as argbFromImage } from "./vendor/utils/image_utils.js";

export { Hct };
export type { DynamicScheme };

/** The dynamic-scheme variants Material 3 names, in its order. */
export type ThemeVariant =
  | "tonal-spot"
  | "vibrant"
  | "expressive"
  | "fidelity"
  | "content"
  | "neutral"
  | "monochrome";

export interface SchemeOptions {
  /** The variant to generate. Default `tonal-spot`, Material's default theme. */
  variant?: ThemeVariant;
  /** Generate the dark scheme. Default `false` (light). */
  dark?: boolean;
  /**
   * The contrast level, `-1` (reduced) to `1` (high), continuous; `0` is the
   * standard level. Default `0`.
   */
  contrastLevel?: number;
}

/** A scheme constructor: the source colour, dark, and the contrast level. */
type SchemeConstructor = new (source: Hct, dark: boolean, contrastLevel: number) => DynamicScheme;

const VARIANTS: Record<ThemeVariant, SchemeConstructor> = {
  "tonal-spot": SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
};

/**
 * Generates a dynamic colour scheme from one source colour.
 *
 * @param sourceColor The seed: `#rrggbb`, an ARGB integer, or an {@link Hct}.
 * @param options The variant, dark, and the contrast level.
 *
 * @example
 * const scheme = createScheme("#6750a4", { variant: "vibrant", dark: true });
 */
export function createScheme(sourceColor: string | number | Hct, options: SchemeOptions = {}): DynamicScheme {
  const source =
    typeof sourceColor === "string" ? Hct.fromInt(argbFromHex(sourceColor)) : typeof sourceColor === "number" ? Hct.fromInt(sourceColor) : sourceColor;
  const Scheme = VARIANTS[options.variant ?? "tonal-spot"];
  return new Scheme(source, options.dark ?? false, options.contrastLevel ?? 0);
}

/** `on-surface-variant` back to `onSurfaceVariant`, the library's spelling. */
const camel = (role: string): string => role.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/**
 * Writes the scheme's role colours to `--mtrl-sys-color-*` on `target`, the
 * same tokens the theme partials set, so a runtime scheme and a Sass theme are
 * interchangeable. Defaults to the document root.
 *
 * @example
 * applyScheme(createScheme("#6750a4"));
 */
export function applyScheme(scheme: DynamicScheme, target: Element = document.documentElement): void {
  const colors = new MaterialDynamicColors() as unknown as Record<string, () => { getArgb(scheme: DynamicScheme): number }>;
  const { style } = target as HTMLElement;
  for (const role of THEME_ROLES) {
    style.setProperty(`--mtrl-sys-color-${role}`, hexFromArgb(colors[camel(role)]().getArgb(scheme)));
  }
}

/**
 * The source colour of an image: its dominant colour, found by quantizing the
 * pixels and scoring the result. The seed for {@link createScheme}.
 *
 * @example
 * applyScheme(createScheme(await sourceColorFromImage(img)));
 */
export async function sourceColorFromImage(image: HTMLImageElement): Promise<Hct> {
  return Hct.fromInt(await argbFromImage(image));
}
