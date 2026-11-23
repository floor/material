import createButton from "../button/index.js";
import createIconButton from "../icon-button/index.js";
import { SNACKBAR_CLASSES, SNACKBAR_CLOSE_ICON } from "./constants.js";
import { durationToMs } from "./config.js";
export const withActionButton = (config) => (component) => {
    if (!config.action)
        return component;
    const prefix = config.prefix || 'mtrl';
    const button = createButton({
        text: config.action,
        variant: 'text',
        prefix,
        class: `${prefix}-${SNACKBAR_CLASSES.ACTION}`,
    });
    component.element.classList.add(`${prefix}-${SNACKBAR_CLASSES.WITH_ACTION}`);
    component.element.appendChild(button.element);
    return {
        ...component,
        action: button,
        actionButton: button.element,
    };
};
export const withCloseButton = (config) => (component) => {
    if (!config.dismissible)
        return component;
    const prefix = config.prefix || 'mtrl';
    const button = createIconButton({
        icon: SNACKBAR_CLOSE_ICON,
        variant: 'standard',
        size: 's',
        ariaLabel: config.closeLabel || 'Dismiss',
        prefix,
        class: `${prefix}-${SNACKBAR_CLASSES.CLOSE}`,
    });
    component.element.classList.add(`${prefix}-${SNACKBAR_CLASSES.DISMISSIBLE}`);
    component.element.appendChild(button.element);
    return {
        ...component,
        close: button,
        closeButton: button.element,
    };
};
export const withDismissTimer = (config) => (component) => {
    const element = component.element;
    let duration = durationToMs(config.duration, Boolean(config.action));
    let timeoutId = null;
    let remaining = 0;
    let startedAt = 0;
    let running = false;
    let hovered = false;
    let focused = false;
    const fire = () => {
        timeoutId = null;
        running = false;
        component.emit?.('timeout');
    };
    const run = () => {
        if (timeoutId !== null || remaining <= 0)
            return;
        startedAt = Date.now();
        timeoutId = setTimeout(fire, remaining);
    };
    const halt = () => {
        if (timeoutId === null)
            return;
        clearTimeout(timeoutId);
        timeoutId = null;
        remaining -= Date.now() - startedAt;
    };
    const held = () => hovered || focused;
    const startTimer = () => {
        halt();
        remaining = duration;
        running = duration > 0;
        if (running && !held())
            run();
    };
    const stopTimer = () => {
        halt();
        running = false;
        remaining = 0;
    };
    const resume = () => {
        if (running && !held())
            run();
    };
    element.addEventListener('pointerenter', () => {
        hovered = true;
        halt();
    });
    element.addEventListener('pointerleave', () => {
        hovered = false;
        resume();
    });
    element.addEventListener('focusin', () => {
        focused = true;
        halt();
    });
    element.addEventListener('focusout', (event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && element.contains(next))
            return;
        focused = false;
        resume();
    });
    const originalDestroy = component.lifecycle?.destroy;
    if (component.lifecycle) {
        component.lifecycle.destroy = () => {
            stopTimer();
            originalDestroy?.call(component.lifecycle);
        };
    }
    const timer = {
        start: startTimer,
        stop: stopTimer,
        setDuration: (value) => {
            duration = Number.isFinite(value) && value > 0 ? value : 0;
        },
        getDuration: () => duration,
    };
    return {
        ...component,
        timer,
    };
};
