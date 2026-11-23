/** Registers the 2025 palette delegate; without one, every version is 2021. */
export function registerPaletteSpec(delegate: any): void;
/** Constructed by a set of values representing the current UI state (such as whether or not its dark theme, what the theme style is, etc.), and provides a set of TonalPalettes that can create colors that fit in with the theme style. */
export class DynamicScheme {
    static maybeFallbackSpecVersion(specVersion: any, variant: any): any;
    /**
 * Returns a new hue based on a piecewise function and input color hue.
 * @param sourceColorHct
 * @param hueBreakpoints
 * @param hues
 */
    static getPiecewiseHue(sourceColorHct: any, hueBreakpoints: any, hues: any): any;
    /**
 * Returns a shifted hue based on a piecewise function and input color hue.
 * @param sourceColorHct
 * @param hueBreakpoints
 * @param rotations
 */
    static getRotatedHue(sourceColorHct: any, hueBreakpoints: any, rotations: any): any;
    constructor(args: any);
    sourceColorArgb: any;
    variant: any;
    contrastLevel: any;
    isDark: any;
    platform: any;
    specVersion: any;
    sourceColorHct: any;
    primaryPalette: any;
    secondaryPalette: any;
    tertiaryPalette: any;
    neutralPalette: any;
    neutralVariantPalette: any;
    errorPalette: any;
    colors: MaterialDynamicColors;
    toString(): string;
    getArgb(dynamicColor: any): any;
    getHct(dynamicColor: any): any;
    get primaryPaletteKeyColor(): any;
    get secondaryPaletteKeyColor(): any;
    get tertiaryPaletteKeyColor(): any;
    get neutralPaletteKeyColor(): any;
    get neutralVariantPaletteKeyColor(): any;
    get errorPaletteKeyColor(): any;
    get background(): any;
    get onBackground(): any;
    get surface(): any;
    get surfaceDim(): any;
    get surfaceBright(): any;
    get surfaceContainerLowest(): any;
    get surfaceContainerLow(): any;
    get surfaceContainer(): any;
    get surfaceContainerHigh(): any;
    get surfaceContainerHighest(): any;
    get onSurface(): any;
    get surfaceVariant(): any;
    get onSurfaceVariant(): any;
    get inverseSurface(): any;
    get inverseOnSurface(): any;
    get outline(): any;
    get outlineVariant(): any;
    get shadow(): any;
    get scrim(): any;
    get surfaceTint(): any;
    get primary(): any;
    get primaryDim(): any;
    get onPrimary(): any;
    get primaryContainer(): any;
    get onPrimaryContainer(): any;
    get primaryFixed(): any;
    get primaryFixedDim(): any;
    get onPrimaryFixed(): any;
    get onPrimaryFixedVariant(): any;
    get inversePrimary(): any;
    get secondary(): any;
    get secondaryDim(): any;
    get onSecondary(): any;
    get secondaryContainer(): any;
    get onSecondaryContainer(): any;
    get secondaryFixed(): any;
    get secondaryFixedDim(): any;
    get onSecondaryFixed(): any;
    get onSecondaryFixedVariant(): any;
    get tertiary(): any;
    get tertiaryDim(): any;
    get onTertiary(): any;
    get tertiaryContainer(): any;
    get onTertiaryContainer(): any;
    get tertiaryFixed(): any;
    get tertiaryFixedDim(): any;
    get onTertiaryFixed(): any;
    get onTertiaryFixedVariant(): any;
    get error(): any;
    get errorDim(): any;
    get onError(): any;
    get errorContainer(): any;
    get onErrorContainer(): any;
}
export namespace DynamicScheme {
    let DEFAULT_SPEC_VERSION: string;
    let DEFAULT_PLATFORM: string;
}
/** A delegate for the palettes of a DynamicScheme in the 2021 spec. */
export class DynamicSchemePalettesDelegateImpl2021 {
    getPrimaryPalette(variant: any, sourceColorHct: any, isDark: any, platform: any, contrastLevel: any): TonalPalette;
    getSecondaryPalette(variant: any, sourceColorHct: any, isDark: any, platform: any, contrastLevel: any): TonalPalette;
    getTertiaryPalette(variant: any, sourceColorHct: any, isDark: any, platform: any, contrastLevel: any): TonalPalette;
    getNeutralPalette(variant: any, sourceColorHct: any, isDark: any, platform: any, contrastLevel: any): TonalPalette;
    getNeutralVariantPalette(variant: any, sourceColorHct: any, isDark: any, platform: any, contrastLevel: any): TonalPalette;
    getErrorPalette(variant: any, sourceColorHct: any, isDark: any, platform: any, contrastLevel: any): undefined;
}
import { MaterialDynamicColors } from "./material_dynamic_colors.js";
import { TonalPalette } from "../palettes/tonal_palette.js";
