import { linearIndeterminateFrame } from "./motion.js";
import { PROGRESS_MEASUREMENTS, PROGRESS_WAVE } from "../constants.js";
const drawBar = (ctx, width, centerY, strokeWidth, from, to, color, rtl, wave) => {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    if (end - start <= 0)
        return;
    const cap = strokeWidth / 2;
    const toX = (fraction) => {
        const f = rtl ? 1 - fraction : fraction;
        return Math.min(Math.max(f * width, cap), width - cap);
    };
    const x0 = toX(start);
    const x1 = toX(end);
    if (Math.abs(x1 - x0) < 1e-6 && start !== end)
        return;
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (!wave || wave.amplitude <= 0) {
        ctx.moveTo(Math.min(x0, x1), centerY);
        ctx.lineTo(Math.max(x0, x1), centerY);
        ctx.stroke();
        return;
    }
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const step = Math.max(1, wave.wavelength / 24);
    for (let x = left; x <= right; x += step) {
        const y = centerY + wave.amplitude * Math.sin((2 * Math.PI * (x - wave.phase)) / wave.wavelength);
        if (x === left)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    const endY = centerY + wave.amplitude * Math.sin((2 * Math.PI * (right - wave.phase)) / wave.wavelength);
    ctx.lineTo(right, endY);
    ctx.stroke();
};
const drawStopIndicator = (ctx, width, height, color, rtl) => {
    const size = Math.min(PROGRESS_MEASUREMENTS.LINEAR.STOP_INDICATOR, height);
    const offset = Math.min((height - size) / 2, PROGRESS_MEASUREMENTS.LINEAR.STOP_TRAILING_SPACE);
    const x = rtl ? size / 2 + offset : width - size / 2 - offset;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, height / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();
};
export const drawLinearProgress = (context, frame) => {
    const { ctx, width, height } = context;
    const { strokeWidth, colors, rtl, indeterminate, waveAmplitude } = frame;
    if (width <= 0 || height <= 0)
        return;
    const centerY = height / 2;
    ctx.clearRect(0, 0, width, height);
    const gapPx = PROGRESS_MEASUREMENTS.LINEAR.GAP + strokeWidth;
    const gap = width > 0 ? gapPx / width : 0;
    const wavelength = indeterminate
        ? PROGRESS_WAVE.LINEAR.INDETERMINATE_WAVELENGTH
        : PROGRESS_WAVE.LINEAR.WAVELENGTH;
    const wave = waveAmplitude > 0
        ? {
            amplitude: waveAmplitude,
            wavelength,
            phase: ((frame.time / 1000) * PROGRESS_WAVE.SPEED * wavelength) % wavelength,
        }
        : undefined;
    const bar = (from, to, color, wavy = false) => drawBar(ctx, width, centerY, strokeWidth, from, to, color, rtl, wavy ? wave : undefined);
    if (indeterminate) {
        const { firstHead, firstTail, secondHead, secondTail } = linearIndeterminateFrame(frame.time);
        if (firstHead < 1 - gap) {
            bar(firstHead > 0 ? firstHead + gap : 0, 1, colors.track);
        }
        if (firstHead - firstTail > 0) {
            bar(firstTail, firstHead, colors.indicator, true);
        }
        if (firstTail > gap) {
            bar(secondHead > 0 ? secondHead + gap : 0, firstTail < 1 ? firstTail - gap : 1, colors.track);
        }
        if (secondHead - secondTail > 0) {
            bar(secondTail, secondHead, colors.indicator, true);
        }
        if (secondTail > gap) {
            bar(0, secondTail - gap, colors.track);
        }
        return;
    }
    const progress = Math.min(1, Math.max(0, frame.progress));
    const trackStart = progress + Math.min(progress, gap);
    if (trackStart <= 1) {
        bar(trackStart, 1, colors.track);
    }
    if (frame.buffer > progress) {
        const bufferEnd = Math.min(1, frame.buffer);
        if (bufferEnd > trackStart)
            bar(trackStart, bufferEnd, colors.buffer);
    }
    bar(0, progress, colors.indicator, true);
    if (frame.showStopIndicator) {
        drawStopIndicator(ctx, width, height, colors.stop, rtl);
    }
};
