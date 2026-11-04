// src/theme/index.ts
/**
 * Runtime colour: a Material 3 scheme generated from a source colour, written
 * to the page as the `--mtrl-sys-color-*` tokens the stylesheet already reads.
 *
 * The colour science is vendored from Google's material-color-utilities
 * (Apache-2.0, `src/theme/vendor`, headers kept, notice in NOTICE): HCT, the
 * tonal palettes, the dynamic-scheme variants, the contrast levels, and the
 * image quantizer behind `material/theme/image`. Nothing here is on the root
 * entry: a page pays for this subpath only when it imports `material/theme`.
 *
 * The entry is split so a bundle carries only the variant it asks for:
 * `createScheme` takes the variant's constructor, and this module imports one
 * of them (tonal-spot, the default). `material/theme/variants` offers the
 * name-based lookup for a page that switches variants at runtime, and
 * `material/theme/image` the dominant-colour path.
 *
 * @module theme
 */

import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme";
import { MaterialDynamicColors } from "./vendor/dynamiccolor/material_dynamic_colors";
import { Hct } from "./vendor/hct/hct";
import { SchemeTonalSpot } from "./vendor/scheme/scheme_tonal_spot";
import { argbFromHex, hexFromArgb } from "./vendor/utils/string_utils";
import { SCHEME_ROLES } from "./roles";

export { Hct };
export { SchemeContent } from "./vendor/scheme/scheme_content";
export { SchemeExpressive } from "./vendor/scheme/scheme_expressive";
export { SchemeFidelity } from "./vendor/scheme/scheme_fidelity";
export { SchemeMonochrome } from "./vendor/scheme/scheme_monochrome";
export { SchemeNeutral } from "./vendor/scheme/scheme_neutral";
export { SchemeTonalSpot } from "./vendor/scheme/scheme_tonal_spot";
export { SchemeVibrant } from "./vendor/scheme/scheme_vibrant";
export type { DynamicScheme };

/** A scheme constructor: the source colour, dark, and the contrast level. */
export type SchemeConstructor = new (source: Hct, dark: boolean, contrastLevel: number) => DynamicScheme;

export interface SchemeOptions {
  /**
   * The variant to generate, as its constructor — `SchemeTonalSpot`,
   * `SchemeVibrant`, or another of the seven. Default `SchemeTonalSpot`,
   * Material's default theme.
   */
  variant?: SchemeConstructor;
  /** Generate the dark scheme. Default `false` (light). */
  dark?: boolean;
  /**
   * The contrast level, `-1` (reduced) to `1` (high), continuous; `0` is the
   * standard level. Default `0`.
   */
  contrastLevel?: number;
}

/**
 * Generates a dynamic colour scheme from one source colour.
 *
 * @param sourceColor The seed: `#rrggbb`, an ARGB integer, or an {@link Hct}.
 * @param options The variant, dark, and the contrast level.
 *
 * @example
 * const scheme = createScheme("#6750a4", { variant: SchemeVibrant, dark: true });
 */
export function createScheme(sourceColor: string | number | Hct, options: SchemeOptions = {}): DynamicScheme {
  const source =
    typeof sourceColor === "string" ? Hct.fromInt(argbFromHex(sourceColor)) : typeof sourceColor === "number" ? Hct.fromInt(sourceColor) : sourceColor;
  const Scheme = options.variant ?? SchemeTonalSpot;
  return new Scheme(source, options.dark ?? false, options.contrastLevel ?? 0);
}

export interface ApplyOptions {
  /** The element to write the properties to. Default the document root. */
  target?: Element;
  /**
   * The custom-property prefix the stylesheet was compiled with
   * (`$prefix`, `mtrl` by default). Default `mtrl`.
   */
  prefix?: string;
}

/** `on-surface-variant` back to `onSurfaceVariant`, the library's spelling. */
const camel = (role: string): string => role.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/**
 * Writes the scheme's role colours to `--<prefix>-sys-color-*` on the target,
 * the same tokens the theme partials set, so a runtime scheme and a Sass theme
 * are interchangeable. The twelve `*-fixed*` roles are left to the Sass theme:
 * no style reads them. Defaults to the document root and the `mtrl` prefix.
 *
 * @example
 * applyScheme(createScheme("#6750a4"));
 */
export function applyScheme(scheme: DynamicScheme, options: ApplyOptions = {}): void {
  const { target = document.documentElement, prefix = "mtrl" } = options;
  const colors = new MaterialDynamicColors() as unknown as Record<string, () => { getArgb(scheme: DynamicScheme): number }>;
  const { style } = target as HTMLElement;
  for (const role of SCHEME_ROLES) {
    style.setProperty(`--${prefix}-sys-color-${role}`, hexFromArgb(colors[camel(role)]().getArgb(scheme)));
  }
}
