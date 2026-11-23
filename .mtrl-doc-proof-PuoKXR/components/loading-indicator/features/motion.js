import { LOADING_INDICATOR_DEFAULTS, LOADING_INDICATOR_SPRING } from "../constants.js";
const spring = (t) => {
    const zeta = LOADING_INDICATOR_SPRING.DAMPING;
    const omega = Math.sqrt(LOADING_INDICATOR_SPRING.STIFFNESS);
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * t);
    const position = 1 - decay * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t));
    const velocity = decay * ((omega * omega) / omegaD) * Math.sin(omegaD * t);
    return [position, velocity];
};
const settleTime = () => {
    const threshold = LOADING_INDICATOR_SPRING.THRESHOLD;
    const zeta = LOADING_INDICATOR_SPRING.DAMPING;
    const omega = Math.sqrt(LOADING_INDICATOR_SPRING.STIFFNESS);
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const c1 = 1;
    const c2 = (zeta * omega * c1) / omegaD;
    const amplitude = Math.sqrt(c1 * c1 + c2 * c2);
    return Math.log(amplitude / threshold) / (zeta * omega);
};
export const MORPH_SETTLE_SECONDS = settleTime();
export const morphProgress = (elapsed) => {
    const t = elapsed / 1000;
    if (t >= MORPH_SETTLE_SECONDS)
        return 1;
    return spring(t)[0];
};
export const indeterminateFrame = (elapsed, shapeCount) => {
    const interval = LOADING_INDICATOR_DEFAULTS.MORPH_INTERVAL;
    const cycles = Math.floor(elapsed / interval);
    const inCycle = elapsed - cycles * interval;
    const index = cycles % shapeCount;
    const progress = morphProgress(inCycle);
    const morphRotation = LOADING_INDICATOR_DEFAULTS.MORPH_ROTATION * (cycles + 1) + progress * LOADING_INDICATOR_DEFAULTS.MORPH_ROTATION;
    const globalRotation = ((elapsed % LOADING_INDICATOR_DEFAULTS.ROTATION_DURATION) / LOADING_INDICATOR_DEFAULTS.ROTATION_DURATION) * 360;
    return { index, progress, rotation: (morphRotation + globalRotation) % 360 };
};
export const reducedMotionFrame = (elapsed, shapeCount) => ({
    index: Math.floor(elapsed / LOADING_INDICATOR_DEFAULTS.MORPH_INTERVAL) % shapeCount,
    progress: 0,
    rotation: 0,
});
export const determinateFrame = (value) => ({
    index: 0,
    progress: value,
    rotation: -value * 180,
});
