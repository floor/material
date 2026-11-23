/*! @license Copyright 2022 Google LLC | Apache-2.0 (see NOTICE) */
import * as utils from "../utils/color_utils.js";
import * as math from "../utils/math_utils.js";
export class Contrast {
    static ratioOfTones(toneA, toneB) {
        toneA = math.clampDouble(0.0, 100.0, toneA);
        toneB = math.clampDouble(0.0, 100.0, toneB);
        return Contrast.ratioOfYs(utils.yFromLstar(toneA), utils.yFromLstar(toneB));
    }
    static ratioOfYs(y1, y2) {
        const lighter = y1 > y2 ? y1 : y2;
        const darker = (lighter === y2) ? y1 : y2;
        return (lighter + 5.0) / (darker + 5.0);
    }
    static lighter(tone, ratio) {
        if (tone < 0.0 || tone > 100.0) {
            return -1.0;
        }
        const darkY = utils.yFromLstar(tone);
        const lightY = ratio * (darkY + 5.0) - 5.0;
        const realContrast = Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);
        if (realContrast < ratio && delta > 0.04) {
            return -1;
        }
        const returnValue = utils.lstarFromY(lightY) + 0.4;
        if (returnValue < 0 || returnValue > 100) {
            return -1;
        }
        return returnValue;
    }
    static darker(tone, ratio) {
        if (tone < 0.0 || tone > 100.0) {
            return -1.0;
        }
        const lightY = utils.yFromLstar(tone);
        const darkY = ((lightY + 5.0) / ratio) - 5.0;
        const realContrast = Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);
        if (realContrast < ratio && delta > 0.04) {
            return -1;
        }
        const returnValue = utils.lstarFromY(darkY) - 0.4;
        if (returnValue < 0 || returnValue > 100) {
            return -1;
        }
        return returnValue;
    }
    static lighterUnsafe(tone, ratio) {
        const lighterSafe = Contrast.lighter(tone, ratio);
        return (lighterSafe < 0.0) ? 100.0 : lighterSafe;
    }
    static darkerUnsafe(tone, ratio) {
        const darkerSafe = Contrast.darker(tone, ratio);
        return (darkerSafe < 0.0) ? 0.0 : darkerSafe;
    }
}
