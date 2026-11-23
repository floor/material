/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import { Hct } from "../hct/hct.js";
import * as math from "../utils/math_utils.js";
const SCORE_OPTION_DEFAULTS = {
    desired: 4,
    fallbackColorARGB: 0xff4285f4,
    filter: true,
};
function compare(a, b) {
    if (a.score > b.score) {
        return -1;
    }
    else if (a.score < b.score) {
        return 1;
    }
    return 0;
}
export class Score {
    constructor() { }
    static score(colorsToPopulation, options) {
        const { desired, fallbackColorARGB, filter } = { ...SCORE_OPTION_DEFAULTS, ...options };
        const colorsHct = [];
        const huePopulation = new Array(360).fill(0);
        let populationSum = 0;
        for (const [argb, population] of colorsToPopulation.entries()) {
            const hct = Hct.fromInt(argb);
            colorsHct.push(hct);
            const hue = Math.floor(hct.hue);
            huePopulation[hue] += population;
            populationSum += population;
        }
        const hueExcitedProportions = new Array(360).fill(0.0);
        for (let hue = 0; hue < 360; hue++) {
            const proportion = huePopulation[hue] / populationSum;
            for (let i = hue - 14; i < hue + 16; i++) {
                const neighborHue = math.sanitizeDegreesInt(i);
                hueExcitedProportions[neighborHue] += proportion;
            }
        }
        const scoredHct = new Array();
        for (const hct of colorsHct) {
            const hue = math.sanitizeDegreesInt(Math.round(hct.hue));
            const proportion = hueExcitedProportions[hue];
            if (filter && (hct.chroma < Score.CUTOFF_CHROMA || proportion <= Score.CUTOFF_EXCITED_PROPORTION)) {
                continue;
            }
            const proportionScore = proportion * 100.0 * Score.WEIGHT_PROPORTION;
            const chromaWeight = hct.chroma < Score.TARGET_CHROMA ? Score.WEIGHT_CHROMA_BELOW : Score.WEIGHT_CHROMA_ABOVE;
            const chromaScore = (hct.chroma - Score.TARGET_CHROMA) * chromaWeight;
            const score = proportionScore + chromaScore;
            scoredHct.push({ hct, score });
        }
        scoredHct.sort(compare);
        const chosenColors = [];
        for (let differenceDegrees = 90; differenceDegrees >= 15; differenceDegrees--) {
            chosenColors.length = 0;
            for (const { hct } of scoredHct) {
                const duplicateHue = chosenColors.find(chosenHct => {
                    return math.differenceDegrees(hct.hue, chosenHct.hue) < differenceDegrees;
                });
                if (!duplicateHue) {
                    chosenColors.push(hct);
                }
                if (chosenColors.length >= desired)
                    break;
            }
            if (chosenColors.length >= desired)
                break;
        }
        const colors = [];
        if (chosenColors.length === 0) {
            colors.push(fallbackColorARGB);
        }
        for (const chosenHct of chosenColors) {
            colors.push(chosenHct.toInt());
        }
        return colors;
    }
}
Score.TARGET_CHROMA = 48.0;
Score.WEIGHT_PROPORTION = 0.7;
Score.WEIGHT_CHROMA_ABOVE = 0.3;
Score.WEIGHT_CHROMA_BELOW = 0.1;
Score.CUTOFF_CHROMA = 5.0;
Score.CUTOFF_EXCITED_PROPORTION = 0.01;
