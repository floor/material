import { PROGRESS_CLASSES, PROGRESS_VARIANTS, PROGRESS_SHAPES, PROGRESS_MEASUREMENTS, PROGRESS_MOTION, PROGRESS_THICKNESS, PROGRESS_WAVE, } from "../constants.js";
import { observeCanvasResize } from "../../../core/canvas/resize.js";
import { createColors } from "./colors.js";
import { drawCircularProgress } from "./circular.js";
import { drawLinearProgress } from "./linear.js";
import { waveAmplitudeAt, waveAmplitudeTarget } from "./motion.js";
export const getStrokeWidth = (thickness = "thin") => {
    if (typeof thickness === "number")
        return thickness;
    return thickness === "thick" ? PROGRESS_THICKNESS.THICK : PROGRESS_THICKNESS.THIN;
};
export const getWaveAmplitude = (isCircular, strokeWidth, size) => isCircular
    ? PROGRESS_WAVE.CIRCULAR.AMPLITUDE * (size / PROGRESS_MEASUREMENTS.CIRCULAR.SIZE)
    : PROGRESS_WAVE.LINEAR.AMPLITUDE * (strokeWidth / PROGRESS_THICKNESS.THIN);
export const getCircularSize = (config, size = config.size) => {
    return Math.max(config.minSize ?? PROGRESS_MEASUREMENTS.CIRCULAR.MIN_SIZE, Math.min(size ?? (config.shape === PROGRESS_SHAPES.WAVY
        ? PROGRESS_MEASUREMENTS.CIRCULAR.WAVE_SIZE
        : PROGRESS_MEASUREMENTS.CIRCULAR.SIZE), PROGRESS_MEASUREMENTS.CIRCULAR.MAX_SIZE));
};
export const getLinearHeight = (strokeWidth, isWavy) => isWavy ? strokeWidth + 2 * getWaveAmplitude(false, strokeWidth, 0) : strokeWidth;
export const withCanvas = (config) => (component) => {
    const isCircular = config.variant === PROGRESS_VARIANTS.CIRCULAR;
    const view = component.element.ownerDocument?.defaultView ?? null;
    const canvas = document.createElement("canvas");
    canvas.className = `${component.getClass(PROGRESS_CLASSES.CONTAINER)}__canvas`;
    canvas.setAttribute("aria-hidden", "true");
    if (config.minSize)
        canvas.style.maxWidth = "none";
    component.element.appendChild(canvas);
    let context = null;
    let currentThickness = config.thickness ?? "thin";
    let currentShape = config.shape ?? PROGRESS_SHAPES.FLAT;
    let currentSize = getCircularSize(config);
    let animatedValue = config.value ?? 0;
    let targetValue = animatedValue;
    let valueAnimationId = null;
    let lastSetValueTime = 0;
    let amplitudeFrom = 0;
    let amplitudeTarget = 0;
    let amplitudeStarted = 0;
    let animationId = null;
    let animationTime = 0;
    let animationStart = 0;
    const reducedMotion = view?.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    const isWavy = () => currentShape === PROGRESS_SHAPES.WAVY;
    const strokeWidth = () => getStrokeWidth(currentThickness);
    const max = () => component.state?.max ?? config.max ?? 100;
    const isIndeterminate = () => component.state?.indeterminate ?? config.indeterminate ?? false;
    const colors = createColors(component.element, () => draw(animationTime));
    const LINEAR_BITMAP = 2048;
    const ratioOf = () => view?.devicePixelRatio || 1;
    const boxHeight = () => isCircular ? currentSize : getLinearHeight(strokeWidth(), isWavy());
    const paintBox = () => {
        const ratio = ratioOf();
        const height = boxHeight();
        const bitmapW = Math.round((isCircular ? currentSize : LINEAR_BITMAP) * ratio);
        const bitmapH = Math.round(height * ratio);
        canvas.style.width = isCircular ? `${currentSize}px` : "100%";
        canvas.style.height = `${height}px`;
        if (canvas.width !== bitmapW)
            canvas.width = bitmapW;
        if (canvas.height !== bitmapH)
            canvas.height = bitmapH;
    };
    const measure = () => {
        paintBox();
        if (!context)
            return;
        const height = boxHeight();
        const width = isCircular
            ? currentSize
            : Math.max(component.element.getBoundingClientRect?.().width || component.element.offsetWidth || 0, 0);
        context.width = width;
        context.height = height;
        if (width <= 0 || height <= 0)
            return;
        context.ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    };
    const initialize = () => {
        if (typeof canvas.getContext !== "function")
            return false;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return false;
        context = { canvas, ctx, width: 0, height: 0 };
        measure();
        return true;
    };
    const currentAmplitude = () => {
        if (!isWavy())
            return 0;
        const full = getWaveAmplitude(isCircular, strokeWidth(), currentSize);
        if (isIndeterminate())
            return full;
        const fraction = waveAmplitudeAt(amplitudeFrom, amplitudeTarget, (view?.performance ?? performance).now() - amplitudeStarted);
        return full * fraction;
    };
    const draw = (time = animationTime) => {
        if (!context || context.width <= 0 || context.height <= 0)
            return;
        const indeterminate = isIndeterminate();
        const value = indeterminate ? 0 : animatedValue / max();
        if (isCircular) {
            drawCircularProgress(context, {
                progress: value,
                indeterminate,
                strokeWidth: strokeWidth(),
                time,
                waveAmplitude: currentAmplitude(),
                colors: colors.get(),
            });
        }
        else {
            const rtl = view?.getComputedStyle?.(component.element)?.direction === "rtl";
            drawLinearProgress(context, {
                progress: value,
                buffer: (component.state?.buffer ?? config.buffer ?? 0) / max(),
                indeterminate,
                strokeWidth: strokeWidth(),
                time,
                waveAmplitude: currentAmplitude(),
                rtl,
                colors: colors.get(),
                showStopIndicator: !indeterminate && config.showStopIndicator !== false,
            });
        }
    };
    const needsAnimation = () => !reducedMotion?.matches && (isIndeterminate() || isWavy());
    const startAnimation = (offset = 0) => {
        stopAnimation();
        if (!needsAnimation()) {
            draw(0);
            return;
        }
        animationStart = 0;
        const step = (timestamp) => {
            if (animationStart === 0)
                animationStart = timestamp - offset;
            animationTime = timestamp - animationStart;
            draw(animationTime);
            animationId = needsAnimation() ? requestAnimationFrame(step) : null;
        };
        animationId = requestAnimationFrame(step);
    };
    const stopAnimation = () => {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    };
    const stopValueAnimation = () => {
        if (valueAnimationId !== null) {
            cancelAnimationFrame(valueAnimationId);
            valueAnimationId = null;
        }
    };
    const retargetAmplitude = (progress) => {
        const next = waveAmplitudeTarget(progress);
        if (next === amplitudeTarget)
            return;
        amplitudeFrom = waveAmplitudeAt(amplitudeFrom, amplitudeTarget, (view?.performance ?? performance).now() - amplitudeStarted);
        amplitudeTarget = next;
        amplitudeStarted = (view?.performance ?? performance).now();
    };
    const complete = (value) => {
        component.emit?.("complete", { value, max: max() });
    };
    component.setValue = (value, animate = true) => {
        targetValue = Math.max(0, Math.min(max(), value));
        retargetAmplitude(targetValue / max());
        if (valueAnimationId !== null && animate)
            return;
        stopValueAnimation();
        if (!animate || reducedMotion?.matches) {
            animatedValue = targetValue;
            draw();
            if (targetValue >= max())
                complete(targetValue);
            return;
        }
        const startValue = animatedValue;
        const startTime = (view?.performance ?? performance).now();
        const sinceLast = startTime - lastSetValueTime;
        const duration = lastSetValueTime > 0 && sinceLast < PROGRESS_MOTION.VALUE_DURATION
            ? Math.max(100, sinceLast * 0.9)
            : PROGRESS_MOTION.VALUE_DURATION;
        lastSetValueTime = startTime;
        const step = (now) => {
            const fraction = Math.min((now - startTime) / duration, 1);
            animatedValue = startValue + (targetValue - startValue) * fraction;
            if (animationId === null)
                draw();
            if (fraction < 1) {
                valueAnimationId = requestAnimationFrame(step);
            }
            else {
                valueAnimationId = null;
                animatedValue = targetValue;
                if (animationId === null)
                    draw();
                if (targetValue >= max())
                    complete(targetValue);
            }
        };
        valueAnimationId = requestAnimationFrame(step);
    };
    component.setIndeterminate = (indeterminate) => {
        if (component.state)
            component.state.indeterminate = indeterminate;
        stopValueAnimation();
        animatedValue = component.state?.value ?? animatedValue;
        if (!indeterminate)
            retargetAmplitude(animatedValue / max());
        startAnimation();
    };
    component.setThickness = (thickness) => {
        currentThickness = thickness;
        measure();
        draw();
    };
    component.setShape = (shape) => {
        if (currentShape === shape)
            return;
        currentShape = shape;
        component.currentShape = shape;
        if (component.state)
            component.state.shape = shape;
        if (isCircular && config.size === undefined)
            currentSize = getCircularSize({ ...config, shape });
        if (shape === PROGRESS_SHAPES.WAVY) {
            amplitudeFrom = 0;
            amplitudeTarget = 0;
            amplitudeStarted = (view?.performance ?? performance).now();
            retargetAmplitude(animatedValue / max());
        }
        measure();
        startAnimation(animationTime);
    };
    component.setSize = (size) => {
        if (!isCircular)
            return;
        currentSize = getCircularSize(config, size);
        measure();
        draw();
    };
    component.getSize = () => (isCircular ? currentSize : undefined);
    component.hide = () => {
        component.element.classList.add(component.getClass(PROGRESS_CLASSES.TRANSITION));
        component.element.setAttribute("hidden", "");
        stopAnimation();
        stopValueAnimation();
        return component;
    };
    component.show = () => {
        component.element.classList.add(component.getClass(PROGRESS_CLASSES.TRANSITION));
        component.element.removeAttribute("hidden");
        measure();
        startAnimation(animationTime);
        return component;
    };
    component.isVisible = () => !component.element.hasAttribute("hidden");
    const resize = () => {
        measure();
        draw();
    };
    paintBox();
    if (!initialize() && typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
            if (initialize()) {
                startAnimation();
                draw();
            }
        });
    }
    const resizeCleanup = observeCanvasResize(component.element, canvas, resize);
    if (isWavy() && !isIndeterminate()) {
        amplitudeStarted = (view?.performance ?? performance).now();
        retargetAmplitude(animatedValue / max());
    }
    draw();
    startAnimation();
    const originalDestroy = component.lifecycle?.destroy;
    component.lifecycle = {
        ...(component.lifecycle ?? {}),
        destroy: () => {
            resizeCleanup();
            colors.destroy();
            stopAnimation();
            stopValueAnimation();
            originalDestroy?.();
        },
    };
    return {
        ...component,
        canvas,
        draw,
        resize,
    };
};
