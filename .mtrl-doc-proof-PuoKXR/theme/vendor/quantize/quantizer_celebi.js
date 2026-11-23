/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import { QuantizerWsmeans } from "./quantizer_wsmeans.js";
import { QuantizerWu } from "./quantizer_wu.js";
export class QuantizerCelebi {
    static quantize(pixels, maxColors) {
        const wu = new QuantizerWu();
        const wuResult = wu.quantize(pixels, maxColors);
        return QuantizerWsmeans.quantize(pixels, wuResult, maxColors);
    }
}
