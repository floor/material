/** Runtime colour: a Material 3 dynamic scheme generated from a seed colour and written to the page as the `--<prefix>-sys-color-*` tokens the stylesheet already reads. */
import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme.js";
import { Hct } from "./vendor/hct/hct.js";
export { Hct };
export type { DynamicScheme };
/** A scheme factory: the source colour, whether it is dark, and the contrast level. */
export type SchemeFactory = (source: Hct, dark: boolean, contrastLevel: number) => DynamicScheme;
/** The tonal-spot variant, Material's default theme. */
export declare const tonalSpot: SchemeFactory;
/** The vibrant variant. */
export declare const vibrant: SchemeFactory;
/** The expressive variant. */
export declare const expressive: SchemeFactory;
/** The fidelity variant. */
export declare const fidelity: SchemeFactory;
/** The content variant. */
export declare const content: SchemeFactory;
/** The neutral variant. */
export declare const neutral: SchemeFactory;
/** The monochrome variant. */
export declare const monochrome: SchemeFactory;
/** The mode of the generated scheme: a light or a dark one. */
export type SchemeMode = "light" | "dark";
export interface SchemeOptions {
    /** The variant to generate, as its factory — `tonalSpot`, `vibrant`, or another of the seven. */
    variant?: SchemeFactory;
    /** Generate the dark scheme. */
    mode?: SchemeMode;
    /** The contrast level, `-1` (reduced) to `1` (high), continuous; `0` is the standard level. */
    contrast?: number;
}
/**
 * Generates a dynamic colour scheme from one seed colour.
 * @param seed
 * @param options
 */
export declare function createScheme(seed: string | number | Hct, options?: SchemeOptions): DynamicScheme;
export interface ApplyOptions {
    /** The custom-property prefix the stylesheet was compiled with (`$prefix`, `mtrl` by default). */
    prefix?: string;
}
/** Writes the scheme's role colours to `--<prefix>-sys-color-*` on the target, the same tokens the theme partials set, so a runtime scheme and a Sass theme are interchangeable. */
export declare function applyScheme(scheme: DynamicScheme, target?: Element, options?: ApplyOptions): void;
