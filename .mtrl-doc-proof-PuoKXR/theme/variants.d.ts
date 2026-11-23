/** The name-based variant lookup: `createSchemeByName` and the seven names. */
import { Hct } from "./vendor/hct/hct.js";
import { type DynamicScheme, type SchemeMode } from "./index.js";
/** The dynamic-scheme variants Material 3 names, in its order. */
export type ThemeVariant = "tonal-spot" | "vibrant" | "expressive" | "fidelity" | "content" | "neutral" | "monochrome";
export interface NamedSchemeOptions {
    /** The variant to generate by name. */
    variant?: ThemeVariant;
    /** Generate the dark scheme. */
    mode?: SchemeMode;
    /** The contrast level, `-1` to `1`, continuous. */
    contrast?: number;
}
/** Generates a dynamic colour scheme from one seed colour, the variant named. */
export declare function createSchemeByName(seed: string | number | Hct, options?: NamedSchemeOptions): DynamicScheme;
