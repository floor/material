/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import * as utils from "../utils/color_utils.js";
export class LabPointProvider {
    fromInt(argb) {
        return utils.labFromArgb(argb);
    }
    toInt(point) {
        return utils.argbFromLab(point[0], point[1], point[2]);
    }
    distance(from, to) {
        const dL = from[0] - to[0];
        const dA = from[1] - to[1];
        const dB = from[2] - to[2];
        return dL * dL + dA * dA + dB * dB;
    }
}
