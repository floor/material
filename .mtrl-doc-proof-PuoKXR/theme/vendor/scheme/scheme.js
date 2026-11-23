/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import { CorePalette } from "../palettes/core_palette.js";
export class Scheme {
    get primary() {
        return this.props.primary;
    }
    get onPrimary() {
        return this.props.onPrimary;
    }
    get primaryContainer() {
        return this.props.primaryContainer;
    }
    get onPrimaryContainer() {
        return this.props.onPrimaryContainer;
    }
    get secondary() {
        return this.props.secondary;
    }
    get onSecondary() {
        return this.props.onSecondary;
    }
    get secondaryContainer() {
        return this.props.secondaryContainer;
    }
    get onSecondaryContainer() {
        return this.props.onSecondaryContainer;
    }
    get tertiary() {
        return this.props.tertiary;
    }
    get onTertiary() {
        return this.props.onTertiary;
    }
    get tertiaryContainer() {
        return this.props.tertiaryContainer;
    }
    get onTertiaryContainer() {
        return this.props.onTertiaryContainer;
    }
    get error() {
        return this.props.error;
    }
    get onError() {
        return this.props.onError;
    }
    get errorContainer() {
        return this.props.errorContainer;
    }
    get onErrorContainer() {
        return this.props.onErrorContainer;
    }
    get background() {
        return this.props.background;
    }
    get onBackground() {
        return this.props.onBackground;
    }
    get surface() {
        return this.props.surface;
    }
    get onSurface() {
        return this.props.onSurface;
    }
    get surfaceVariant() {
        return this.props.surfaceVariant;
    }
    get onSurfaceVariant() {
        return this.props.onSurfaceVariant;
    }
    get outline() {
        return this.props.outline;
    }
    get outlineVariant() {
        return this.props.outlineVariant;
    }
    get shadow() {
        return this.props.shadow;
    }
    get scrim() {
        return this.props.scrim;
    }
    get inverseSurface() {
        return this.props.inverseSurface;
    }
    get inverseOnSurface() {
        return this.props.inverseOnSurface;
    }
    get inversePrimary() {
        return this.props.inversePrimary;
    }
    static light(argb) {
        return Scheme.lightFromCorePalette(CorePalette.of(argb));
    }
    static dark(argb) {
        return Scheme.darkFromCorePalette(CorePalette.of(argb));
    }
    static lightContent(argb) {
        return Scheme.lightFromCorePalette(CorePalette.contentOf(argb));
    }
    static darkContent(argb) {
        return Scheme.darkFromCorePalette(CorePalette.contentOf(argb));
    }
    static lightFromCorePalette(core) {
        return new Scheme({
            primary: core.a1.tone(40),
            onPrimary: core.a1.tone(100),
            primaryContainer: core.a1.tone(90),
            onPrimaryContainer: core.a1.tone(10),
            secondary: core.a2.tone(40),
            onSecondary: core.a2.tone(100),
            secondaryContainer: core.a2.tone(90),
            onSecondaryContainer: core.a2.tone(10),
            tertiary: core.a3.tone(40),
            onTertiary: core.a3.tone(100),
            tertiaryContainer: core.a3.tone(90),
            onTertiaryContainer: core.a3.tone(10),
            error: core.error.tone(40),
            onError: core.error.tone(100),
            errorContainer: core.error.tone(90),
            onErrorContainer: core.error.tone(10),
            background: core.n1.tone(99),
            onBackground: core.n1.tone(10),
            surface: core.n1.tone(99),
            onSurface: core.n1.tone(10),
            surfaceVariant: core.n2.tone(90),
            onSurfaceVariant: core.n2.tone(30),
            outline: core.n2.tone(50),
            outlineVariant: core.n2.tone(80),
            shadow: core.n1.tone(0),
            scrim: core.n1.tone(0),
            inverseSurface: core.n1.tone(20),
            inverseOnSurface: core.n1.tone(95),
            inversePrimary: core.a1.tone(80)
        });
    }
    static darkFromCorePalette(core) {
        return new Scheme({
            primary: core.a1.tone(80),
            onPrimary: core.a1.tone(20),
            primaryContainer: core.a1.tone(30),
            onPrimaryContainer: core.a1.tone(90),
            secondary: core.a2.tone(80),
            onSecondary: core.a2.tone(20),
            secondaryContainer: core.a2.tone(30),
            onSecondaryContainer: core.a2.tone(90),
            tertiary: core.a3.tone(80),
            onTertiary: core.a3.tone(20),
            tertiaryContainer: core.a3.tone(30),
            onTertiaryContainer: core.a3.tone(90),
            error: core.error.tone(80),
            onError: core.error.tone(20),
            errorContainer: core.error.tone(30),
            onErrorContainer: core.error.tone(80),
            background: core.n1.tone(10),
            onBackground: core.n1.tone(90),
            surface: core.n1.tone(10),
            onSurface: core.n1.tone(90),
            surfaceVariant: core.n2.tone(30),
            onSurfaceVariant: core.n2.tone(80),
            outline: core.n2.tone(60),
            outlineVariant: core.n2.tone(30),
            shadow: core.n1.tone(0),
            scrim: core.n1.tone(0),
            inverseSurface: core.n1.tone(90),
            inverseOnSurface: core.n1.tone(20),
            inversePrimary: core.a1.tone(40)
        });
    }
    constructor(props) {
        this.props = props;
    }
    toJSON() {
        return {
            ...this.props
        };
    }
}
