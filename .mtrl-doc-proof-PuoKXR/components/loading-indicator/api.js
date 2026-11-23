import { determinateFrame, indeterminateFrame, reducedMotionFrame } from "./features/motion.js";
import { LOADING_INDICATOR_CLASSES, LOADING_INDICATOR_DETERMINATE_SHAPES, LOADING_INDICATOR_SHAPES, } from "./constants.js";
import { clampSize, clampValue } from "./config.js";
export const withAPI = ({ config, lifecycle }) => (component) => {
    const element = component.element;
    const renderer = component.renderer;
    const canvas = component.canvas;
    const prefix = config.prefix || 'mtrl';
    const cls = (name) => `${prefix}-${name}`;
    const view = element.ownerDocument.defaultView;
    const reducedMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    const loopShapes = renderer.profiles(LOADING_INDICATOR_SHAPES);
    const valueShapes = renderer.profiles(LOADING_INDICATOR_DETERMINATE_SHAPES);
    let size = clampSize(config.size);
    let value = clampValue(config.value);
    let running = false;
    let frameId = null;
    let startedAt = 0;
    let pausedAt = 0;
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const applySize = () => {
        element.style.setProperty(`--${prefix}-loading-indicator-size`, `${size}px`);
        renderer.resize(size);
    };
    const applyValue = () => {
        if (value === null) {
            element.classList.remove(cls(LOADING_INDICATOR_CLASSES.DETERMINATE));
            element.removeAttribute('aria-valuenow');
            element.removeAttribute('aria-valuemin');
            element.removeAttribute('aria-valuemax');
        }
        else {
            element.classList.add(cls(LOADING_INDICATOR_CLASSES.DETERMINATE));
            element.setAttribute('aria-valuemin', '0');
            element.setAttribute('aria-valuemax', '100');
            element.setAttribute('aria-valuenow', String(Math.round(value * 100)));
            renderer.draw(valueShapes, determinateFrame(value));
        }
    };
    const tick = () => {
        frameId = null;
        if (!running || value !== null)
            return;
        const elapsed = now() - startedAt;
        const frame = reducedMotion?.matches
            ? reducedMotionFrame(elapsed, loopShapes.length)
            : indeterminateFrame(elapsed, loopShapes.length);
        renderer.draw(loopShapes, frame);
        frameId = requestAnimationFrame(tick);
    };
    const start = () => {
        if (running || typeof requestAnimationFrame !== 'function')
            return;
        running = true;
        startedAt = now() - pausedAt;
        if (value === null && frameId === null)
            frameId = requestAnimationFrame(tick);
    };
    const stop = () => {
        if (!running)
            return;
        running = false;
        pausedAt = now() - startedAt;
        if (frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
    };
    const api = {
        element,
        canvas,
        setValue(next) {
            const was = value;
            value = clampValue(next);
            applyValue();
            if (value === null && was !== null && running && frameId === null) {
                startedAt = now();
                frameId = requestAnimationFrame(tick);
            }
            return this;
        },
        getValue() {
            return value;
        },
        setSize(next) {
            size = clampSize(next);
            applySize();
            if (value !== null)
                applyValue();
            return this;
        },
        getSize() {
            return size;
        },
        setLabel(label) {
            element.setAttribute('aria-label', label);
            return this;
        },
        start() {
            start();
            return this;
        },
        stop() {
            stop();
            return this;
        },
        isRunning() {
            return running;
        },
        destroy() {
            stop();
            element.remove();
            lifecycle.destroy();
        },
    };
    if (config.contained)
        element.classList.add(cls(LOADING_INDICATOR_CLASSES.CONTAINED));
    applySize();
    applyValue();
    start();
    return api;
};
