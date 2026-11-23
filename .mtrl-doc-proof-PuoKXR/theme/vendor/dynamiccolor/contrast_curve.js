/*! @license Copyright 2023 Google LLC | Apache-2.0 (see NOTICE) */
import * as math from "../utils/math_utils.js";
export class ContrastCurve {
    constructor(low, normal, medium, high) {
        this.low = low;
        this.normal = normal;
        this.medium = medium;
        this.high = high;
    }
    get(contrastLevel) {
        if (contrastLevel <= -1.0) {
            return this.low;
        }
        else if (contrastLevel < 0.0) {
            return math.lerp(this.low, this.normal, (contrastLevel - (-1)) / 1);
        }
        else if (contrastLevel < 0.5) {
            return math.lerp(this.normal, this.medium, (contrastLevel - 0) / 0.5);
        }
        else if (contrastLevel < 1.0) {
            return math.lerp(this.medium, this.high, (contrastLevel - 0.5) / 0.5);
        }
        else {
            return this.high;
        }
    }
}
