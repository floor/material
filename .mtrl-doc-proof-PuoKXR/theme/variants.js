import { content, createScheme, expressive, fidelity, monochrome, neutral, tonalSpot, vibrant, } from "./index.js";
const VARIANTS = {
    "tonal-spot": tonalSpot,
    vibrant,
    expressive,
    fidelity,
    content,
    neutral,
    monochrome,
};
export function createSchemeByName(seed, options = {}) {
    return createScheme(seed, {
        variant: VARIANTS[options.variant ?? "tonal-spot"],
        mode: options.mode,
        contrast: options.contrast,
    });
}
