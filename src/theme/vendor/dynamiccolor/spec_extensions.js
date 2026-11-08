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
import { DynamicColor } from './dynamic_color.js';
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
/**
 * Returns a new DynamicColor that is the same as the original color, but with
 * the extended dynamic color's constraints for the given spec version.
 *
 * @param originlColor The original color.
 * @param specVersion The spec version to extend.
 * @param extendedColor The color with the values to extend.
 */
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
