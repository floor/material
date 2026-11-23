import { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme.js";
import { MaterialDynamicColors } from "./vendor/dynamiccolor/material_dynamic_colors.js";
import { Variant } from "./vendor/dynamiccolor/variant.js";
import { Hct } from "./vendor/hct/hct.js";
import { TonalPalette } from "./vendor/palettes/tonal_palette.js";
import { argbFromHex, hexFromArgb } from "./vendor/utils/string_utils.js";
export { Hct };
const scheme = (variant) => (sourceColorHct, isDark, contrastLevel) => new DynamicScheme({ sourceColorHct, variant, isDark, contrastLevel });
export const tonalSpot = scheme(Variant.TONAL_SPOT);
export const vibrant = scheme(Variant.VIBRANT);
export const expressive = scheme(Variant.EXPRESSIVE);
export const fidelity = scheme(Variant.FIDELITY);
export const content = scheme(Variant.CONTENT);
export const neutral = scheme(Variant.NEUTRAL);
export const monochrome = scheme(Variant.MONOCHROME);
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
];
const camel = (role) => role.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
const proto = MaterialDynamicColors.prototype;
SCHEME_ROLES.slice(34).forEach((k, i) => {
    const f = Hct.fromInt([0x7b5a, 0xdd6d06, 0x61a4][i >> 1]);
    proto[camel(k)] = () => ({
        getArgb: (s) => proto[i & 1 ? "onError" : "error"]().getArgb({
            __proto__: s,
            errorPalette: TonalPalette.fromInt(Hct.from(f.hue + Math.max(-15, Math.min(15, (((s.variant && Hct.fromInt(s.primaryPalette.tone(40)).hue) - f.hue + 540) % 360 - 180) * 0.5)), f.chroma, f.tone).toInt()),
        }),
    });
});
export function createScheme(seed, options = {}) {
    const source = typeof seed === "string" ? Hct.fromInt(argbFromHex(seed)) : typeof seed === "number" ? Hct.fromInt(seed) : seed;
    const variant = options.variant ?? tonalSpot;
    return variant(source, options.mode === "dark", options.contrast ?? 0);
}
export function applyScheme(scheme, target = document.documentElement, options = {}) {
    const { prefix = "mtrl" } = options;
    const { style } = target;
    for (const role of SCHEME_ROLES) {
        style.setProperty(`--${prefix}-sys-color-${role}`, hexFromArgb(proto[camel(role)]().getArgb(scheme)));
    }
}
