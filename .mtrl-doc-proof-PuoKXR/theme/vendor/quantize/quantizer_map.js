/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import * as utils from "../utils/color_utils.js";
export class QuantizerMap {
    static quantize(pixels) {
        const countByColor = new Map();
        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const alpha = utils.alphaFromArgb(pixel);
            if (alpha < 255) {
                continue;
            }
            countByColor.set(pixel, (countByColor.get(pixel) ?? 0) + 1);
        }
        return countByColor;
    }
}
