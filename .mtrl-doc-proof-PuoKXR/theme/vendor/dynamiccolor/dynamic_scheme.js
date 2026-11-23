/*! @license Copyright 2022 Google LLC | Apache-2.0 (see NOTICE) */
import { DislikeAnalyzer } from "../dislike/dislike_analyzer.js";
import { Hct } from "../hct/hct.js";
import { TonalPalette } from "../palettes/tonal_palette.js";
import { TemperatureCache } from "../temperature/temperature_cache.js";
import * as math from "../utils/math_utils.js";
import { MaterialDynamicColors } from "./material_dynamic_colors.js";
import { Variant } from "./variant.js";
export class DynamicScheme {
    static maybeFallbackSpecVersion(specVersion, variant) {
        switch (variant) {
            case Variant.EXPRESSIVE:
            case Variant.VIBRANT:
            case Variant.TONAL_SPOT:
            case Variant.NEUTRAL:
                return specVersion;
            default:
                return '2021';
        }
    }
    constructor(args) {
        this.sourceColorArgb = args.sourceColorHct.toInt();
        this.variant = args.variant;
        this.contrastLevel = args.contrastLevel;
        this.isDark = args.isDark;
        this.platform = args.platform ?? 'phone';
        this.specVersion = DynamicScheme.maybeFallbackSpecVersion(args.specVersion ?? '2021', this.variant);
        this.sourceColorHct = args.sourceColorHct;
        this.primaryPalette = args.primaryPalette ??
            getSpec(this.specVersion)
                .getPrimaryPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.secondaryPalette = args.secondaryPalette ??
            getSpec(this.specVersion)
                .getSecondaryPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.tertiaryPalette = args.tertiaryPalette ??
            getSpec(this.specVersion)
                .getTertiaryPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.neutralPalette = args.neutralPalette ??
            getSpec(this.specVersion)
                .getNeutralPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.neutralVariantPalette = args.neutralVariantPalette ??
            getSpec(this.specVersion)
                .getNeutralVariantPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.errorPalette = args.errorPalette ??
            getSpec(this.specVersion)
                .getErrorPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel) ??
            TonalPalette.fromHueAndChroma(25.0, 84.0);
        this.colors = new MaterialDynamicColors();
    }
    toString() {
        return `Scheme: ` +
            `variant=${Variant[this.variant]}, ` +
            `mode=${this.isDark ? 'dark' : 'light'}, ` +
            `platform=${this.platform}, ` +
            `contrastLevel=${this.contrastLevel.toFixed(1)}, ` +
            `seed=${this.sourceColorHct.toString()}, ` +
            `specVersion=${this.specVersion}`;
    }
    static getPiecewiseHue(sourceColorHct, hueBreakpoints, hues) {
        const size = Math.min(hueBreakpoints.length - 1, hues.length);
        const sourceHue = sourceColorHct.hue;
        for (let i = 0; i < size; i++) {
            if (sourceHue >= hueBreakpoints[i] && sourceHue < hueBreakpoints[i + 1]) {
                return math.sanitizeDegreesDouble(hues[i]);
            }
        }
        return sourceHue;
    }
    static getRotatedHue(sourceColorHct, hueBreakpoints, rotations) {
        let rotation = DynamicScheme.getPiecewiseHue(sourceColorHct, hueBreakpoints, rotations);
        if (Math.min(hueBreakpoints.length - 1, rotations.length) <= 0) {
            rotation = 0;
        }
        return math.sanitizeDegreesDouble(sourceColorHct.hue + rotation);
    }
    getArgb(dynamicColor) {
        return dynamicColor.getArgb(this);
    }
    getHct(dynamicColor) {
        return dynamicColor.getHct(this);
    }
    get primaryPaletteKeyColor() {
        return this.getArgb(this.colors.primaryPaletteKeyColor());
    }
    get secondaryPaletteKeyColor() {
        return this.getArgb(this.colors.secondaryPaletteKeyColor());
    }
    get tertiaryPaletteKeyColor() {
        return this.getArgb(this.colors.tertiaryPaletteKeyColor());
    }
    get neutralPaletteKeyColor() {
        return this.getArgb(this.colors.neutralPaletteKeyColor());
    }
    get neutralVariantPaletteKeyColor() {
        return this.getArgb(this.colors.neutralVariantPaletteKeyColor());
    }
    get errorPaletteKeyColor() {
        return this.getArgb(this.colors.errorPaletteKeyColor());
    }
    get background() {
        return this.getArgb(this.colors.background());
    }
    get onBackground() {
        return this.getArgb(this.colors.onBackground());
    }
    get surface() {
        return this.getArgb(this.colors.surface());
    }
    get surfaceDim() {
        return this.getArgb(this.colors.surfaceDim());
    }
    get surfaceBright() {
        return this.getArgb(this.colors.surfaceBright());
    }
    get surfaceContainerLowest() {
        return this.getArgb(this.colors.surfaceContainerLowest());
    }
    get surfaceContainerLow() {
        return this.getArgb(this.colors.surfaceContainerLow());
    }
    get surfaceContainer() {
        return this.getArgb(this.colors.surfaceContainer());
    }
    get surfaceContainerHigh() {
        return this.getArgb(this.colors.surfaceContainerHigh());
    }
    get surfaceContainerHighest() {
        return this.getArgb(this.colors.surfaceContainerHighest());
    }
    get onSurface() {
        return this.getArgb(this.colors.onSurface());
    }
    get surfaceVariant() {
        return this.getArgb(this.colors.surfaceVariant());
    }
    get onSurfaceVariant() {
        return this.getArgb(this.colors.onSurfaceVariant());
    }
    get inverseSurface() {
        return this.getArgb(this.colors.inverseSurface());
    }
    get inverseOnSurface() {
        return this.getArgb(this.colors.inverseOnSurface());
    }
    get outline() {
        return this.getArgb(this.colors.outline());
    }
    get outlineVariant() {
        return this.getArgb(this.colors.outlineVariant());
    }
    get shadow() {
        return this.getArgb(this.colors.shadow());
    }
    get scrim() {
        return this.getArgb(this.colors.scrim());
    }
    get surfaceTint() {
        return this.getArgb(this.colors.surfaceTint());
    }
    get primary() {
        return this.getArgb(this.colors.primary());
    }
    get primaryDim() {
        const primaryDim = this.colors.primaryDim();
        if (primaryDim === undefined) {
            throw new Error('`primaryDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(primaryDim);
    }
    get onPrimary() {
        return this.getArgb(this.colors.onPrimary());
    }
    get primaryContainer() {
        return this.getArgb(this.colors.primaryContainer());
    }
    get onPrimaryContainer() {
        return this.getArgb(this.colors.onPrimaryContainer());
    }
    get primaryFixed() {
        return this.getArgb(this.colors.primaryFixed());
    }
    get primaryFixedDim() {
        return this.getArgb(this.colors.primaryFixedDim());
    }
    get onPrimaryFixed() {
        return this.getArgb(this.colors.onPrimaryFixed());
    }
    get onPrimaryFixedVariant() {
        return this.getArgb(this.colors.onPrimaryFixedVariant());
    }
    get inversePrimary() {
        return this.getArgb(this.colors.inversePrimary());
    }
    get secondary() {
        return this.getArgb(this.colors.secondary());
    }
    get secondaryDim() {
        const secondaryDim = this.colors.secondaryDim();
        if (secondaryDim === undefined) {
            throw new Error('`secondaryDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(secondaryDim);
    }
    get onSecondary() {
        return this.getArgb(this.colors.onSecondary());
    }
    get secondaryContainer() {
        return this.getArgb(this.colors.secondaryContainer());
    }
    get onSecondaryContainer() {
        return this.getArgb(this.colors.onSecondaryContainer());
    }
    get secondaryFixed() {
        return this.getArgb(this.colors.secondaryFixed());
    }
    get secondaryFixedDim() {
        return this.getArgb(this.colors.secondaryFixedDim());
    }
    get onSecondaryFixed() {
        return this.getArgb(this.colors.onSecondaryFixed());
    }
    get onSecondaryFixedVariant() {
        return this.getArgb(this.colors.onSecondaryFixedVariant());
    }
    get tertiary() {
        return this.getArgb(this.colors.tertiary());
    }
    get tertiaryDim() {
        const tertiaryDim = this.colors.tertiaryDim();
        if (tertiaryDim === undefined) {
            throw new Error('`tertiaryDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(tertiaryDim);
    }
    get onTertiary() {
        return this.getArgb(this.colors.onTertiary());
    }
    get tertiaryContainer() {
        return this.getArgb(this.colors.tertiaryContainer());
    }
    get onTertiaryContainer() {
        return this.getArgb(this.colors.onTertiaryContainer());
    }
    get tertiaryFixed() {
        return this.getArgb(this.colors.tertiaryFixed());
    }
    get tertiaryFixedDim() {
        return this.getArgb(this.colors.tertiaryFixedDim());
    }
    get onTertiaryFixed() {
        return this.getArgb(this.colors.onTertiaryFixed());
    }
    get onTertiaryFixedVariant() {
        return this.getArgb(this.colors.onTertiaryFixedVariant());
    }
    get error() {
        return this.getArgb(this.colors.error());
    }
    get errorDim() {
        const errorDim = this.colors.errorDim();
        if (errorDim === undefined) {
            throw new Error('`errorDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(errorDim);
    }
    get onError() {
        return this.getArgb(this.colors.onError());
    }
    get errorContainer() {
        return this.getArgb(this.colors.errorContainer());
    }
    get onErrorContainer() {
        return this.getArgb(this.colors.onErrorContainer());
    }
}
DynamicScheme.DEFAULT_SPEC_VERSION = '2021';
DynamicScheme.DEFAULT_PLATFORM = 'phone';
export class DynamicSchemePalettesDelegateImpl2021 {
    getPrimaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, sourceColorHct.chroma);
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(math.sanitizeDegreesDouble(sourceColorHct.hue - 50.0), 48.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 12.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 48.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 36.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(math.sanitizeDegreesDouble(sourceColorHct.hue + 240), 40);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 200.0);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getSecondaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, Math.max(sourceColorHct.chroma - 32.0, sourceColorHct.chroma * 0.5));
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(math.sanitizeDegreesDouble(sourceColorHct.hue - 50.0), 36.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 8.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 21, 51, 121, 151, 191, 271, 321, 360], [45, 95, 45, 20, 45, 90, 45, 45, 45]), 24.0);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 41, 61, 101, 131, 181, 251, 301, 360], [18, 15, 10, 12, 15, 18, 15, 12, 12]), 24.0);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getTertiaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
                return TonalPalette.fromHct(DislikeAnalyzer.fixIfDisliked(new TemperatureCache(sourceColorHct)
                    .analogous(3, 6)[2]));
            case Variant.FIDELITY:
                return TonalPalette.fromHct(DislikeAnalyzer.fixIfDisliked(new TemperatureCache(sourceColorHct).complement));
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 36.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.RAINBOW:
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(math.sanitizeDegreesDouble(sourceColorHct.hue + 60.0), 24.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 21, 51, 121, 151, 191, 271, 321, 360], [120, 120, 20, 45, 20, 15, 20, 120, 120]), 32.0);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 41, 61, 101, 131, 181, 251, 301, 360], [35, 30, 20, 25, 30, 35, 30, 25, 25]), 32.0);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getNeutralPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, sourceColorHct.chroma / 8.0);
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 10.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 2.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 6.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(math.sanitizeDegreesDouble(sourceColorHct.hue + 15), 8);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 10);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getNeutralVariantPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (sourceColorHct.chroma / 8.0) + 4.0);
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (sourceColorHct.chroma / 8.0) + 4.0);
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 2.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 8.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(math.sanitizeDegreesDouble(sourceColorHct.hue + 15), 12);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 12);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getErrorPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        return undefined;
    }
}
const spec2021 = new DynamicSchemePalettesDelegateImpl2021();
let spec2025;
export function registerPaletteSpec(delegate) {
    spec2025 = delegate;
}
function getSpec(specVersion) {
    return specVersion === '2025' && spec2025 ? spec2025 : spec2021;
}
