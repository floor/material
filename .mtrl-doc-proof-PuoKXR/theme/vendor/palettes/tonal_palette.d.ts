/** A convenience class for retrieving colors that are constant in hue and chroma, but vary in tone. */
export class TonalPalette {
    /** @param argb */
    static fromInt(argb: any): TonalPalette;
    /** @param hct */
    static fromHct(hct: any): TonalPalette;
    /**
 * @param hue
 * @param chroma
 */
    static fromHueAndChroma(hue: any, chroma: any): TonalPalette;
    constructor(hue: any, chroma: any, keyColor: any);
    hue: any;
    chroma: any;
    keyColor: any;
    cache: Map<any, any>;
    /** @param tone */
    tone(tone: any): any;
    /** @param tone */
    getHct(tone: any): Hct;
    averageArgb(argb1: any, argb2: any): number;
}
import { Hct } from "../hct/hct.js";
