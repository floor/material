/*! @license Copyright 2022 Google LLC | Apache-2.0 (see NOTICE) */
import { Contrast } from "../contrast/contrast.js";
import { Hct } from "../hct/hct.js";
import * as math from "../utils/math_utils.js";
export class DynamicColor {
    static fromPalette(args) {
        return new DynamicColor(args.name ?? '', args.palette, args.tone ?? DynamicColor.getInitialToneFromBackground(args.background), args.isBackground ?? false, args.chromaMultiplier, args.background, args.secondBackground, args.contrastCurve, args.toneDeltaPair);
    }
    static getInitialToneFromBackground(background) {
        if (background === undefined) {
            return (s) => 50;
        }
        return (s) => background(s) ? background(s).getTone(s) : 50;
    }
    constructor(name, palette, tone, isBackground, chromaMultiplier, background, secondBackground, contrastCurve, toneDeltaPair) {
        this.name = name;
        this.palette = palette;
        this.tone = tone;
        this.isBackground = isBackground;
        this.chromaMultiplier = chromaMultiplier;
        this.background = background;
        this.secondBackground = secondBackground;
        this.contrastCurve = contrastCurve;
        this.toneDeltaPair = toneDeltaPair;
        this.hctCache = new Map();
        if ((!background) && secondBackground) {
            throw new Error(`Color ${name} has secondBackground` +
                `defined, but background is not defined.`);
        }
        if ((!background) && contrastCurve) {
            throw new Error(`Color ${name} has contrastCurve` +
                `defined, but background is not defined.`);
        }
        if (background && !contrastCurve) {
            throw new Error(`Color ${name} has background` +
                `defined, but contrastCurve is not defined.`);
        }
    }
    clone() {
        return DynamicColor.fromPalette({
            name: this.name,
            palette: this.palette,
            tone: this.tone,
            isBackground: this.isBackground,
            chromaMultiplier: this.chromaMultiplier,
            background: this.background,
            secondBackground: this.secondBackground,
            contrastCurve: this.contrastCurve,
            toneDeltaPair: this.toneDeltaPair,
        });
    }
    clearCache() {
        this.hctCache.clear();
    }
    getArgb(scheme) {
        return this.getHct(scheme).toInt();
    }
    getHct(scheme) {
        const cachedAnswer = this.hctCache.get(scheme);
        if (cachedAnswer != null) {
            return cachedAnswer;
        }
        const answer = getSpec(scheme.specVersion).getHct(scheme, this);
        if (this.hctCache.size > 4) {
            this.hctCache.clear();
        }
        this.hctCache.set(scheme, answer);
        return answer;
    }
    getTone(scheme) {
        return getSpec(scheme.specVersion).getTone(scheme, this);
    }
    static foregroundTone(bgTone, ratio) {
        const lighterTone = Contrast.lighterUnsafe(bgTone, ratio);
        const darkerTone = Contrast.darkerUnsafe(bgTone, ratio);
        const lighterRatio = Contrast.ratioOfTones(lighterTone, bgTone);
        const darkerRatio = Contrast.ratioOfTones(darkerTone, bgTone);
        const preferLighter = DynamicColor.tonePrefersLightForeground(bgTone);
        if (preferLighter) {
            const negligibleDifference = Math.abs(lighterRatio - darkerRatio) < 0.1 &&
                lighterRatio < ratio && darkerRatio < ratio;
            return lighterRatio >= ratio || lighterRatio >= darkerRatio ||
                negligibleDifference ?
                lighterTone :
                darkerTone;
        }
        else {
            return darkerRatio >= ratio || darkerRatio >= lighterRatio ? darkerTone :
                lighterTone;
        }
    }
    static tonePrefersLightForeground(tone) {
        return Math.round(tone) < 60.0;
    }
    static toneAllowsLightForeground(tone) {
        return Math.round(tone) <= 49.0;
    }
    static enableLightForeground(tone) {
        if (DynamicColor.tonePrefersLightForeground(tone) &&
            !DynamicColor.toneAllowsLightForeground(tone)) {
            return 49.0;
        }
        return tone;
    }
}
export class ColorCalculationDelegateImpl2021 {
    getHct(scheme, color) {
        const tone = color.getTone(scheme);
        const palette = color.palette(scheme);
        return palette.getHct(tone);
    }
    getTone(scheme, color) {
        const decreasingContrast = scheme.contrastLevel < 0;
        const toneDeltaPair = color.toneDeltaPair ? color.toneDeltaPair(scheme) : undefined;
        if (toneDeltaPair) {
            const roleA = toneDeltaPair.roleA;
            const roleB = toneDeltaPair.roleB;
            const delta = toneDeltaPair.delta;
            const polarity = toneDeltaPair.polarity;
            const stayTogether = toneDeltaPair.stayTogether;
            const aIsNearer = (polarity === 'nearer' ||
                (polarity === 'lighter' && !scheme.isDark) ||
                (polarity === 'darker' && scheme.isDark));
            const nearer = aIsNearer ? roleA : roleB;
            const farther = aIsNearer ? roleB : roleA;
            const amNearer = color.name === nearer.name;
            const expansionDir = scheme.isDark ? 1 : -1;
            let nTone = nearer.tone(scheme);
            let fTone = farther.tone(scheme);
            if (color.background && nearer.contrastCurve && farther.contrastCurve) {
                const bg = color.background(scheme);
                const nContrastCurve = nearer.contrastCurve(scheme);
                const fContrastCurve = farther.contrastCurve(scheme);
                if (bg && nContrastCurve && fContrastCurve) {
                    const bgTone = bg.getTone(scheme);
                    const nContrast = nContrastCurve.get(scheme.contrastLevel);
                    const fContrast = fContrastCurve.get(scheme.contrastLevel);
                    if (Contrast.ratioOfTones(bgTone, nTone) < nContrast) {
                        nTone = DynamicColor.foregroundTone(bgTone, nContrast);
                    }
                    if (Contrast.ratioOfTones(bgTone, fTone) < fContrast) {
                        fTone = DynamicColor.foregroundTone(bgTone, fContrast);
                    }
                    if (decreasingContrast) {
                        nTone = DynamicColor.foregroundTone(bgTone, nContrast);
                        fTone = DynamicColor.foregroundTone(bgTone, fContrast);
                    }
                }
            }
            if ((fTone - nTone) * expansionDir < delta) {
                fTone = math.clampDouble(0, 100, nTone + delta * expansionDir);
                if ((fTone - nTone) * expansionDir >= delta) {
                }
                else {
                    nTone = math.clampDouble(0, 100, fTone - delta * expansionDir);
                }
            }
            if (50 <= nTone && nTone < 60) {
                if (expansionDir > 0) {
                    nTone = 60;
                    fTone = Math.max(fTone, nTone + delta * expansionDir);
                }
                else {
                    nTone = 49;
                    fTone = Math.min(fTone, nTone + delta * expansionDir);
                }
            }
            else if (50 <= fTone && fTone < 60) {
                if (stayTogether) {
                    if (expansionDir > 0) {
                        nTone = 60;
                        fTone = Math.max(fTone, nTone + delta * expansionDir);
                    }
                    else {
                        nTone = 49;
                        fTone = Math.min(fTone, nTone + delta * expansionDir);
                    }
                }
                else {
                    if (expansionDir > 0) {
                        fTone = 60;
                    }
                    else {
                        fTone = 49;
                    }
                }
            }
            return amNearer ? nTone : fTone;
        }
        else {
            let answer = color.tone(scheme);
            if (color.background == undefined ||
                color.background(scheme) === undefined ||
                color.contrastCurve == undefined ||
                color.contrastCurve(scheme) === undefined) {
                return answer;
            }
            const bgTone = color.background(scheme).getTone(scheme);
            const desiredRatio = color.contrastCurve(scheme).get(scheme.contrastLevel);
            if (Contrast.ratioOfTones(bgTone, answer) >= desiredRatio) {
            }
            else {
                answer = DynamicColor.foregroundTone(bgTone, desiredRatio);
            }
            if (decreasingContrast) {
                answer = DynamicColor.foregroundTone(bgTone, desiredRatio);
            }
            if (color.isBackground && 50 <= answer && answer < 60) {
                if (Contrast.ratioOfTones(49, bgTone) >= desiredRatio) {
                    answer = 49;
                }
                else {
                    answer = 60;
                }
            }
            if (color.secondBackground == undefined ||
                color.secondBackground(scheme) === undefined) {
                return answer;
            }
            const [bg1, bg2] = [color.background, color.secondBackground];
            const [bgTone1, bgTone2] = [bg1(scheme).getTone(scheme), bg2(scheme).getTone(scheme)];
            const [upper, lower] = [Math.max(bgTone1, bgTone2), Math.min(bgTone1, bgTone2)];
            if (Contrast.ratioOfTones(upper, answer) >= desiredRatio &&
                Contrast.ratioOfTones(lower, answer) >= desiredRatio) {
                return answer;
            }
            const lightOption = Contrast.lighter(upper, desiredRatio);
            const darkOption = Contrast.darker(lower, desiredRatio);
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
const spec2021 = new ColorCalculationDelegateImpl2021();
let spec2025;
export function registerCalculationSpec(delegate) {
    spec2025 = delegate;
}
function getSpec(specVersion) {
    return specVersion === '2025' && spec2025 ? spec2025 : spec2021;
}
