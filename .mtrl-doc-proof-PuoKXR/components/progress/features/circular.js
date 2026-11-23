import { circularIndeterminateFrame } from "./motion.js";
import { PROGRESS_MEASUREMENTS, PROGRESS_WAVE } from "../constants.js";
const TWO_PI = Math.PI * 2;
const START_ANGLE = -Math.PI / 2;
const drawArc = (ctx, centerX, centerY, radius, from, sweep, color, strokeWidth, wave) => {
    if (sweep <= 0 || radius <= 0)
        return;
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (!wave || wave.amplitude <= 0) {
        ctx.arc(centerX, centerY, radius, from, from + sweep);
        ctx.stroke();
        return;
    }
    const arcLength = sweep * radius;
    const steps = Math.max(8, Math.ceil(arcLength / Math.max(1, wave.wavelength / 24)));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = from + sweep * t;
        const along = t * arcLength;
        const r = radius + wave.amplitude * Math.sin((TWO_PI * (along - wave.phase)) / wave.wavelength);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    ctx.stroke();
};
export const drawCircularProgress = (context, frame) => {
    const { ctx, width, height } = context;
    const { strokeWidth, colors, indeterminate, waveAmplitude } = frame;
    if (width <= 0 || height <= 0)
        return;
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size / 2 - strokeWidth / 2 - waveAmplitude;
    if (radius <= 0)
        return;
    ctx.clearRect(0, 0, width, height);
    const scale = size / PROGRESS_MEASUREMENTS.CIRCULAR.SIZE;
    const wavelength = PROGRESS_WAVE.CIRCULAR.WAVELENGTH * scale;
    const wave = waveAmplitude > 0
        ? {
            amplitude: waveAmplitude,
            wavelength,
            phase: ((frame.time / 1000) * PROGRESS_WAVE.SPEED * wavelength) % wavelength,
        }
        : undefined;
    const gapPx = PROGRESS_MEASUREMENTS.CIRCULAR.GAP + strokeWidth;
    const gapSweep = size > 0 ? (gapPx / (Math.PI * size)) * TWO_PI : 0;
    if (indeterminate) {
        const { rotation, sweep } = circularIndeterminateFrame(frame.time);
        const start = (rotation * Math.PI) / 180;
        const arcSweep = sweep * TWO_PI;
        const gap = Math.min(arcSweep, gapSweep);
        const trackSweep = TWO_PI - arcSweep - gap * 2;
        if (trackSweep > 0) {
            drawArc(ctx, centerX, centerY, radius, start + arcSweep + gap, trackSweep, colors.track, strokeWidth);
        }
        drawArc(ctx, centerX, centerY, radius, start, arcSweep, colors.indicator, strokeWidth, wave);
        return;
    }
    const progress = Math.min(1, Math.max(0, frame.progress));
    const sweep = progress * TWO_PI;
    const gap = Math.min(sweep, gapSweep);
    const trackSweep = TWO_PI - sweep - gap * 2;
    if (trackSweep > 0) {
        drawArc(ctx, centerX, centerY, radius, START_ANGLE + sweep + gap, trackSweep, colors.track, strokeWidth);
    }
    drawArc(ctx, centerX, centerY, radius, START_ANGLE, sweep, colors.indicator, strokeWidth, wave);
};
