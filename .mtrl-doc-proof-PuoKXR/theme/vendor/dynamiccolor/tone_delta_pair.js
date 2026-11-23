/*! @license Copyright 2023 Google LLC | Apache-2.0 (see NOTICE) */
export class ToneDeltaPair {
    constructor(roleA, roleB, delta, polarity, stayTogether, constraint) {
        this.roleA = roleA;
        this.roleB = roleB;
        this.delta = delta;
        this.polarity = polarity;
        this.stayTogether = stayTogether;
        this.constraint = constraint;
        this.constraint = constraint ?? 'exact';
    }
}
