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
 * `createScheme` takes the variant's factory, and this module exports one per
 * variant — a bundled page keeps the factory it imports, plus the tonal-spot
 * default `createScheme` needs, and tree-shakes the rest.
 * `material/theme/variants` offers the name-based lookup for a page that
 * switches variants at runtime, and `material/theme/image` the dominant-colour
 * path.
 *
 * The scheme classes themselves are not exported: their constructor takes the
 * colour-spec version, which no option here selects, and a class a consumer
 * could call with `"2025"` would drag that whole spec branch into every
 * bundle. A factory fixes the argument list at the three values the API
 * exposes, so the 2025 branch is unreachable and not shipped.
 *
 * Material's source: m3.material.io > Styles > Color > Dynamic color.
 *
 * @module theme
 */

import { ColorSpecDelegateImpl2021 } from "./vendor/dynamiccolor/color_spec_2021";
import type { DynamicColor } from "./vendor/dynamiccolor/dynamic_color";
import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme";
import { Variant } from "./vendor/dynamiccolor/variant";
import { Hct } from "./vendor/hct/hct";
import { TonalPalette } from "./vendor/palettes/tonal_palette";
import { argbFromHex, hexFromArgb } from "./vendor/utils/string_utils";

export { Hct };
export type { DynamicScheme };

/** A scheme factory: the source colour, whether it is dark, and the contrast level. */
export type SchemeFactory = (source: Hct, dark: boolean, contrastLevel: number) => DynamicScheme;

const scheme = (variant: number): SchemeFactory => (sourceColorHct, isDark, contrastLevel) =>
  new DynamicScheme({ sourceColorHct, variant, isDark, contrastLevel });

/** The tonal-spot variant, Material's default theme. */
export const tonalSpot: SchemeFactory = scheme(Variant.TONAL_SPOT);
/** The vibrant variant. */
export const vibrant: SchemeFactory = scheme(Variant.VIBRANT);
/** The expressive variant. */
export const expressive: SchemeFactory = scheme(Variant.EXPRESSIVE);
/** The fidelity variant. */
export const fidelity: SchemeFactory = scheme(Variant.FIDELITY);
/** The content variant. */
export const content: SchemeFactory = scheme(Variant.CONTENT);
/** The neutral variant. */
export const neutral: SchemeFactory = scheme(Variant.NEUTRAL);
/** The monochrome variant. */
export const monochrome: SchemeFactory = scheme(Variant.MONOCHROME);

const SCHEME_ROLES = [
  "primary",
  "on-primary",
  "primary-container",
  "on-primary-container",
  "secondary",
  "on-secondary",
  "secondary-container",
  "on-secondary-container",
  "tertiary",
  "on-tertiary",
  "tertiary-container",
  "on-tertiary-container",
  "error",
  "on-error",
  "error-container",
  "on-error-container",
  "surface",
  "surface-dim",
  "surface-bright",
  "surface-container-lowest",
  "surface-container-low",
  "surface-container",
  "surface-container-high",
  "surface-container-highest",
  "surface-variant",
  "on-surface",
  "on-surface-variant",
  "outline",
  "outline-variant",
  "shadow",
  "scrim",
  "inverse-surface",
  "inverse-on-surface",
  "inverse-primary",
  "success",
  "on-success",
  "warning",
  "on-warning",
  "info",
  "on-info",
] as const;

const camel = (role: string): string => role.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

const proto = ColorSpecDelegateImpl2021.prototype as unknown as Record<string, () => DynamicColor>;
SCHEME_ROLES.slice(34).forEach((k, i) => {
  const f = Hct.fromInt([0x7b5a, 0xdd6d06, 0x61a4][i >> 1]!);
  proto[camel(k)] = () =>
    ({
      getArgb: (s: DynamicScheme) =>
        proto[i & 1 ? "onError" : "error"]!().getArgb({
          __proto__: s,
          errorPalette: TonalPalette.fromInt(
            Hct.from(
              f.hue + Math.max(-15, Math.min(15, (((s.variant && Hct.fromInt(s.primaryPalette.tone(40)).hue) - f.hue + 540) % 360 - 180) * 0.5)),
              f.chroma,
              f.tone,
            ).toInt(),
          ),
        } as unknown as DynamicScheme),
    }) as DynamicColor;
});

/** The mode of the generated scheme: a light or a dark one. */
export type SchemeMode = "light" | "dark";

export interface SchemeOptions {
  /**
   * The variant to generate, as its factory — `tonalSpot`, `vibrant`, or
   * another of the seven. Default `tonalSpot`, Material's default theme.
   */
  variant?: SchemeFactory;
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
 * const scheme = createScheme("#6750a4", { variant: vibrant, mode: "dark" });
 */
export function createScheme(seed: string | number | Hct, options: SchemeOptions = {}): DynamicScheme {
  const source = typeof seed === "string" ? Hct.fromInt(argbFromHex(seed)) : typeof seed === "number" ? Hct.fromInt(seed) : seed;
  const variant = options.variant ?? tonalSpot;
  return variant(source, options.mode === "dark", options.contrast ?? 0);
}

export interface ApplyOptions {
  /**
   * The custom-property prefix the stylesheet was compiled with (`$prefix`,
   * `mtrl` by default). Default `mtrl`.
   */
  prefix?: string;
}

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
  const { style } = target as HTMLElement;
  for (const role of SCHEME_ROLES) {
    style.setProperty(`--${prefix}-sys-color-${role}`, hexFromArgb(proto[camel(role)]!().getArgb(scheme)));
  }
}
