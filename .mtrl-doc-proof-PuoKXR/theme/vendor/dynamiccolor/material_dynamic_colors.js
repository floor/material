/*! @license Copyright 2022 Google LLC | Apache-2.0 (see NOTICE) */
import { ColorSpecDelegateImpl2021 } from "./color_spec_2021.js";
export class MaterialDynamicColors {
    constructor() {
        this.allColors = [
            this.background(),
            this.onBackground(),
            this.surface(),
            this.surfaceDim(),
            this.surfaceBright(),
            this.surfaceContainerLowest(),
            this.surfaceContainerLow(),
            this.surfaceContainer(),
            this.surfaceContainerHigh(),
            this.surfaceContainerHighest(),
            this.onSurface(),
            this.onSurfaceVariant(),
            this.outline(),
            this.outlineVariant(),
            this.inverseSurface(),
            this.inverseOnSurface(),
            this.primary(),
            this.primaryDim(),
            this.onPrimary(),
            this.primaryContainer(),
            this.onPrimaryContainer(),
            this.primaryFixed(),
            this.primaryFixedDim(),
            this.onPrimaryFixed(),
            this.onPrimaryFixedVariant(),
            this.inversePrimary(),
            this.secondary(),
            this.secondaryDim(),
            this.onSecondary(),
            this.secondaryContainer(),
            this.onSecondaryContainer(),
            this.secondaryFixed(),
            this.secondaryFixedDim(),
            this.onSecondaryFixed(),
            this.onSecondaryFixedVariant(),
            this.tertiary(),
            this.tertiaryDim(),
            this.onTertiary(),
            this.tertiaryContainer(),
            this.onTertiaryContainer(),
            this.tertiaryFixed(),
            this.tertiaryFixedDim(),
            this.onTertiaryFixed(),
            this.onTertiaryFixedVariant(),
            this.error(),
            this.errorDim(),
            this.onError(),
            this.errorContainer(),
            this.onErrorContainer(),
        ].filter((c) => c !== undefined);
    }
    highestSurface(s) {
        return MaterialDynamicColors.colorSpec.highestSurface(s);
    }
    primaryPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.primaryPaletteKeyColor();
    }
    secondaryPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.secondaryPaletteKeyColor();
    }
    tertiaryPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.tertiaryPaletteKeyColor();
    }
    neutralPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.neutralPaletteKeyColor();
    }
    neutralVariantPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.neutralVariantPaletteKeyColor();
    }
    errorPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.errorPaletteKeyColor();
    }
    background() {
        return MaterialDynamicColors.colorSpec.background();
    }
    onBackground() {
        return MaterialDynamicColors.colorSpec.onBackground();
    }
    surface() {
        return MaterialDynamicColors.colorSpec.surface();
    }
    surfaceDim() {
        return MaterialDynamicColors.colorSpec.surfaceDim();
    }
    surfaceBright() {
        return MaterialDynamicColors.colorSpec.surfaceBright();
    }
    surfaceContainerLowest() {
        return MaterialDynamicColors.colorSpec.surfaceContainerLowest();
    }
    surfaceContainerLow() {
        return MaterialDynamicColors.colorSpec.surfaceContainerLow();
    }
    surfaceContainer() {
        return MaterialDynamicColors.colorSpec.surfaceContainer();
    }
    surfaceContainerHigh() {
        return MaterialDynamicColors.colorSpec.surfaceContainerHigh();
    }
    surfaceContainerHighest() {
        return MaterialDynamicColors.colorSpec.surfaceContainerHighest();
    }
    onSurface() {
        return MaterialDynamicColors.colorSpec.onSurface();
    }
    surfaceVariant() {
        return MaterialDynamicColors.colorSpec.surfaceVariant();
    }
    onSurfaceVariant() {
        return MaterialDynamicColors.colorSpec.onSurfaceVariant();
    }
    outline() {
        return MaterialDynamicColors.colorSpec.outline();
    }
    outlineVariant() {
        return MaterialDynamicColors.colorSpec.outlineVariant();
    }
    inverseSurface() {
        return MaterialDynamicColors.colorSpec.inverseSurface();
    }
    inverseOnSurface() {
        return MaterialDynamicColors.colorSpec.inverseOnSurface();
    }
    shadow() {
        return MaterialDynamicColors.colorSpec.shadow();
    }
    scrim() {
        return MaterialDynamicColors.colorSpec.scrim();
    }
    surfaceTint() {
        return MaterialDynamicColors.colorSpec.surfaceTint();
    }
    primary() {
        return MaterialDynamicColors.colorSpec.primary();
    }
    primaryDim() {
        return MaterialDynamicColors.colorSpec.primaryDim();
    }
    onPrimary() {
        return MaterialDynamicColors.colorSpec.onPrimary();
    }
    primaryContainer() {
        return MaterialDynamicColors.colorSpec.primaryContainer();
    }
    onPrimaryContainer() {
        return MaterialDynamicColors.colorSpec.onPrimaryContainer();
    }
    inversePrimary() {
        return MaterialDynamicColors.colorSpec.inversePrimary();
    }
    primaryFixed() {
        return MaterialDynamicColors.colorSpec.primaryFixed();
    }
    primaryFixedDim() {
        return MaterialDynamicColors.colorSpec.primaryFixedDim();
    }
    onPrimaryFixed() {
        return MaterialDynamicColors.colorSpec.onPrimaryFixed();
    }
    onPrimaryFixedVariant() {
        return MaterialDynamicColors.colorSpec.onPrimaryFixedVariant();
    }
    secondary() {
        return MaterialDynamicColors.colorSpec.secondary();
    }
    secondaryDim() {
        return MaterialDynamicColors.colorSpec.secondaryDim();
    }
    onSecondary() {
        return MaterialDynamicColors.colorSpec.onSecondary();
    }
    secondaryContainer() {
        return MaterialDynamicColors.colorSpec.secondaryContainer();
    }
    onSecondaryContainer() {
        return MaterialDynamicColors.colorSpec.onSecondaryContainer();
    }
    secondaryFixed() {
        return MaterialDynamicColors.colorSpec.secondaryFixed();
    }
    secondaryFixedDim() {
        return MaterialDynamicColors.colorSpec.secondaryFixedDim();
    }
    onSecondaryFixed() {
        return MaterialDynamicColors.colorSpec.onSecondaryFixed();
    }
    onSecondaryFixedVariant() {
        return MaterialDynamicColors.colorSpec.onSecondaryFixedVariant();
    }
    tertiary() {
        return MaterialDynamicColors.colorSpec.tertiary();
    }
    tertiaryDim() {
        return MaterialDynamicColors.colorSpec.tertiaryDim();
    }
    onTertiary() {
        return MaterialDynamicColors.colorSpec.onTertiary();
    }
    tertiaryContainer() {
        return MaterialDynamicColors.colorSpec.tertiaryContainer();
    }
    onTertiaryContainer() {
        return MaterialDynamicColors.colorSpec.onTertiaryContainer();
    }
    tertiaryFixed() {
        return MaterialDynamicColors.colorSpec.tertiaryFixed();
    }
    tertiaryFixedDim() {
        return MaterialDynamicColors.colorSpec.tertiaryFixedDim();
    }
    onTertiaryFixed() {
        return MaterialDynamicColors.colorSpec.onTertiaryFixed();
    }
    onTertiaryFixedVariant() {
        return MaterialDynamicColors.colorSpec.onTertiaryFixedVariant();
    }
    error() {
        return MaterialDynamicColors.colorSpec.error();
    }
    errorDim() {
        return MaterialDynamicColors.colorSpec.errorDim();
    }
    onError() {
        return MaterialDynamicColors.colorSpec.onError();
    }
    errorContainer() {
        return MaterialDynamicColors.colorSpec.errorContainer();
    }
    onErrorContainer() {
        return MaterialDynamicColors.colorSpec.onErrorContainer();
    }
    static highestSurface(s) {
        return MaterialDynamicColors.colorSpec.highestSurface(s);
    }
}
MaterialDynamicColors.contentAccentToneDelta = 15.0;
MaterialDynamicColors.colorSpec = new ColorSpecDelegateImpl2021();
MaterialDynamicColors.primaryPaletteKeyColor = MaterialDynamicColors.colorSpec.primaryPaletteKeyColor();
MaterialDynamicColors.secondaryPaletteKeyColor = MaterialDynamicColors.colorSpec.secondaryPaletteKeyColor();
MaterialDynamicColors.tertiaryPaletteKeyColor = MaterialDynamicColors.colorSpec.tertiaryPaletteKeyColor();
MaterialDynamicColors.neutralPaletteKeyColor = MaterialDynamicColors.colorSpec.neutralPaletteKeyColor();
MaterialDynamicColors.neutralVariantPaletteKeyColor = MaterialDynamicColors.colorSpec.neutralVariantPaletteKeyColor();
MaterialDynamicColors.background = MaterialDynamicColors.colorSpec.background();
MaterialDynamicColors.onBackground = MaterialDynamicColors.colorSpec.onBackground();
MaterialDynamicColors.surface = MaterialDynamicColors.colorSpec.surface();
MaterialDynamicColors.surfaceDim = MaterialDynamicColors.colorSpec.surfaceDim();
MaterialDynamicColors.surfaceBright = MaterialDynamicColors.colorSpec.surfaceBright();
MaterialDynamicColors.surfaceContainerLowest = MaterialDynamicColors.colorSpec.surfaceContainerLowest();
MaterialDynamicColors.surfaceContainerLow = MaterialDynamicColors.colorSpec.surfaceContainerLow();
MaterialDynamicColors.surfaceContainer = MaterialDynamicColors.colorSpec.surfaceContainer();
MaterialDynamicColors.surfaceContainerHigh = MaterialDynamicColors.colorSpec.surfaceContainerHigh();
MaterialDynamicColors.surfaceContainerHighest = MaterialDynamicColors.colorSpec.surfaceContainerHighest();
MaterialDynamicColors.onSurface = MaterialDynamicColors.colorSpec.onSurface();
MaterialDynamicColors.surfaceVariant = MaterialDynamicColors.colorSpec.surfaceVariant();
MaterialDynamicColors.onSurfaceVariant = MaterialDynamicColors.colorSpec.onSurfaceVariant();
MaterialDynamicColors.inverseSurface = MaterialDynamicColors.colorSpec.inverseSurface();
MaterialDynamicColors.inverseOnSurface = MaterialDynamicColors.colorSpec.inverseOnSurface();
MaterialDynamicColors.outline = MaterialDynamicColors.colorSpec.outline();
MaterialDynamicColors.outlineVariant = MaterialDynamicColors.colorSpec.outlineVariant();
MaterialDynamicColors.shadow = MaterialDynamicColors.colorSpec.shadow();
MaterialDynamicColors.scrim = MaterialDynamicColors.colorSpec.scrim();
MaterialDynamicColors.surfaceTint = MaterialDynamicColors.colorSpec.surfaceTint();
MaterialDynamicColors.primary = MaterialDynamicColors.colorSpec.primary();
MaterialDynamicColors.onPrimary = MaterialDynamicColors.colorSpec.onPrimary();
MaterialDynamicColors.primaryContainer = MaterialDynamicColors.colorSpec.primaryContainer();
MaterialDynamicColors.onPrimaryContainer = MaterialDynamicColors.colorSpec.onPrimaryContainer();
MaterialDynamicColors.inversePrimary = MaterialDynamicColors.colorSpec.inversePrimary();
MaterialDynamicColors.secondary = MaterialDynamicColors.colorSpec.secondary();
MaterialDynamicColors.onSecondary = MaterialDynamicColors.colorSpec.onSecondary();
MaterialDynamicColors.secondaryContainer = MaterialDynamicColors.colorSpec.secondaryContainer();
MaterialDynamicColors.onSecondaryContainer = MaterialDynamicColors.colorSpec.onSecondaryContainer();
MaterialDynamicColors.tertiary = MaterialDynamicColors.colorSpec.tertiary();
MaterialDynamicColors.onTertiary = MaterialDynamicColors.colorSpec.onTertiary();
MaterialDynamicColors.tertiaryContainer = MaterialDynamicColors.colorSpec.tertiaryContainer();
MaterialDynamicColors.onTertiaryContainer = MaterialDynamicColors.colorSpec.onTertiaryContainer();
MaterialDynamicColors.error = MaterialDynamicColors.colorSpec.error();
MaterialDynamicColors.onError = MaterialDynamicColors.colorSpec.onError();
MaterialDynamicColors.errorContainer = MaterialDynamicColors.colorSpec.errorContainer();
MaterialDynamicColors.onErrorContainer = MaterialDynamicColors.colorSpec.onErrorContainer();
MaterialDynamicColors.primaryFixed = MaterialDynamicColors.colorSpec.primaryFixed();
MaterialDynamicColors.primaryFixedDim = MaterialDynamicColors.colorSpec.primaryFixedDim();
MaterialDynamicColors.onPrimaryFixed = MaterialDynamicColors.colorSpec.onPrimaryFixed();
MaterialDynamicColors.onPrimaryFixedVariant = MaterialDynamicColors.colorSpec.onPrimaryFixedVariant();
MaterialDynamicColors.secondaryFixed = MaterialDynamicColors.colorSpec.secondaryFixed();
MaterialDynamicColors.secondaryFixedDim = MaterialDynamicColors.colorSpec.secondaryFixedDim();
MaterialDynamicColors.onSecondaryFixed = MaterialDynamicColors.colorSpec.onSecondaryFixed();
MaterialDynamicColors.onSecondaryFixedVariant = MaterialDynamicColors.colorSpec.onSecondaryFixedVariant();
MaterialDynamicColors.tertiaryFixed = MaterialDynamicColors.colorSpec.tertiaryFixed();
MaterialDynamicColors.tertiaryFixedDim = MaterialDynamicColors.colorSpec.tertiaryFixedDim();
MaterialDynamicColors.onTertiaryFixed = MaterialDynamicColors.colorSpec.onTertiaryFixed();
MaterialDynamicColors.onTertiaryFixedVariant = MaterialDynamicColors.colorSpec.onTertiaryFixedVariant();
