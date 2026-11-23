/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import * as utils from "../utils/color_utils.js";
import { Cam16 } from "./cam16.js";
import { HctSolver } from "./hct_solver.js";
import { ViewingConditions } from "./viewing_conditions.js";
export class Hct {
    static from(hue, chroma, tone) {
        return new Hct(HctSolver.solveToInt(hue, chroma, tone));
    }
    static fromInt(argb) {
        return new Hct(argb);
    }
    toInt() {
        return this.argb;
    }
    get hue() {
        return this.internalHue;
    }
    set hue(newHue) {
        this.setInternalState(HctSolver.solveToInt(newHue, this.internalChroma, this.internalTone));
    }
    get chroma() {
        return this.internalChroma;
    }
    set chroma(newChroma) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, newChroma, this.internalTone));
    }
    get tone() {
        return this.internalTone;
    }
    set tone(newTone) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, this.internalChroma, newTone));
    }
    setValue(propertyName, value) {
        this[propertyName] = value;
    }
    toString() {
        return `HCT(${this.hue.toFixed(0)}, ${this.chroma.toFixed(0)}, ${this.tone.toFixed(0)})`;
    }
    static isBlue(hue) {
        return hue >= 250 && hue < 270;
    }
    static isYellow(hue) {
        return hue >= 105 && hue < 125;
    }
    static isCyan(hue) {
        return hue >= 170 && hue < 207;
    }
    constructor(argb) {
        this.argb = argb;
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = utils.lstarFromArgb(argb);
        this.argb = argb;
    }
    setInternalState(argb) {
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = utils.lstarFromArgb(argb);
        this.argb = argb;
    }
    inViewingConditions(vc) {
        const cam = Cam16.fromInt(this.toInt());
        const viewedInVc = cam.xyzInViewingConditions(vc);
        const recastInVc = Cam16.fromXyzInViewingConditions(viewedInVc[0], viewedInVc[1], viewedInVc[2], ViewingConditions.make());
        const recastHct = Hct.from(recastInVc.hue, recastInVc.chroma, utils.lstarFromY(viewedInVc[1]));
        return recastHct;
    }
}
