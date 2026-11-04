// src/theme/index.ts
/**
 * Runtime colour: a Material 3 dynamic scheme generated from a seed colour and
 * written to the page as the `--<prefix>-sys-color-*` tokens the stylesheet
 * already reads.
 *
 * The colour science is ported from Google's material-color-utilities 0.4.0
 * (Apache-2.0, `src/theme/vendor`, the licence banners kept, notice in
 * NOTICE): HCT, the tonal palettes, the dynamic-scheme variants, the contrast
 * the image quantizer behind `material/theme/image`. Nothing here is on the
 * root entry: a page pays for this subpath only when it imports
 * `material/theme`.
 *
 * The entry is split so a bundle carries only the variant it asks for:
 * `createScheme` takes the variant's constructor, and this module imports one
 * of them (tonal-spot, Material's default). `material/theme/variants` offers
 * the name-based lookup for a page that switches variants at runtime, and
 * `material/theme/image` the dominant-colour path.
 *
 * Material's source: m3.material.io > Styles > Color > Dynamic color.
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

/** A scheme constructor: the source colour, whether it is dark, and the contrast level. */
export type SchemeConstructor = new (source: Hct, dark: boolean, contrastLevel: number) => DynamicScheme;

/** The mode of the generated scheme: a light or a dark one. */
export type SchemeMode = "light" | "dark";

export interface SchemeOptions {
  /**
   * The variant to generate, as its constructor — `SchemeTonalSpot`,
   * `SchemeVibrant`, or another of the seven. Default `SchemeTonalSpot`,
   * Material's default theme.
   */
  variant?: SchemeConstructor;
  /** Generate the dark scheme. Default `"light"`. */
  mode?: SchemeMode;
  /**
   * The contrast level, `-1` (reduced) to `1` (high), continuous; `0` is the
   * standard level. Default `0`.
   */
  contrast?: number;
}

/**
 * Generates a dynamic colour scheme from one seed colour.
 *
 * @param seed The seed: `#rrggbb`, an ARGB integer, or an {@link Hct}.
 * @param options The variant, the mode, and the contrast level.
 *
 * @example
 * const scheme = createScheme("#6750a4", { variant: SchemeVibrant, mode: "dark" });
 */
export function createScheme(seed: string | number | Hct, options: SchemeOptions = {}): DynamicScheme {
  const source = typeof seed === "string" ? Hct.fromInt(argbFromHex(seed)) : typeof seed === "number" ? Hct.fromInt(seed) : seed;
  const Scheme = options.variant ?? SchemeTonalSpot;
  return new Scheme(source, options.mode === "dark", options.contrast ?? 0);
}

export interface ApplyOptions {
  /**
   * The custom-property prefix the stylesheet was compiled with (`$prefix`,
   * `mtrl` by default). Default `mtrl`.
   */
  prefix?: string;
}

/** `on-surface-variant` back to `onSurfaceVariant`, the library's spelling. */
const camel = (role: string): string => role.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/**
 * Writes the scheme's role colours to `--<prefix>-sys-color-*` on the target,
 * the same tokens the theme partials set, so a runtime scheme and a Sass theme
 * are interchangeable. The twelve `*-fixed*` roles are left to the Sass theme:
 * no style reads them. Defaults to the document root and the `mtrl` prefix; a
 * section or any other element scopes the scheme to its subtree.
 *
 * @example
 * applyScheme(createScheme("#6750a4"));
 */
export function applyScheme(scheme: DynamicScheme, target: Element = document.documentElement, options: ApplyOptions = {}): void {
  const { prefix = "mtrl" } = options;
  const colors = new MaterialDynamicColors() as unknown as Record<string, () => { getArgb(scheme: DynamicScheme): number }>;
  const { style } = target as HTMLElement;
  for (const role of SCHEME_ROLES) {
    style.setProperty(`--${prefix}-sys-color-${role}`, hexFromArgb(colors[camel(role)]().getArgb(scheme)));
  }
}
