#!/usr/bin/env bun
// scripts/generate-themes.ts
/**
 * Generates mtrl's seed themes from Google's material-color-utilities
 * (FLO-308). Every theme listed here is written to
 * `src/styles/themes/_<name>.scss` through the `create-theme` mixin, light and
 * dark, with exactly the baseline theme's colour roles (no `-rgb` twins, FLO-311).
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
import { readFileSync, readdirSync } from "node:fs";
import { compileString, Logger } from "sass";
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
  /** M3 contrast level: 0 standard, 0.5 medium, 1 high */
  contrast?: number;
  /**
   * A custom secondary colour, for a two-colour theme: its hue and chroma
   * become the secondary palette, so the pairing survives with M3's tones
   */
  secondary?: string;
  /** A custom tertiary colour: preserve its hue and chroma with M3's tones. */
  tertiary?: string;
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
  if (!spec.secondary && !spec.tertiary) return new SCHEMES[spec.variant](source, isDark, contrast);
  const base = new SCHEMES[spec.variant](source, isDark, contrast);
  return new DynamicScheme({
    sourceColorHct: source,
    variant: VARIANT_ENUM[spec.variant],
    contrastLevel: contrast,
    isDark,
    primaryPalette: base.primaryPalette,
    secondaryPalette: spec.secondary ? TonalPalette.fromInt(argbFromHex(spec.secondary)) : base.secondaryPalette,
    tertiaryPalette: spec.tertiary ? TonalPalette.fromInt(argbFromHex(spec.tertiary)) : base.tertiaryPalette,
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

const CONTRAST_START = "// contrast roles: generated, do not edit";
const CONTRAST_HEADER = "// Medium/high contrast: ";

type ModeTokens = { light: Record<string, string>; dark: Record<string, string> };

/** Read the actual kept standard, including mixins and light values reused in dark. */
export const standardTokens = (name: string, source: string): ModeTokens => {
  const css = compileString(source.split(CONTRAST_START)[0], {
    loadPaths: ["src/styles/themes"], logger: Logger.silent,
  }).css;
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const read = (selector: string) => Object.fromEntries(
    [...(blocks.find(([, sel]) => sel.trim() === selector)?.[2] ?? "")
      .matchAll(/--mtrl-sys-color-([a-z-]+):\s*(#[a-f\d]{3,6})\b/gi)]
      .map(([, role, value]) => [`--#{$prefix}-sys-color-${role}`,
        (value.length === 4 ? "#" + [...value.slice(1)].map(c => c + c).join("") : value).toLowerCase()]),
  );
  const light = read(name === "baseline" ? ":root" : `[data-theme=${name}]`);
  const inherited = name === "baseline" ? { light: {}, dark: {} }
    : standardTokens("baseline", readFileSync("src/styles/themes/_baseline.scss", "utf8"));
  return {
    light: { ...inherited.light, ...light },
    dark: { ...inherited.dark, ...light, ...read(name === "baseline" ? ".dark-theme" : `[data-theme=${name}][data-theme-mode=dark]`) },
  };
};

/** Only differences from this mode's standard; equal medium/high values share a rule. */
export const renderContrast = (spec: ThemeSpec, standard: ModeTokens = schemeToTokens({
  light: rolesOf(schemeFor(spec, false)), dark: rolesOf(schemeFor(spec, true)),
}, { prefix: "#{$prefix}" })): string => {
  const levels = [0.5, 1].map(contrast => schemeToTokens({
    light: rolesOf(schemeFor({ ...spec, contrast }, false)),
    dark: rolesOf(schemeFor({ ...spec, contrast }, true)),
  }, { prefix: "#{$prefix}" }));
  const maps = levels.map(tokens => Object.fromEntries((["light", "dark"] as const).map(mode => [mode,
    Object.fromEntries(Object.entries(tokens[mode]).filter(([token, value]) => {
      if (!standard[mode][token]) throw new Error(`${spec.name} ${mode}: missing standard ${token}`);
      return value !== standard[mode][token];
    })),
  ])) as ModeTokens);
  const modeMap = (tokens: Record<string, string>) => Object.entries(tokens)
    .map(([token, value]) => `            ${token.replace("--#{$prefix}-sys-color-", "")}: ${value},`).join("\n");
  return CONTRAST_START + `
@include create-theme-contrast("${spec.name}", (
${maps.map((tokens, index) => `    ${index === 0 ? "medium" : "high"}: (
        light: (
${modeMap(tokens.light)}
        ),
        dark: (
${modeMap(tokens.dark)}
        ),
    ),`).join("\n")}
));
`;
};

/** One generated theme's standard, medium and high SCSS. */
export const renderTheme = (spec: ThemeSpec): string => {
  const tokens = schemeToTokens(
    { light: rolesOf(schemeFor(spec, false)), dark: rolesOf(schemeFor(spec, true)) },
    { prefix: "#{$prefix}" },
  );
  const origin = [
    `seed ${spec.seed}`,
    `variant ${TITLE[spec.variant]}`,
    ...(spec.secondary ? [`secondary ${spec.secondary}`] : []),
    ...(spec.tertiary ? [`tertiary ${spec.tertiary}`] : []),
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

${renderContrast(spec, tokens)}`;
};

/**
 * The hand-kept themes: their colours are set by hand and stay (the FLO-309
 * audit found them M3-faithful). Only their fixed roles are generated, from
 * the theme's own primary, secondary and tertiary (FLO-315).
 */
export const KEPT_THEMES = ["ocean", "forest", "spring", "sunset", "autumn"];

const FIXED_START = "    // fixed roles: generated, do not edit";
const FIXED_END = "    // end of fixed roles";

/**
 * M3's fixed roles from key colours: tones 90, 80, 10 and 30 of the palette
 * each colour keys (as Compose's baseline has them: Primary90 #EADDFF, …).
 * The same in light and dark.
 */
export const fixedRoles = (keys: { primary: string; secondary: string; tertiary: string }): Record<string, string> =>
  Object.fromEntries((["primary", "secondary", "tertiary"] as const).flatMap((group) => {
    const palette = TonalPalette.fromInt(argbFromHex(keys[group]));
    return [
      [`${group}-fixed`, hexFromArgb(palette.tone(90))],
      [`${group}-fixed-dim`, hexFromArgb(palette.tone(80))],
      [`on-${group}-fixed`, hexFromArgb(palette.tone(10))],
      [`on-${group}-fixed-variant`, hexFromArgb(palette.tone(30))],
    ];
  }));

const SURFACE_VARIANT = "generated: neutral variant tone";

/**
 * M3's surface-variant for a kept theme: tones 90 (light) and 30 (dark) of its
 * neutral variant palette, keyed from its own light on-surface-variant (tone 30
 * of that palette), as Compose's baseline has it (NeutralVariant90, NeutralVariant30).
 */
export const surfaceVariant = (onSurfaceVariant: string): { light: string; dark: string } => {
  const palette = TonalPalette.fromInt(argbFromHex(onSurfaceVariant));
  return { light: hexFromArgb(palette.tone(90)), dark: hexFromArgb(palette.tone(30)) };
};

/** Writes surface-variant after the on-surface-variant line of one mode's block */
const withSurfaceVariant = (block: string, hex: string, tone: number): string => {
  const line = `--#{$prefix}-sys-color-surface-variant: ${hex}; // ${SURFACE_VARIANT} ${tone}`;
  const existing = block.match(/([ \t]*)--#\{\$prefix\}-sys-color-surface-variant:[^\n]*/);
  if (existing) return block.replace(existing[0], `${existing[1]}${line}`);
  const anchor = block.match(/\n([ \t]*)(--#\{\$prefix\}-sys-color-on-surface-variant:[^\n]*)\n/);
  if (!anchor || anchor.index === undefined) throw new Error("kept theme has no on-surface-variant");
  const at = anchor.index + anchor[0].length;
  return `${block.slice(0, at)}${anchor[1]}${line}\n${block.slice(at)}`;
};

/** A kept theme with its generated roles written from its own colours: the fixed roles and surface-variant */
export const renderKept = (source: string): string => {
  const withFixed = renderFixed(source);
  const split = withFixed.indexOf('&[data-theme-mode="dark"]');
  const onSurfaceVariant = withFixed.slice(0, split).match(/--#\{\$prefix\}-sys-color-on-surface-variant:\s*(#[0-9a-fA-F]{6})/);
  if (!onSurfaceVariant) throw new Error("kept theme has no light on-surface-variant");
  const tones = surfaceVariant(onSurfaceVariant[1]);
  return withSurfaceVariant(withFixed.slice(0, split), tones.light, 90) + withSurfaceVariant(withFixed.slice(split), tones.dark, 30);
};

/** A kept theme with its fixed-roles block written from its own key colours */
const renderFixed = (source: string): string => {
  const light = source.slice(0, source.indexOf('&[data-theme-mode="dark"]'));
  const key = (role: string): string => {
    const match = light.match(new RegExp(`--#\\{\\$prefix\\}-sys-color-${role}:\\s*(#[0-9a-fA-F]{6})`));
    if (!match) throw new Error(`kept theme has no light ${role}`);
    return match[1];
  };
  const block = [
    FIXED_START,
    "    // (tones 90, 80, 10, 30 of this theme's primary, secondary and tertiary;",
    "    // the same in dark, so declared once, FLO-315)",
    ...Object.entries(fixedRoles({ primary: key("primary"), secondary: key("secondary"), tertiary: key("tertiary") }))
      .map(([role, hex]) => `    --#{$prefix}-sys-color-${role}: ${hex};`),
    FIXED_END,
  ].join("\n");
  const start = source.indexOf(FIXED_START);
  if (start >= 0) {
    const end = source.indexOf(FIXED_END, start) + FIXED_END.length;
    return source.slice(0, start) + block + source.slice(end);
  }
  // First time: after the light tertiary group
  const anchor = source.match(/\n([ \t]*--#\{\$prefix\}-sys-color-on-tertiary-container:[^\n]*)\n/);
  if (!anchor || anchor.index === undefined) throw new Error("kept theme has no light on-tertiary-container");
  const at = anchor.index + anchor[0].length;
  return `${source.slice(0, at)}\n${block}\n${source.slice(at)}`;
};

/** All hand-authored themes, including the still-shipped deprecated themes. */
export const HAND_THEMES = readdirSync("src/styles/themes")
  .filter((file) => /^_[a-z-]+\.scss$/.test(file) && !["_index.scss", "_base-theme.scss"].includes(file))
  .map((file) => file.slice(1, -5))
  .filter((name) => !THEMES.some((spec) => spec.name === name));

/** Shared contrast inputs for generation and browser checks of a hand-made theme. */
export const handThemeSpec = (name: string, source: string, standard = standardTokens(name, source)): ThemeSpec => {
  const key = (role: string): string => {
    const color = standard.light[`--#{$prefix}-sys-color-${role}`];
    if (!color) throw new Error(`${name}: hand-made theme has no clear light ${role}`);
    return color;
  };
  const comments = source.split(CONTRAST_START)[0].match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g)?.join("\n") ?? "";
  const seed = comments.match(/\bseed color\s+(#[a-f\d]{6})\b/i)?.[1] ?? key("primary");
  return { name, description: "", seed, secondary: key("secondary"), tertiary: key("tertiary"), variant: "tonal-spot" };
};

/** Keep the entire standard source intact; replace only generated contrast blocks. */
export const renderHandContrast = (name: string, source: string): string => {
  const original = source.split(CONTRAST_START)[0].trimEnd() + "\n";
  const standard = KEPT_THEMES.includes(name) ? renderKept(original) : original;
  const tokens = standardTokens(name, standard);
  const spec = handThemeSpec(name, standard, tokens);
  const header = `${CONTRAST_HEADER}Tonal Spot from seed ${spec.seed}, secondary from ${spec.secondary}, tertiary from ${spec.tertiary}.`;
  const withoutHeader = standard.split("\n").filter((line) => !line.startsWith(CONTRAST_HEADER));
  withoutHeader.splice(1, 0, header);
  return withoutHeader.join("\n") + "\n" + renderContrast(spec, tokens);
};

/** Every generated file, by path */
export const renderThemes = (): Record<string, string> => ({
  ...Object.fromEntries(THEMES.map((spec) => [`src/styles/themes/_${spec.name}.scss`, renderTheme(spec)])),
  ...Object.fromEntries(HAND_THEMES.map((name) => {
    const path = `src/styles/themes/_${name}.scss`;
    return [path, renderHandContrast(name, readFileSync(path, "utf8"))];
  })),
});

if (import.meta.main) {
  for (const [path, content] of Object.entries(renderThemes())) {
    await Bun.write(path, content);
    console.log(`wrote ${path}`);
  }
}
