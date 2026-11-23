import { onThemeChange } from "../utils/theme.js";
export const createCanvasContext = (canvas, width, height) => {
    const pixelRatio = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    const context = { canvas, ctx, width, height, pixelRatio };
    updateCanvasDimensions(context, width, height);
    return context;
};
export const updateCanvasDimensions = (context, width, height) => {
    const { canvas, ctx, pixelRatio } = context;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.width = width;
    context.height = height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(pixelRatio, pixelRatio);
};
export const initializeCanvasWithRetry = (initFn, onSuccess, signal) => {
    let frame = null;
    let timer = null;
    const cleanup = () => {
        if (frame !== null)
            cancelAnimationFrame(frame);
        if (timer !== null)
            clearTimeout(timer);
        signal?.removeEventListener('abort', cleanup);
    };
    if (signal?.aborted)
        return false;
    signal?.addEventListener('abort', cleanup, { once: true });
    const attempt = () => {
        if (signal?.aborted)
            return false;
        if (!initFn())
            return false;
        cleanup();
        onSuccess?.();
        return true;
    };
    if (attempt())
        return true;
    frame = requestAnimationFrame(() => {
        frame = null;
        if (attempt() || signal?.aborted)
            return;
        timer = setTimeout(() => {
            timer = null;
            attempt();
            cleanup();
        }, 100);
    });
    return false;
};
export const createCanvasThemeObserver = (_color, callback) => {
    return onThemeChange(callback);
};
export class AnimationFrameManager {
    constructor() {
        this.animationId = null;
    }
    start(callback) {
        this.stop();
        const animate = (timestamp) => {
            callback(timestamp);
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }
    stop() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    get isRunning() {
        return this.animationId !== null;
    }
}
export class CleanupManager {
    constructor() {
        this.cleanupFunctions = [];
    }
    add(cleanup) {
        if (cleanup) {
            this.cleanupFunctions.push(cleanup);
        }
    }
    cleanup() {
        this.cleanupFunctions.forEach(fn => fn());
        this.cleanupFunctions = [];
    }
}
export const createStyledCanvas = (className, additionalStyles = {}) => {
    const canvas = document.createElement('canvas');
    canvas.className = className;
    Object.assign(canvas.style, {
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...additionalStyles
    });
    return canvas;
};
