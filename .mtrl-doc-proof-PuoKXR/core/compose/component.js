import { getCleanup } from "./cleanup.js";
import { createElement, removeEventHandlers, } from "../dom/create.js";
import { trackFactoryDirection } from "../dom/direction.js";
import { normalizeEvent, hasTouchSupport, TOUCH_CONFIG, PASSIVE_EVENTS, } from "../utils/mobile.js";
const getModifierClass = (base, modifier) => `${base}--${modifier}`;
const getElementClass = (base, element) => `${base}__${element}`;
const withPrefix = (prefix) => ({
    getClass: (name) => `${prefix}-${name}`,
    getModifierClass,
    getElementClass,
});
export const createBase = (config = {}) => ({
    config: config,
    componentName: config.componentName,
    ...withPrefix(config.prefix || "mtrl"),
    touchState: {
        startTime: 0,
        startPosition: { x: 0, y: 0 },
        isTouching: false,
        activeTarget: null,
    },
    updateTouchState(event, status) {
        const normalized = normalizeEvent(event);
        if (status === "start") {
            this.touchState = {
                startTime: Date.now(),
                startPosition: {
                    x: normalized.clientX,
                    y: normalized.clientY,
                },
                isTouching: true,
                activeTarget: normalized.target,
            };
        }
        else if (status === "end") {
            this.touchState.isTouching = false;
            this.touchState.activeTarget = null;
        }
    },
});
const setupTouch = (element, base, options) => {
    const handleTouchStart = (event) => {
        base.updateTouchState(event, "start");
        element.classList.add(`${base.getClass("touch-active")}`);
        if (options.forwardEvents?.touchstart && "emit" in base && typeof base.emit === "function") {
            base.emit("touchstart", normalizeEvent(event));
        }
    };
    const handleTouchEnd = (event) => {
        if (!base.touchState.isTouching)
            return;
        const touchDuration = Date.now() - base.touchState.startTime;
        element.classList.remove(`${base.getClass("touch-active")}`);
        base.updateTouchState(event, "end");
        if (touchDuration < TOUCH_CONFIG.TAP_THRESHOLD && "emit" in base && typeof base.emit === "function") {
            base.emit("tap", normalizeEvent(event));
        }
        if (options.forwardEvents?.touchend && "emit" in base && typeof base.emit === "function") {
            base.emit("touchend", normalizeEvent(event));
        }
    };
    const handleTouchMove = (event) => {
        if (!base.touchState.isTouching)
            return;
        const normalized = normalizeEvent(event);
        const deltaX = normalized.clientX - base.touchState.startPosition.x;
        const deltaY = normalized.clientY - base.touchState.startPosition.y;
        if (Math.abs(deltaX) > TOUCH_CONFIG.SWIPE_THRESHOLD &&
            "emit" in base && typeof base.emit === "function") {
            base.emit("swipe", {
                direction: deltaX > 0 ? "right" : "left",
                deltaX,
                deltaY,
            });
        }
        if (options.forwardEvents?.touchmove && "emit" in base && typeof base.emit === "function") {
            base.emit("touchmove", { ...normalized, deltaX, deltaY });
        }
    };
    element.addEventListener("touchstart", handleTouchStart, PASSIVE_EVENTS);
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchmove", handleTouchMove, PASSIVE_EVENTS);
    return () => {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchend", handleTouchEnd);
        element.removeEventListener("touchmove", handleTouchMove);
    };
};
export const withElement = (options = {}) => (component) => {
    const resources = getCleanup(component);
    const base = component;
    let parent = component.config.parent || options.parent;
    if (typeof parent === "string") {
        parent = document.querySelector(parent);
    }
    const elementOptions = {
        tag: options.tag || "div",
        className: [
            base.getClass(options.componentName || base.componentName || "component"),
            hasTouchSupport() && options.interactive
                ? base.getClass("interactive")
                : null,
            ...(Array.isArray(options.className)
                ? options.className
                : [options.className]),
        ].filter((name) => Boolean(name)),
        attributes: options.attributes || {},
        id: options.id,
        name: options.name,
        title: options.title,
        tabIndex: options.tabIndex,
        style: options.style,
        data: options.data,
        role: options.role,
        ariaLabel: options.ariaLabel,
        ariaDescribedBy: options.ariaDescribedBy,
        ariaLabelledBy: options.ariaLabelledBy,
        ariaHidden: options.ariaHidden,
        forwardEvents: options.forwardEvents || {},
        context: component,
        container: parent,
    };
    const element = createElement(elementOptions);
    trackFactoryDirection(element);
    const cleanupTouch = hasTouchSupport() && options.interactive
        ? setupTouch(element, base, options)
        : undefined;
    resources.add(() => {
        cleanupTouch?.();
        base.touchState.activeTarget = null;
        base.touchState.isTouching = false;
        removeEventHandlers(element);
        element.remove();
    });
    return {
        ...component,
        element,
        addClass(...classes) {
            element.classList.add(...classes.filter(Boolean));
            return this;
        },
        destroy() {
            resources.destroy();
        },
    };
};
