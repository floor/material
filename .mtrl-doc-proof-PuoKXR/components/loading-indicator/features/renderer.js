import { createCanvasContext, updateCanvasDimensions } from "../../../core/canvas/utils.js";
import { onThemeChange } from "../../../core/utils/theme.js";
import { shapeCircle, shapeCookie4Sided, shapeCookie9Sided, shapeOval, shapePentagon, shapePill, shapeSoftBurst, shapeSunny, } from "../../../core/shapes/index.js";
import { sampleProfile } from "../../../core/shapes/material.js";
const indicatorShapes = {
    circle: shapeCircle,
    oval: shapeOval,
    pentagon: shapePentagon,
    pill: shapePill,
    softBurst: shapeSoftBurst,
    sunny: shapeSunny,
    cookie4Sided: shapeCookie4Sided,
    cookie9Sided: shapeCookie9Sided,
};
import { LOADING_INDICATOR_CLASSES, LOADING_INDICATOR_DEFAULTS } from "../constants.js";
const profileCache = new Map();
const profileFor = (name) => {
    let profile = profileCache.get(name);
    if (!profile) {
        profile = sampleProfile((indicatorShapes[name] ?? shapeCircle)(), LOADING_INDICATOR_DEFAULTS.SAMPLES);
        profileCache.set(name, profile);
    }
    return profile;
};
const TWO_PI = Math.PI * 2;
export const withRenderer = (config) => (component) => {
    const prefix = config.prefix || 'mtrl';
    const canvas = document.createElement('canvas');
    canvas.className = `${prefix}-${LOADING_INDICATOR_CLASSES.CANVAS}`;
    canvas.setAttribute('aria-hidden', 'true');
    component.element.appendChild(canvas);
    let context = null;
    let color = '';
    let last = null;
    const ensureContext = (size) => {
        if (typeof canvas.getContext !== 'function')
            return null;
        if (!context) {
            if (!canvas.getContext('2d'))
                return null;
            context = createCanvasContext(canvas, size, size);
        }
        else if (context.width !== size) {
            updateCanvasDimensions(context, size, size);
        }
        return context;
    };
    const refreshColor = () => {
        const view = component.element.ownerDocument.defaultView;
        color = view && component.element.isConnected ? view.getComputedStyle(component.element).color : '';
    };
    const draw = (shapes, frame) => {
        last = { shapes, frame };
        const size = context?.width ?? 0;
        const ctx = context?.ctx;
        if (!ctx || size <= 0 || shapes.length === 0)
            return;
        const from = shapes[frame.index % shapes.length];
        const to = shapes[(frame.index + 1) % shapes.length];
        const samples = from.radii.length;
        let maxRadius = 0;
        for (const shape of shapes)
            maxRadius = Math.max(maxRadius, shape.maxRadius);
        const scale = (size * (LOADING_INDICATOR_DEFAULTS.INDICATOR_SIZE / LOADING_INDICATOR_DEFAULTS.SIZE)) / 2 / maxRadius;
        const center = size / 2;
        const rotation = (frame.rotation * Math.PI) / 180;
        const t = frame.progress;
        ctx.clearRect(0, 0, size, size);
        if (!color)
            refreshColor();
        ctx.fillStyle = color || '#000';
        ctx.beginPath();
        for (let i = 0; i < samples; i++) {
            const r = (from.radii[i] + (to.radii[i] - from.radii[i]) * t) * scale;
            const a = (i / samples) * TWO_PI + rotation;
            const x = center + Math.cos(a) * r;
            const y = center + Math.sin(a) * r;
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    };
    const redraw = () => {
        if (last)
            draw(last.shapes, last.frame);
    };
    const resize = (size) => {
        const ratio = component.element.ownerDocument.defaultView?.devicePixelRatio || 1;
        const bitmap = Math.round(size * ratio);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        if (canvas.width !== bitmap)
            canvas.width = bitmap;
        if (canvas.height !== bitmap)
            canvas.height = bitmap;
        ensureContext(size);
        refreshColor();
        redraw();
    };
    const offThemeChange = onThemeChange(() => {
        refreshColor();
        redraw();
    });
    const observer = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            refreshColor();
            redraw();
        })
        : null;
    observer?.observe(component.element);
    const originalDestroy = component.lifecycle?.destroy;
    if (component.lifecycle) {
        component.lifecycle.destroy = () => {
            observer?.disconnect();
            offThemeChange();
            originalDestroy?.call(component.lifecycle);
        };
    }
    const renderer = {
        draw,
        resize,
        refreshColor,
        redraw,
        profiles: (names) => names.map(profileFor),
    };
    return {
        ...component,
        canvas,
        renderer,
    };
};
