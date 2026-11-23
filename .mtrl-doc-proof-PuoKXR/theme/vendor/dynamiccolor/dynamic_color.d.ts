/** Registers the 2025 colour-calculation delegate; without one, every version is 2021. */
export function registerCalculationSpec(delegate: any): void;
/** A color that adjusts itself based on UI state provided by DynamicScheme. */
export class DynamicColor {
    /**
 * Create a DynamicColor defined by a TonalPalette and HCT tone.
 * @param args
 */
    static fromPalette(args: any): DynamicColor;
    static getInitialToneFromBackground(background: any): (s: any) => any;
    /**
 * Given a background tone, finds a foreground tone, while ensuring they reach a contrast ratio that is as close to [ratio] as possible.
 * @param bgTone
 * @param ratio
 */
    static foregroundTone(bgTone: any, ratio: any): number;
    /** Returns whether [tone] prefers a light foreground. */
    static tonePrefersLightForeground(tone: any): boolean;
    /** Returns whether [tone] can reach a contrast ratio of 4.5 with a lighter color. */
    static toneAllowsLightForeground(tone: any): boolean;
    /** Adjusts a tone such that white has 4.5 contrast, if the tone is reasonably close to supporting it. */
    static enableLightForeground(tone: any): any;
    /**
 * The base constructor for DynamicColor.
 * @param name
 * @param palette
 * @param tone
 * @param isBackground
 * @param chromaMultiplier
 * @param background
 * @param secondBackground
 * @param contrastCurve
 * @param toneDeltaPair
 */
    constructor(name: any, palette: any, tone: any, isBackground: any, chromaMultiplier: any, background: any, secondBackground: any, contrastCurve: any, toneDeltaPair: any);
    name: any;
    palette: any;
    tone: any;
    isBackground: any;
    chromaMultiplier: any;
    background: any;
    secondBackground: any;
    contrastCurve: any;
    toneDeltaPair: any;
    hctCache: Map<any, any>;
    /** Returns a deep copy of this DynamicColor. */
    clone(): DynamicColor;
    /** Clears the cache of HCT values for this color. */
    clearCache(): void;
    /**
 * Returns a ARGB integer (i.e.
 * @param scheme
 */
    getArgb(scheme: any): any;
    /**
 * Returns a color, expressed in the HCT color space, that this DynamicColor is under the conditions in scheme.
 * @param scheme
 */
    getHct(scheme: any): any;
    /**
 * Returns a tone, T in the HCT color space, that this DynamicColor is under the conditions in scheme.
 * @param scheme
 */
    getTone(scheme: any): any;
}
/** A delegate for the color calculation of a DynamicScheme in the 2021 spec. */
export class ColorCalculationDelegateImpl2021 {
    getHct(scheme: any, color: any): any;
    getTone(scheme: any, color: any): any;
}
