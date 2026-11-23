/** The 2025 colour spec (Material 3 Expressive), behind `material/theme/2025`. */
import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme.js";
import { Hct } from "./vendor/hct/hct.js";
import type { ThemeVariant } from "./variants.js";
export { Hct };
export type { DynamicScheme };
/** The colour-spec version a scheme is generated with. */
export type SpecVersion = "2021" | "2025";
/** A scheme factory that takes the spec version. */
export type Spec2025Factory = (source: Hct, dark: boolean, contrastLevel: number, spec?: SpecVersion) => DynamicScheme;
/** The tonal-spot variant, Material's default theme. */
export declare const tonalSpot: Spec2025Factory;
/** The vibrant variant. */
export declare const vibrant: Spec2025Factory;
/** The expressive variant. */
export declare const expressive: Spec2025Factory;
/** The fidelity variant; `"2025"` falls back to `"2021"`. */
export declare const fidelity: Spec2025Factory;
/** The content variant; `"2025"` falls back to `"2021"`. */
export declare const content: Spec2025Factory;
/** The neutral variant. */
export declare const neutral: Spec2025Factory;
/** The monochrome variant; `"2025"` falls back to `"2021"`. */
export declare const monochrome: Spec2025Factory;
/** The mode of the generated scheme: a light or a dark one. */
export type SchemeMode = "light" | "dark";
export interface Spec2025Options {
    /** The variant to generate, as its factory — `tonalSpot`, `vibrant`, or another of the seven. */
    variant?: Spec2025Factory;
    /** Generate the dark scheme. */
    mode?: SchemeMode;
    /** The contrast level, `-1` (reduced) to `1` (high), continuous. */
    contrast?: number;
    /** The colour spec. */
    spec?: SpecVersion;
}
/** The variant names `material/theme/variants` uses, in Material's order. */
export type { ThemeVariant };
/**
 * Generates a dynamic colour scheme from one seed colour.
 * @param seed
 * @param options
 */
export declare function createScheme(seed: string | number | Hct, options?: Spec2025Options): DynamicScheme;
export interface Spec2025NamedOptions {
    /** The variant to generate by name. */
    variant?: ThemeVariant;
    /** Generate the dark scheme. */
    mode?: SchemeMode;
    /** The contrast level, `-1` to `1`, continuous. */
    contrast?: number;
    /** The colour spec. */
    spec?: SpecVersion;
}
/** Generates a dynamic colour scheme from one seed colour, the variant named. */
export declare function createSchemeByName(seed: string | number | Hct, options?: Spec2025NamedOptions): DynamicScheme;
