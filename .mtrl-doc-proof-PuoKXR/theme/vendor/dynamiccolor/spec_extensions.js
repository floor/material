/*! @license Copyright 2025 Google LLC | Apache-2.0 (see NOTICE) */
import { DynamicColor } from "./dynamic_color.js";
function validateExtendedColor(originalColor, specVersion, extendedColor) {
    if (originalColor.name !== extendedColor.name) {
        throw new Error(`Attempting to extend color ${originalColor.name} with color ${extendedColor.name} of different name for spec version ${specVersion}.`);
    }
    if (originalColor.isBackground !== extendedColor.isBackground) {
        throw new Error(`Attempting to extend color ${originalColor.name} as a ${(originalColor.isBackground ?
            'background' :
            'foreground')} with color ${extendedColor.name} as a ${(extendedColor.isBackground ?
            'background' :
            'foreground')} for spec version ${specVersion}.`);
    }
}
export function extendSpecVersion(originlColor, specVersion, extendedColor) {
    validateExtendedColor(originlColor, specVersion, extendedColor);
    return DynamicColor.fromPalette({
        name: originlColor.name,
        palette: (s) => s.specVersion === specVersion ? extendedColor.palette(s) :
            originlColor.palette(s),
        tone: (s) => s.specVersion === specVersion ? extendedColor.tone(s) :
            originlColor.tone(s),
        isBackground: originlColor.isBackground,
        chromaMultiplier: (s) => {
            const chromaMultiplier = s.specVersion === specVersion ?
                extendedColor.chromaMultiplier :
                originlColor.chromaMultiplier;
            return chromaMultiplier !== undefined ? chromaMultiplier(s) : 1;
        },
        background: (s) => {
            const background = s.specVersion === specVersion ?
                extendedColor.background :
                originlColor.background;
            return background !== undefined ? background(s) : undefined;
        },
        secondBackground: (s) => {
            const secondBackground = s.specVersion === specVersion ?
                extendedColor.secondBackground :
                originlColor.secondBackground;
            return secondBackground !== undefined ? secondBackground(s) : undefined;
        },
        contrastCurve: (s) => {
            const contrastCurve = s.specVersion === specVersion ?
                extendedColor.contrastCurve :
                originlColor.contrastCurve;
            return contrastCurve !== undefined ? contrastCurve(s) : undefined;
        },
        toneDeltaPair: (s) => {
            const toneDeltaPair = s.specVersion === specVersion ?
                extendedColor.toneDeltaPair :
                originlColor.toneDeltaPair;
            return toneDeltaPair !== undefined ? toneDeltaPair(s) : undefined;
        },
    });
}
