import { RIPPLE_CONFIG } from "./constants.js";
import { getCleanup } from "../cleanup.js";
import { PREFIX } from "../../config.js";
const RELEASE = ["pointerup", "pointercancel", "mouseleave"];
export const createRipple = (config = {}) => {
    const options = { duration: config.duration ?? RIPPLE_CONFIG.duration };
    const mounts = new WeakMap();
    return {
        mount(element) {
            if (!element || mounts.has(element))
                return;
            const doc = element.ownerDocument;
            const view = doc.defaultView;
            if (!view)
                return;
            if (view.getComputedStyle?.(element).position === "static") {
                element.style.position = "relative";
            }
            const container = doc.createElement("div");
            container.className = `${PREFIX}-ripple`;
            element.appendChild(container);
            const waves = new Set();
            const press = (event) => {
                const bounds = element.getBoundingClientRect();
                const size = Math.max(bounds.width, bounds.height) * 2;
                const wave = doc.createElement("div");
                wave.className = `${PREFIX}-ripple-wave active`;
                Object.assign(wave.style, {
                    width: `${size}px`, height: `${size}px`,
                    left: `${event.clientX - bounds.left - size / 2}px`,
                    top: `${event.clientY - bounds.top - size / 2}px`,
                });
                let timer;
                let released = false;
                const removeListeners = () => {
                    for (const type of RELEASE)
                        doc.removeEventListener(type, release);
                };
                const dispose = () => {
                    removeListeners();
                    if (timer !== undefined)
                        view.clearTimeout(timer);
                    wave.remove();
                    waves.delete(dispose);
                };
                const release = () => {
                    if (released)
                        return;
                    released = true;
                    removeListeners();
                    wave.classList.add("fade-out");
                    timer = view.setTimeout(dispose, options.duration);
                };
                waves.add(dispose);
                for (const type of RELEASE)
                    doc.addEventListener(type, release);
                container.appendChild(wave);
            };
            element.addEventListener("pointerdown", press);
            mounts.set(element, () => {
                element.removeEventListener("pointerdown", press);
                for (const dispose of waves)
                    dispose();
                container.remove();
            });
        },
        unmount(element) {
            mounts.get(element)?.();
            mounts.delete(element);
        },
    };
};
export const withRipple = (config) => (component) => {
    if (!config.ripple)
        return component;
    const rippleInstance = createRipple(config.rippleConfig);
    rippleInstance.mount(component.element);
    const resources = getCleanup(component);
    resources.add(() => rippleInstance.unmount(component.element));
    return {
        ...component,
        ripple: rippleInstance,
    };
};
