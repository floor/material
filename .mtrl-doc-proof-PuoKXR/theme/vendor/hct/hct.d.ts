/** HCT, hue, chroma, and tone. */
export class Hct {
    static from(hue: any, chroma: any, tone: any): Hct;
    /** @param argb */
    static fromInt(argb: any): Hct;
    static isBlue(hue: any): boolean;
    static isYellow(hue: any): boolean;
    static isCyan(hue: any): boolean;
    constructor(argb: any);
    toInt(): any;
    /** @param newHue */
    set hue(newHue: any);
    /** A number, in degrees, representing ex. */
    get hue(): any;
    /** @param newChroma */
    set chroma(newChroma: any);
    get chroma(): any;
    /** @param newTone */
    set tone(newTone: number);
    /** Lightness. */
    get tone(): number;
    /** Sets a property of the Hct object. */
    setValue(propertyName: any, value: any): void;
    toString(): string;
    argb: any;
    internalHue: any;
    internalChroma: any;
    internalTone: number;
    setInternalState(argb: any): void;
    /** Translates a color into different [ViewingConditions]. */
    inViewingConditions(vc: any): Hct;
}
