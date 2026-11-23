import { PROGRESS_EASING, PROGRESS_MOTION, PROGRESS_WAVE } from "../constants.js";
export const cubicBezier = (x1, y1, x2, y2) => {
    const curve = (a, b, t) => {
        const u = 1 - t;
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
    };
    return (x) => {
        if (x <= 0)
            return 0;
        if (x >= 1)
            return 1;
        let t = x;
        for (let i = 0; i < 8; i++) {
            const currentX = curve(x1, x2, t) - x;
            if (Math.abs(currentX) < 1e-5)
                return curve(y1, y2, t);
            const slope = 3 * (1 - t) * (1 - t) * x1 +
                6 * (1 - t) * t * (x2 - x1) +
                3 * t * t * (1 - x2);
            if (Math.abs(slope) < 1e-6)
                break;
            t -= currentX / slope;
        }
        let low = 0;
        let high = 1;
        t = x;
        while (high - low > 1e-5) {
            if (curve(x1, x2, t) < x)
                low = t;
            else
                high = t;
            t = (low + high) / 2;
        }
        return curve(y1, y2, t);
    };
};
const easing = (points) => cubicBezier(points[0], points[1], points[2], points[3]);
export const emphasizedAccelerate = easing(PROGRESS_EASING.EMPHASIZED_ACCELERATE);
export const emphasizedDecelerate = easing(PROGRESS_EASING.EMPHASIZED_DECELERATE);
export const standardEasing = easing(PROGRESS_EASING.STANDARD);
const line = (elapsed, delay, duration) => {
    if (elapsed <= delay)
        return 0;
    if (elapsed >= delay + duration)
        return 1;
    return emphasizedAccelerate((elapsed - delay) / duration);
};
export const linearIndeterminateFrame = (elapsed) => {
    const m = PROGRESS_MOTION.LINEAR;
    const t = ((elapsed % m.DURATION) + m.DURATION) % m.DURATION;
    return {
        firstHead: line(t, m.FIRST_HEAD_DELAY, m.FIRST_HEAD_DURATION),
        firstTail: line(t, m.FIRST_TAIL_DELAY, m.FIRST_TAIL_DURATION),
        secondHead: line(t, m.SECOND_HEAD_DELAY, m.SECOND_HEAD_DURATION),
        secondTail: line(t, m.SECOND_TAIL_DELAY, m.SECOND_TAIL_DURATION),
    };
};
const keyframes = (elapsed, frames, ease = (t) => t) => {
    const first = frames[0];
    if (elapsed <= first[0])
        return first[1];
    for (let i = 1; i < frames.length; i++) {
        const [time, value] = frames[i];
        const [prevTime, prevValue] = frames[i - 1];
        if (elapsed <= time) {
            const span = time - prevTime;
            const fraction = span <= 0 ? 1 : ease((elapsed - prevTime) / span);
            return prevValue + (value - prevValue) * fraction;
        }
    }
    return frames[frames.length - 1][1];
};
export const circularIndeterminateFrame = (elapsed) => {
    const m = PROGRESS_MOTION.CIRCULAR;
    const t = ((elapsed % m.DURATION) + m.DURATION) % m.DURATION;
    const global = (t / m.DURATION) * m.GLOBAL_ROTATION;
    const step = m.ADDITIONAL_ROTATION / 4;
    const completed = Math.floor(t / m.ROTATION_DELAY);
    const intoStep = t - completed * m.ROTATION_DELAY;
    const kick = intoStep >= m.ROTATION_DURATION
        ? step
        : step * emphasizedDecelerate(intoStep / m.ROTATION_DURATION);
    const additional = completed * step + kick;
    const half = m.DURATION / 2;
    const sweep = t <= half
        ? keyframes(t, [
            [0, m.MIN_PROGRESS],
            [half, m.MAX_PROGRESS],
        ])
        : keyframes(t, [
            [half, m.MAX_PROGRESS],
            [m.DURATION, m.MIN_PROGRESS],
        ], standardEasing);
    return { rotation: global + additional, sweep };
};
export const waveAmplitudeTarget = (progress) => progress <= PROGRESS_WAVE.AMPLITUDE_START || progress >= PROGRESS_WAVE.AMPLITUDE_END
    ? 0
    : 1;
export const waveAmplitudeAt = (from, target, elapsed) => {
    if (from === target)
        return target;
    const fraction = Math.min(1, Math.max(0, elapsed / PROGRESS_WAVE.AMPLITUDE_DURATION));
    const ease = target > from ? standardEasing : emphasizedAccelerate;
    return from + (target - from) * ease(fraction);
};
