#!/usr/bin/env bun
// scripts/generate-themes.ts
/**
 * Generates mtrl's seed themes from Google's material-color-utilities
 * (FLO-308). Every theme listed here is written to
 * `src/styles/themes/_<name>.scss` through the `create-theme` mixin, light and
 * dark, with exactly the baseline theme's colour roles and their `-rgb` twins.
 * The role-to-token mapping is `schemeToTokens` (src/core/theme), the same
 * function md3.io's theme builder calls, so the two cannot drift.
 *
 * material-color-utilities is a devDependency: this script and the tests use
 * it; nothing in the package imports it.
 *
 * A test regenerates the files and fails if the committed ones differ, so edit
 * this list and run the script, never the generated files:
 *
 *   bun run themes:generate
 */

import {
  DynamicScheme,
  Hct,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
  TonalPalette,
  Variant,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";
import { schemeToTokens, THEME_ROLES } from "../src/core/theme";

/** M3's baseline seed, the source of `baseline` and of the eight variants */
export const BASELINE_SEED = "#6750A4";

export type VariantName =
  | "tonal-spot" | "neutral" | "vibrant" | "expressive" | "fidelity"
  | "content" | "monochrome" | "rainbow" | "fruit-salad";

export interface ThemeSpec {
  name: string;
  /** One line for the file header: what the theme is */
  description: string;
  seed: string;
  variant: VariantName;
  /** M3 contrast level: 0 standard, 1 high */
  contrast?: number;
  /**
   * A custom secondary colour, for a two-colour theme: its hue and chroma
   * become the secondary palette, so the pairing survives with M3's tones
   */
  secondary?: string;
  /**
   * Shipped only as `mtrl/themes/<name>`, not in the full stylesheet: an app
   * pays for it only by importing it
   */
  standalone?: boolean;
}

const VARIANTS = ["neutral", "vibrant", "expressive", "fidelity", "content", "monochrome", "rainbow", "fruit-salad"] as const;
const TITLE: Record<VariantName, string> = {
  "tonal-spot": "Tonal Spot", neutral: "Neutral", vibrant: "Vibrant", expressive: "Expressive",
  fidelity: "Fidelity", content: "Content", monochrome: "Monochrome", rainbow: "Rainbow", "fruit-salad": "Fruit Salad",
};

export const THEMES: ThemeSpec[] = [
  // The eight M3 dynamic-scheme variants other than Tonal Spot, from the
  // baseline seed. Tonal Spot itself is `baseline` (ΔE00 1.31, FLO-309).
  ...VARIANTS.map((variant): ThemeSpec => ({
    name: variant,
    description: `M3's ${TITLE[variant]} scheme variant, from the baseline seed ${BASELINE_SEED}.`,
    seed: BASELINE_SEED,
    variant,
    standalone: true,
  })),
  // The audited themes, regenerated from their seeds (FLO-309): the hand-set
  // values failed contrast or drifted from M3's tones.
  { name: "desert", description: "Road Runner desert: sand, with a sky-blue secondary.", seed: "#9a7a3e", secondary: "#4a87c4", variant: "tonal-spot" },
  { name: "summer", description: "Summer: mid blue, with a sunflower-yellow secondary.", seed: "#4196cb", secondary: "#f3c649", variant: "tonal-spot" },
  { name: "brownbeige", description: "Espresso brown, with a beige secondary.", seed: "#3e2723", secondary: "#d7cdb7", variant: "tonal-spot" },
  { name: "sageivory", description: "Sage, with an ivory secondary.", seed: "#7d8c73", secondary: "#f0ecd5", variant: "tonal-spot" },
  { name: "tealcaramel", description: "Petrol teal, with a caramel secondary.", seed: "#2b4d56", secondary: "#9a6433", variant: "tonal-spot" },
  // M3's high-contrast scheme: every text pair at 7:1 or more.
  { name: "highcontrast", description: `M3 high contrast (contrastLevel 1.0) from the baseline seed ${BASELINE_SEED}.`, seed: BASELINE_SEED, variant: "tonal-spot", contrast: 1 },
];

const SCHEMES: Record<VariantName, new (source: Hct, isDark: boolean, contrast: number) => DynamicScheme> = {
  "tonal-spot": SchemeTonalSpot, neutral: SchemeNeutral, vibrant: SchemeVibrant, expressive: SchemeExpressive,
  fidelity: SchemeFidelity, content: SchemeContent, monochrome: SchemeMonochrome, rainbow: SchemeRainbow,
  "fruit-salad": SchemeFruitSalad,
};

const VARIANT_ENUM: Record<VariantName, Variant> = {
  "tonal-spot": Variant.TONAL_SPOT, neutral: Variant.NEUTRAL, vibrant: Variant.VIBRANT, expressive: Variant.EXPRESSIVE,
  fidelity: Variant.FIDELITY, content: Variant.CONTENT, monochrome: Variant.MONOCHROME, rainbow: Variant.RAINBOW,
  "fruit-salad": Variant.FRUIT_SALAD,
};

const camel = (role: string): string => role.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** The scheme material-color-utilities builds for a theme, in one mode */
export const schemeFor = (spec: ThemeSpec, isDark: boolean): DynamicScheme => {
  const source = Hct.fromInt(argbFromHex(spec.seed));
  const contrast = spec.contrast ?? 0;
  if (!spec.secondary) return new SCHEMES[spec.variant](source, isDark, contrast);
  const base = new SCHEMES[spec.variant](source, isDark, contrast);
  return new DynamicScheme({
    sourceColorHct: source,
    variant: VARIANT_ENUM[spec.variant],
    contrastLevel: contrast,
    isDark,
    primaryPalette: base.primaryPalette,
    secondaryPalette: TonalPalette.fromInt(argbFromHex(spec.secondary)),
    tertiaryPalette: base.tertiaryPalette,
    neutralPalette: base.neutralPalette,
    neutralVariantPalette: base.neutralVariantPalette,
    errorPalette: base.errorPalette,
  });
};

/** A scheme's colours by role, as hex */
export const rolesOf = (scheme: DynamicScheme): Record<string, string> =>
  Object.fromEntries(THEME_ROLES.map((role) => {
    const argb = (scheme as unknown as Record<string, number>)[camel(role)];
    if (typeof argb !== "number") throw new Error(`material-color-utilities has no ${camel(role)}`);
    return [role, hexFromArgb(argb)];
  }));

const declarations = (tokens: Record<string, string>, indent: string): string =>
  Object.entries(tokens).map(([name, value]) => `${indent}${name}: ${value};`).join("\n");

/** One theme's SCSS */
export const renderTheme = (spec: ThemeSpec): string => {
  const tokens = schemeToTokens(
    { light: rolesOf(schemeFor(spec, false)), dark: rolesOf(schemeFor(spec, true)) },
    { prefix: "#{$prefix}" },
  );
  const origin = [
    `seed ${spec.seed}`,
    `variant ${TITLE[spec.variant]}`,
    ...(spec.secondary ? [`secondary ${spec.secondary}`] : []),
    ...(spec.contrast ? [`contrastLevel ${spec.contrast.toFixed(1)}`] : []),
  ].join(", ");
  return `// src/styles/themes/_${spec.name}.scss
// ${spec.description}
// Generated by scripts/generate-themes.ts (${origin}) with
// material-color-utilities: do not edit, change the script and regenerate.
@use "../abstract/base" as *;
@use "base-theme" as *;

@include create-theme("${spec.name}") {
    // Success, warning and info, as every theme has them; the scheme's own
    // roles, error included, follow
    @include status-colors-light();
${declarations(tokens.light, "    ")}

    &[data-theme-mode="dark"] {
        @include status-colors-dark();
${declarations(tokens.dark, "        ")}
    }
}
`;
};

/** Every generated file, by path */
export const renderThemes = (): Record<string, string> =>
  Object.fromEntries(THEMES.map((spec) => [`src/styles/themes/_${spec.name}.scss`, renderTheme(spec)]));

if (import.meta.main) {
  for (const [path, content] of Object.entries(renderThemes())) {
    await Bun.write(path, content);
    console.log(`wrote ${path}`);
  }
}
