import { SNACKBAR_CLASSES, SNACKBAR_DEFAULTS } from "./constants.js";
import { durationToMs } from "./config.js";
import { activeElementOf, deepActiveElement } from "../../core/dom/focus.js";
import { hideFromTopLayer, showInTopLayer } from "../../core/dom/layer.js";
import { placeInLayer } from "./layer.js";
export const withAPI = ({ lifecycle, queue, config }) => (component) => {
    if (!queue) {
        throw new Error('Snackbar queue is required');
    }
    const element = component.element;
    const prefix = config.prefix || 'mtrl';
    const cls = (name) => `${prefix}-${name}`;
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
    let entry = null;
    let previouslyFocused = null;
    let removal = null;
    let onTransitionEnd = null;
    const topLayer = config.layer === 'top';
    let restore = null;
    if (topLayer)
        element.setAttribute('popover', 'manual');
    const showOnTop = () => void showInTopLayer(element, { kind: 'popover-manual' });
    const takeOff = () => {
        if (!topLayer) {
            element.remove();
            return;
        }
        hideFromTopLayer(element);
        restore?.();
        restore = null;
    };
    const emit = (type, extra = {}) => {
        component.emit?.(type, { snackbar: api, originalEvent: null, ...extra });
    };
    const shortcut = config.focusShortcut === false
        ? ''
        : (config.focusShortcut ?? SNACKBAR_DEFAULTS.FOCUS_SHORTCUT).trim();
    const key = /^(off|false|.)$/i.test(shortcut) ? '' : shortcut.toLowerCase();
    if (key && component.actionButton)
        component.actionButton.setAttribute('aria-keyshortcuts', shortcut);
    const onShortcut = (event) => {
        if (!component.actionButton?.isConnected
            || event.key.toLowerCase() !== key
            || event.altKey || event.ctrlKey || event.shiftKey || event.metaKey)
            return;
        if (element.contains(activeElementOf(element)))
            return;
        event.preventDefault();
        event.stopPropagation();
        previouslyFocused = deepActiveElement();
        component.actionButton.focus();
        emit('focus', { originalEvent: event });
    };
    const unlisten = () => void element.ownerDocument.removeEventListener('keydown', onShortcut);
    const layout = () => {
        const action = component.actionButton;
        if (!action)
            return;
        const below = action.offsetWidth > SNACKBAR_DEFAULTS.ACTION_INLINE_MAX_WIDTH;
        element.classList.toggle(cls(SNACKBAR_CLASSES.ACTION_BELOW), below);
    };
    const cancelRemoval = () => {
        if (removal !== null) {
            clearTimeout(removal);
            removal = null;
        }
        if (onTransitionEnd) {
            element.removeEventListener('transitionend', onTransitionEnd);
            onTransitionEnd = null;
        }
    };
    const scheduleRemoval = () => {
        cancelRemoval();
        const remove = () => {
            cancelRemoval();
            takeOff();
        };
        onTransitionEnd = (event) => {
            if (event.target === element && event.propertyName === 'opacity')
                remove();
        };
        element.addEventListener('transitionend', onTransitionEnd);
        removal = setTimeout(remove, SNACKBAR_DEFAULTS.ANIMATION_DURATION);
    };
    const close = (reason, originalEvent = null) => {
        if (api.state === 'queued') {
            api.state = 'hidden';
            if (entry)
                queue.remove(entry);
            return;
        }
        if (api.state !== 'visible')
            return;
        api.state = 'hidden';
        unlisten();
        component.timer?.stop();
        const active = activeElementOf(element);
        if (active && element.contains(active) && previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
            previouslyFocused.focus();
        }
        element.classList.remove(cls(SNACKBAR_CLASSES.VISIBLE));
        element.inert = true;
        element.setAttribute("aria-hidden", "true");
        scheduleRemoval();
        emit('close', { reason, originalEvent });
        emit('dismiss', { reason, originalEvent });
    };
    const open = () => {
        api.state = 'visible';
        element.inert = false;
        element.removeAttribute("aria-hidden");
        cancelRemoval();
        previouslyFocused = deepActiveElement();
        if (topLayer) {
            restore ??= placeInLayer(element, showOnTop);
            showOnTop();
        }
        else {
            element.ownerDocument.body.appendChild(element);
        }
        layout();
        void element.offsetHeight;
        element.classList.add(cls(SNACKBAR_CLASSES.VISIBLE));
        component.timer?.start();
        if (key && component.actionButton)
            element.ownerDocument.addEventListener('keydown', onShortcut);
        emit('open');
    };
    const api = {
        element,
        actionButton: component.actionButton,
        closeButton: component.closeButton,
        timer: component.timer,
        state: 'hidden',
        show() {
            if (api.state !== 'hidden')
                return this;
            api.state = 'queued';
            entry = {
                element,
                on: (event, handler) => component.on?.(event, handler),
                off: (event, handler) => component.off?.(event, handler),
                _show: open,
                _hide: () => close('queue'),
            };
            queue.add(entry, { behavior: config.queueBehavior });
            return this;
        },
        isOpen: () => api.state === 'visible',
        hide() {
            close('api');
            return this;
        },
        setMessage(text) {
            component.text?.setText(text);
            return this;
        },
        getMessage() {
            return component.text?.getText() || '';
        },
        setAction(text) {
            component.action?.setText(text);
            if (api.isOpen())
                layout();
            return this;
        },
        getAction() {
            return component.action?.getText() || '';
        },
        setDuration(duration) {
            component.timer?.setDuration(durationToMs(duration, Boolean(component.action)));
            if (api.isOpen())
                component.timer?.start();
            return this;
        },
        getDuration() {
            return component.timer?.getDuration() ?? 0;
        },
        setPosition(position) {
            component.position?.setPosition(position);
            return this;
        },
        getPosition() {
            return component.position?.getPosition() || 'center';
        },
        on(event, handler) {
            component.on?.(event, handler);
            return this;
        },
        off(event, handler) {
            component.off?.(event, handler);
            return this;
        },
        destroy() {
            if (entry)
                queue.remove(entry);
            api.state = 'hidden';
            unlisten();
            cancelRemoval();
            takeOff();
            element.remove();
            component.timer?.stop();
            component.action?.destroy();
            component.close?.destroy();
            lifecycle.destroy();
        },
    };
    component.on?.('timeout', () => close('timeout'));
    component.actionButton?.addEventListener('click', (event) => {
        emit('action', { originalEvent: event });
        close('action', event);
    });
    component.closeButton?.addEventListener('click', (event) => {
        close('close-button', event);
    });
    element.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !api.isOpen())
            return;
        event.stopPropagation();
        close('escape', event);
    });
    if (config.onOpen)
        api.on('open', config.onOpen);
    if (config.onClose)
        api.on('close', config.onClose);
    if (config.onAction)
        api.on('action', config.onAction);
    if (config.onFocus)
        api.on('focus', config.onFocus);
    if (config.on) {
        for (const [type, handler] of Object.entries(config.on)) {
            if (handler)
                api.on(type, handler);
        }
    }
    return api;
};
