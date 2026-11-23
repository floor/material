import { PREFIX } from "../../core/config.js";
import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withLifecycle } from "../../core/compose/features/lifecycle.js";
import { createElementConfig } from "../../core/config/component.js";
import { createEmitter } from "../../core/state/emitter.js";
import { activeElementOf } from "../../core/dom/focus.js";
import { mountRailRipple } from "../../core/navigation/ripple.js";
import { copyDestinations, createDestination, moveDestinationFocus, updateBadge, updateSelection, } from "../../core/navigation/destinations.js";
import { createBaseConfig } from "./config.js";
const SCROLL_THRESHOLD = 10;
export default function createNavigationBar(config = {}) {
    const options = createBaseConfig(config);
    let items = copyDestinations(options.items || [], 'NavigationBar');
    const component = pipe(createBase, withElement(createElementConfig(options, { tag: 'nav', attributes: { 'aria-label': options.ariaLabel || 'Primary navigation' } })), withLifecycle())(options);
    const root = component.element;
    const getClass = component.getClass;
    const cls = (part) => getClass(`navigation-bar${part}`);
    const emitter = createEmitter();
    let destroyed = false;
    let hidden = false;
    root.classList.add(options.itemLayout === 'vertical' ? cls('--vertical') : options.itemLayout === 'horizontal' ? cls('--horizontal') : cls('--auto'));
    const nodes = new Map();
    const destinations = document.createElement('div');
    destinations.className = cls('__items');
    root.append(destinations);
    const render = () => {
        const focusedId = [...nodes].find(([, element]) => element === activeElementOf(destinations))?.[0];
        nodes.clear();
        destinations.replaceChildren();
        for (const item of items) {
            const element = createDestination(item, cls);
            nodes.set(item.id, element);
            destinations.append(element);
        }
        updateSelection(items, nodes, cls);
        root.style.setProperty(`--${PREFIX}-navigation-bar-count`, String(items.length));
        if (focusedId) {
            const previous = nodes.get(focusedId);
            const target = previous && !previous.hasAttribute('aria-disabled') ? previous : [...nodes.values()].find((element) => !element.hasAttribute('aria-disabled'));
            target?.focus();
        }
    };
    const setHidden = (value) => {
        if (destroyed || hidden === value)
            return;
        hidden = value;
        root.classList.toggle(cls('--hidden'), value);
        emitter.emit('visibility', { hidden: value });
    };
    const handleClick = (event) => {
        if (destroyed || event.defaultPrevented)
            return;
        const element = event.target.closest(`.${cls('__item')}`);
        if (!element || !destinations.contains(element))
            return;
        const index = items.findIndex((item) => nodes.get(item.id) === element), item = items[index];
        if (!item || item.disabled) {
            event.preventDefault();
            return;
        }
        if (item.href && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0))
            return;
        api.setActive(item.id);
        const detail = { id: item.id, value: item.id, index, originalEvent: event };
        emitter.emit('select', detail);
    };
    const handleKeydown = (event) => {
        const rtl = getComputedStyle(root).direction === 'rtl';
        moveDestinationFocus(event, nodes, destinations, rtl ? { next: 'ArrowLeft', previous: 'ArrowRight' } : { next: 'ArrowRight', previous: 'ArrowLeft' });
    };
    const handleFocus = () => setHidden(false);
    const scrollOption = options.hideOnScroll;
    const scrollTarget = scrollOption
        ? (typeof scrollOption === 'object' && scrollOption.target) || window
        : null;
    let lastScroll = null;
    const scrollPosition = () => (scrollTarget === window ? window.scrollY : scrollTarget.scrollTop);
    const handleScroll = () => {
        const current = scrollPosition();
        if (lastScroll === null) {
            lastScroll = current;
            return;
        }
        if (current > lastScroll + SCROLL_THRESHOLD)
            setHidden(true);
        else if (current < lastScroll - SCROLL_THRESHOLD)
            setHidden(false);
        else
            return;
        lastScroll = current;
    };
    root.addEventListener('click', handleClick);
    destinations.addEventListener('keydown', handleKeydown);
    root.addEventListener('focusin', handleFocus);
    scrollTarget?.addEventListener('scroll', handleScroll, { passive: true });
    const removeRipple = options.ripple ? mountRailRipple(root, cls) : undefined;
    const originalDestroy = component.lifecycle.destroy.bind(component.lifecycle);
    const destroy = () => {
        if (destroyed)
            return;
        destroyed = true;
        root.removeEventListener('click', handleClick);
        destinations.removeEventListener('keydown', handleKeydown);
        root.removeEventListener('focusin', handleFocus);
        scrollTarget?.removeEventListener('scroll', handleScroll);
        removeRipple?.();
        nodes.clear();
        emitter.clear();
        originalDestroy();
    };
    component.lifecycle.destroy = destroy;
    const api = {
        element: root, getClass, lifecycle: component.lifecycle, destroy,
        getActive: () => items.find((item) => item.active)?.id || null,
        getValue: () => api.getActive(),
        setActive(id) {
            if (destroyed || (id !== null && !items.some((item) => item.id === id && !item.disabled)))
                return api;
            items = items.map((item) => ({ ...item, active: item.id === id }));
            updateSelection(items, nodes, cls);
            return api;
        },
        getItems: () => items.map((item) => ({ ...item })),
        setItems(value) {
            if (!destroyed) {
                items = copyDestinations(value, 'NavigationBar');
                render();
            }
            return api;
        },
        setBadge(id, badge, label) {
            if (destroyed)
                return api;
            const item = items.find((entry) => entry.id === id);
            if (item) {
                item.badge = badge;
                item.badgeLabel = label;
                updateBadge(item, nodes.get(id), cls);
            }
            return api;
        },
        hide: () => { setHidden(true); return api; },
        show: () => { setHidden(false); return api; },
        isHidden: () => hidden,
        on(event, handler) {
            if (!destroyed)
                emitter.on(event, handler);
            return api;
        },
        off(event, handler) { emitter.off(event, handler); return api; },
    };
    render();
    if (options.onSelect)
        api.on('select', options.onSelect);
    return api;
}
