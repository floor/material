/*!
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Contrast } from '../contrast/contrast.js';
import { Hct } from '../hct/hct.js';
import { TonalPalette } from '../palettes/tonal_palette.js';
import * as math from '../utils/math_utils.js';
import { ColorSpecDelegateImpl2025 } from './color_spec_2025.js';
import { DynamicColor, ColorCalculationDelegateImpl2021, registerCalculationSpec } from './dynamic_color.js';
import { DynamicScheme, DynamicSchemePalettesDelegateImpl2021, registerPaletteSpec } from './dynamic_scheme.js';
import { MaterialDynamicColors } from './material_dynamic_colors.js';
import { Variant } from './variant.js';
/**
 * A delegate for the palettes of a DynamicScheme in the 2025 spec.
 */
class DynamicSchemePalettesDelegateImpl2025 extends DynamicSchemePalettesDelegateImpl2021 {
    //////////////////////////////////////////////////////////////////
    // Scheme Palettes                                              //
    //////////////////////////////////////////////////////////////////
    getPrimaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? (Hct.isBlue(sourceColorHct.hue) ? 12 : 8) :
                    (Hct.isBlue(sourceColorHct.hue) ? 16 : 12));
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' && isDark ? 26 : 32);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? (isDark ? 36 : 48) : 40);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? 74 : 56);
            default:
                return super.getPrimaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getSecondaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? (Hct.isBlue(sourceColorHct.hue) ? 6 : 4) :
                    (Hct.isBlue(sourceColorHct.hue) ? 10 : 6));
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 105, 140, 204, 253, 278, 300, 333, 360], [-160, 155, -100, 96, -96, -156, -165, -160]), platform === 'phone' ? (isDark ? 16 : 24) : 24);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 105, 140, 333, 360], [-14, 10, -14, 10, -14]), platform === 'phone' ? 56 : 36);
            default:
                return super.getSecondaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getTertiaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 105, 161, 204, 278, 333, 360], [-32, 26, 10, -39, 24, -15, -32]), platform === 'phone' ? 20 : 36);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 20, 71, 161, 333, 360], [-40, 48, -32, 40, -32]), platform === 'phone' ? 28 : 32);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 105, 140, 204, 253, 278, 300, 333, 360], [-165, 160, -105, 101, -101, -160, -170, -165]), 48);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 71, 105, 140, 161, 253, 333, 360], [-72, 35, 24, -24, 62, 50, 62, -72]), 56);
            default:
                return super.getTertiaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    static getExpressiveNeutralHue(sourceColorHct) {
        const hue = DynamicScheme.getRotatedHue(sourceColorHct, [0, 71, 124, 253, 278, 300, 360], [10, 0, 10, 0, 10, 0]);
        return hue;
    }
    static getExpressiveNeutralChroma(sourceColorHct, isDark, platform) {
        const neutralHue = DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralHue(sourceColorHct);
        return platform === 'phone' ?
            (isDark ? (Hct.isYellow(neutralHue) ? 6 : 14) : 18) :
            12;
    }
    static getVibrantNeutralHue(sourceColorHct) {
        return DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 105, 140, 333, 360], [-14, 10, -14, 10, -14]);
    }
    static getVibrantNeutralChroma(sourceColorHct, platform) {
        const neutralHue = DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralHue(sourceColorHct);
        return platform === 'phone' ? 28 : (Hct.isBlue(neutralHue) ? 28 : 20);
    }
    getNeutralPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? 1.4 : 6);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? 5 : 10);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralHue(sourceColorHct), DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralChroma(sourceColorHct, isDark, platform));
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralHue(sourceColorHct), DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralChroma(sourceColorHct, platform));
            default:
                return super.getNeutralPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getNeutralVariantPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (platform === 'phone' ? 1.4 : 6) * 2.2);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (platform === 'phone' ? 5 : 10) * 1.7);
            case Variant.EXPRESSIVE:
                const expressiveNeutralHue = DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralHue(sourceColorHct);
                const expressiveNeutralChroma = DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralChroma(sourceColorHct, isDark, platform);
                return TonalPalette.fromHueAndChroma(expressiveNeutralHue, expressiveNeutralChroma *
                    (expressiveNeutralHue >= 105 && expressiveNeutralHue < 125 ?
                        1.6 :
                        2.3));
            case Variant.VIBRANT:
                const vibrantNeutralHue = DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralHue(sourceColorHct);
                const vibrantNeutralChroma = DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralChroma(sourceColorHct, platform);
                return TonalPalette.fromHueAndChroma(vibrantNeutralHue, vibrantNeutralChroma * 1.29);
            default:
                return super.getNeutralVariantPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getErrorPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        const errorHue = DynamicScheme.getPiecewiseHue(sourceColorHct, [0, 3, 13, 23, 33, 43, 153, 273, 360], [12, 22, 32, 12, 22, 32, 22, 12]);
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 50 : 40);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 60 : 48);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 64 : 48);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 80 : 60);
            default:
                return super.getErrorPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
}
/**
 * A delegate for the color calculation of a DynamicScheme in the 2025 spec.
 */
class ColorCalculationDelegateImpl2025 {
    getHct(scheme, color) {
        const palette = color.palette(scheme);
        const tone = color.getTone(scheme);
        const hue = palette.hue;
        const chroma = palette.chroma *
            (color.chromaMultiplier ? color.chromaMultiplier(scheme) : 1);
        return Hct.from(hue, chroma, tone);
    }
    getTone(scheme, color) {
        const toneDeltaPair = color.toneDeltaPair ? color.toneDeltaPair(scheme) : undefined;
        // Case 0: tone delta constraint.
        if (toneDeltaPair) {
            const roleA = toneDeltaPair.roleA;
            const roleB = toneDeltaPair.roleB;
            const polarity = toneDeltaPair.polarity;
            const constraint = toneDeltaPair.constraint;
            const absoluteDelta = polarity === 'darker' ||
                (polarity === 'relative_lighter' && scheme.isDark) ||
                (polarity === 'relative_darker' && !scheme.isDark) ?
                -toneDeltaPair.delta :
                toneDeltaPair.delta;
            const amRoleA = color.name === roleA.name;
            const selfRole = amRoleA ? roleA : roleB;
            const refRole = amRoleA ? roleB : roleA;
            let selfTone = selfRole.tone(scheme);
            let refTone = refRole.getTone(scheme);
            const relativeDelta = absoluteDelta * (amRoleA ? 1 : -1);
            if (constraint === 'exact') {
                selfTone = math.clampDouble(0, 100, refTone + relativeDelta);
            }
            else if (constraint === 'nearer') {
                if (relativeDelta > 0) {
                    selfTone = math.clampDouble(0, 100, math.clampDouble(refTone, refTone + relativeDelta, selfTone));
                }
                else {
                    selfTone = math.clampDouble(0, 100, math.clampDouble(refTone + relativeDelta, refTone, selfTone));
                }
            }
            else if (constraint === 'farther') {
                if (relativeDelta > 0) {
                    selfTone = math.clampDouble(refTone + relativeDelta, 100, selfTone);
                }
                else {
                    selfTone = math.clampDouble(0, refTone + relativeDelta, selfTone);
                }
            }
            if (color.background && color.contrastCurve) {
                const background = color.background(scheme);
                const contrastCurve = color.contrastCurve(scheme);
                if (background && contrastCurve) {
                    // Adjust the tones for contrast, if background and contrast curve
                    // are defined.
                    const bgTone = background.getTone(scheme);
                    const selfContrast = contrastCurve.get(scheme.contrastLevel);
                    selfTone = Contrast.ratioOfTones(bgTone, selfTone) >= selfContrast &&
                        scheme.contrastLevel >= 0 ?
                        selfTone :
                        DynamicColor.foregroundTone(bgTone, selfContrast);
                }
            }
            // This can avoid the awkward tones for background colors including the
            // access fixed colors. Accent fixed dim colors should not be adjusted.
            if (color.isBackground && !color.name.endsWith('_fixed_dim')) {
                if (selfTone >= 57) {
                    selfTone = math.clampDouble(65, 100, selfTone);
                }
                else {
                    selfTone = math.clampDouble(0, 49, selfTone);
                }
            }
            return selfTone;
        }
        else {
            // Case 1: No tone delta pair; just solve for itself.
            let answer = color.tone(scheme);
            if (color.background == undefined ||
                color.background(scheme) === undefined ||
                color.contrastCurve == undefined ||
                color.contrastCurve(scheme) === undefined) {
                return answer; // No adjustment for colors with no background.
            }
            const bgTone = color.background(scheme).getTone(scheme);
            const desiredRatio = color.contrastCurve(scheme).get(scheme.contrastLevel);
            // Recalculate the tone from desired contrast ratio if the current
            // contrast ratio is not enough or desired contrast level is decreasing
            // (<0).
            answer = Contrast.ratioOfTones(bgTone, answer) >= desiredRatio &&
                scheme.contrastLevel >= 0 ?
                answer :
                DynamicColor.foregroundTone(bgTone, desiredRatio);
            // This can avoid the awkward tones for background colors including the
            // access fixed colors. Accent fixed dim colors should not be adjusted.
            if (color.isBackground && !color.name.endsWith('_fixed_dim')) {
                if (answer >= 57) {
                    answer = math.clampDouble(65, 100, answer);
                }
                else {
                    answer = math.clampDouble(0, 49, answer);
                }
            }
            if (color.secondBackground == undefined ||
                color.secondBackground(scheme) === undefined) {
                return answer;
            }
            // Case 2: Adjust for dual backgrounds.
            const [bg1, bg2] = [color.background, color.secondBackground];
            const [bgTone1, bgTone2] = [bg1(scheme).getTone(scheme), bg2(scheme).getTone(scheme)];
            const [upper, lower] = [Math.max(bgTone1, bgTone2), Math.min(bgTone1, bgTone2)];
            if (Contrast.ratioOfTones(upper, answer) >= desiredRatio &&
                Contrast.ratioOfTones(lower, answer) >= desiredRatio) {
                return answer;
            }
            // The darkest light tone that satisfies the desired ratio,
            // or -1 if such ratio cannot be reached.
            const lightOption = Contrast.lighter(upper, desiredRatio);
            // The lightest dark tone that satisfies the desired ratio,
            // or -1 if such ratio cannot be reached.
            const darkOption = Contrast.darker(lower, desiredRatio);
            // Tones suitable for the foreground.
            const availables = [];
            if (lightOption !== -1)
                availables.push(lightOption);
            if (darkOption !== -1)
                availables.push(darkOption);
            const prefersLight = DynamicColor.tonePrefersLightForeground(bgTone1) ||
                DynamicColor.tonePrefersLightForeground(bgTone2);
            if (prefersLight) {
                return (lightOption < 0) ? 100 : lightOption;
            }
            if (availables.length === 1) {
                return availables[0];
            }
            return (darkOption < 0) ? 0 : darkOption;
        }
    }
}
/**
 * Makes the 2025 spec reachable: registers its palette and calculation
 * delegates, and switches the shared role table to the 2025 delegate (whose
 * `extendSpecVersion` entries fall back to 2021 for a 2021 scheme). An entry
 * calls this at module scope; a side-effect-only import would be dropped by a
 * consumer bundler because the published `sideEffects` is a narrow allowlist.
 */
export function registerSpec2025() {
    registerPaletteSpec(new DynamicSchemePalettesDelegateImpl2025());
    registerCalculationSpec(new ColorCalculationDelegateImpl2025());
    MaterialDynamicColors.colorSpec = new ColorSpecDelegateImpl2025();
}
