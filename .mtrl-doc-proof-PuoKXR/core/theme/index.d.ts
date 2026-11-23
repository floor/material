export { schemeToTokens, THEME_ROLES } from "./tokens.js";
export { cornerToken } from "./shape.js";
export type { ShapeStep } from "./shape.js";
export type { ThemeRole, SchemeRoles, SchemeToTokensOptions, ThemeTokens } from "./tokens.js";
/** M3's baseline seed colour: the source of the baseline theme and of the eight scheme variants. */
export declare const BASELINE_SEED = "#6750a4";
/** The dynamic-scheme recipe a generated theme's standard palette was built with. */
export type ThemeOriginVariant = "tonal-spot" | "neutral" | "vibrant" | "expressive" | "fidelity" | "content" | "monochrome" | "rainbow" | "fruit-salad";
/** A theme whose standard palette the generator builds from a seed. */
export interface GeneratedThemeOrigin {
    /** The record discriminant: this palette was generated. */
    readonly kind: "generated";
    /** Source colour, lowercase `#rrggbb`. */
    readonly seed: string;
    readonly variant: ThemeOriginVariant;
    readonly contrast: number;
    readonly secondary?: string;
    readonly tertiary?: string;
}
/** The baseline theme. */
export interface BaselineThemeOrigin {
    /** The record discriminant: the maintained baseline palette. */
    readonly kind: "baseline";
    readonly seed: "#6750a4";
    readonly variant: "tonal-spot";
    readonly contrast: 0;
}
/** A hand-authored palette. */
export interface AuthoredThemeOrigin {
    /** The record discriminant: an authored palette. */
    readonly kind: "authored";
    readonly seed: string | null;
    readonly variant: null;
    readonly contrast: null;
}
/** How one built-in theme's standard palette came to be. */
export type ThemeOrigin = GeneratedThemeOrigin | BaselineThemeOrigin | AuthoredThemeOrigin;
/** Every theme name that ships a built-in stylesheet. */
export type BuiltInThemeName = "baseline" | "neutral" | "vibrant" | "expressive" | "fidelity" | "content" | "monochrome" | "rainbow" | "fruit-salad" | "desert" | "summer" | "brownbeige" | "sageivory" | "tealcaramel" | "highcontrast" | "autumn" | "forest" | "ocean" | "spring" | "sunset";
/** Every built-in theme's origin, keyed by theme name. */
export declare const THEME_ORIGINS: Readonly<{
    readonly baseline: Readonly<{
        kind: "baseline";
        seed: "#6750a4";
        variant: "tonal-spot";
        contrast: 0;
    }>;
    readonly neutral: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "neutral";
        contrast: 0;
    }>;
    readonly vibrant: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "vibrant";
        contrast: 0;
    }>;
    readonly expressive: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "expressive";
        contrast: 0;
    }>;
    readonly fidelity: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "fidelity";
        contrast: 0;
    }>;
    readonly content: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "content";
        contrast: 0;
    }>;
    readonly monochrome: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "monochrome";
        contrast: 0;
    }>;
    readonly rainbow: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "rainbow";
        contrast: 0;
    }>;
    readonly "fruit-salad": Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "fruit-salad";
        contrast: 0;
    }>;
    readonly desert: Readonly<{
        kind: "generated";
        seed: "#9a7a3e";
        variant: "tonal-spot";
        contrast: 0;
        secondary: "#4a87c4";
    }>;
    readonly summer: Readonly<{
        kind: "generated";
        seed: "#4196cb";
        variant: "tonal-spot";
        contrast: 0;
        secondary: "#f3c649";
    }>;
    readonly brownbeige: Readonly<{
        kind: "generated";
        seed: "#3e2723";
        variant: "tonal-spot";
        contrast: 0;
        secondary: "#d7cdb7";
    }>;
    readonly sageivory: Readonly<{
        kind: "generated";
        seed: "#7d8c73";
        variant: "tonal-spot";
        contrast: 0;
        secondary: "#f0ecd5";
    }>;
    readonly tealcaramel: Readonly<{
        kind: "generated";
        seed: "#2b4d56";
        variant: "tonal-spot";
        contrast: 0;
        secondary: "#9a6433";
    }>;
    readonly highcontrast: Readonly<{
        kind: "generated";
        seed: "#6750a4";
        variant: "tonal-spot";
        contrast: 1;
    }>;
    readonly autumn: Readonly<{
        kind: "authored";
        seed: null;
        variant: null;
        contrast: null;
    }>;
    readonly forest: Readonly<{
        kind: "authored";
        seed: "#4b5d3a";
        variant: null;
        contrast: null;
    }>;
    readonly ocean: Readonly<{
        kind: "authored";
        seed: "#006c9c";
        variant: null;
        contrast: null;
    }>;
    readonly spring: Readonly<{
        kind: "authored";
        seed: "#76d275";
        variant: null;
        contrast: null;
    }>;
    readonly sunset: Readonly<{
        kind: "authored";
        seed: "#d35400";
        variant: null;
        contrast: null;
    }>;
}>;
