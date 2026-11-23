import { registerSpec2025 } from "./vendor/dynamiccolor/spec_2025.js";
import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme.js";
import { Hct } from "./vendor/hct/hct.js";
import { Variant } from "./vendor/dynamiccolor/variant.js";
import { argbFromHex } from "./vendor/utils/string_utils.js";
registerSpec2025();
export { Hct };
const scheme = (variant) => (sourceColorHct, isDark, contrastLevel, specVersion = "2021") => new DynamicScheme({ sourceColorHct, variant, isDark, contrastLevel, specVersion });
export const tonalSpot = scheme(Variant.TONAL_SPOT);
export const vibrant = scheme(Variant.VIBRANT);
export const expressive = scheme(Variant.EXPRESSIVE);
export const fidelity = scheme(Variant.FIDELITY);
export const content = scheme(Variant.CONTENT);
export const neutral = scheme(Variant.NEUTRAL);
export const monochrome = scheme(Variant.MONOCHROME);
export function createScheme(seed, options = {}) {
    const source = typeof seed === "string" ? Hct.fromInt(argbFromHex(seed)) : typeof seed === "number" ? Hct.fromInt(seed) : seed;
    const variant = options.variant ?? tonalSpot;
    return variant(source, options.mode === "dark", options.contrast ?? 0, options.spec ?? "2021");
}
const VARIANTS = {
    "tonal-spot": tonalSpot,
    vibrant,
    expressive,
    fidelity,
    content,
    neutral,
    monochrome,
};
export function createSchemeByName(seed, options = {}) {
    return createScheme(seed, {
        variant: VARIANTS[options.variant ?? "tonal-spot"],
        mode: options.mode,
        contrast: options.contrast,
        spec: options.spec,
    });
}
