import { PREFIX } from "../../core/config.js";
import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withLifecycle } from "../../core/compose/features/lifecycle.js";
import { createElementConfig } from "../../core/config/component.js";
import { createEmitter } from "../../core/state/emitter.js";
import { mountRailRipple } from "../../core/navigation/ripple.js";
import { createBaseConfig } from "./config.js";
import { setHTML } from "../../core/dom/html.js";
import { activeElementOf } from "../../core/dom/focus.js";
import { copyDestinations, createDestination, moveDestinationFocus, updateBadge as updateDestinationBadge, updateSelection as updateDestinations } from "../../core/navigation/destinations.js";
const copyItems = (items) => copyDestinations(items, 'NavigationRail');
export default function createNavigationRail(config = {}) {
    const options = createBaseConfig(config);
    let items = copyItems(options.items || []);
    const component = pipe(createBase, withElement(createElementConfig(options, { tag: options.layout === 'modal' ? 'dialog' : 'nav', attributes: { 'aria-label': options.ariaLabel || 'Primary navigation' } })), withLifecycle())(options);
    const root = component.element;
    const getClass = component.getClass;
    const cls = (part) => getClass(`navigation-rail${part}`);
    const emitter = createEmitter();
    let expanded = !!options.expanded;
    let destroyed = false;
    let switching = null;
    const SWITCH_DURATION = 450;
    const endSwitch = () => {
        if (switching !== null)
            clearTimeout(switching);
        switching = null;
        root.classList.remove(cls('--switching'));
    };
    const startSwitch = () => {
        endSwitch();
        root.classList.add(cls('--switching'));
        switching = setTimeout(endSwitch, SWITCH_DURATION);
    };
    let connectionObserver = null;
    const dialog = options.layout === 'modal' ? root : null;
    if (dialog)
        root.classList.add(cls('--modal'));
    if (options.hideWhenCollapsed)
        root.classList.add(cls('--hide-collapsed'));
    const nodes = new Map();
    const destinations = document.createElement('div');
    destinations.className = cls('__items');
    const header = document.createElement('div');
    header.className = cls('__header');
    let toggle = null;
    if (options.showToggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = cls('__toggle');
        header.append(toggle);
    }
    if (options.header)
        header.append(options.header);
    if (header.childElementCount)
        root.append(header);
    root.append(destinations);
    root.style.setProperty(`--${PREFIX}-navigation-rail-expanded-width`, `${options.expandedWidth}px`);
    const updateBadge = (item, element) => updateDestinationBadge(item, element, cls);
    const updateSelection = () => updateDestinations(items, nodes, cls);
    const render = () => {
        const focusedId = [...nodes].find(([, element]) => element === activeElementOf(destinations))?.[0];
        nodes.clear();
        destinations.replaceChildren();
        for (const item of items) {
            const element = createDestination(item, cls);
            nodes.set(item.id, element);
            destinations.append(element);
        }
        updateSelection();
        if (focusedId) {
            const previous = nodes.get(focusedId);
            const target = previous && !previous.hasAttribute('aria-disabled') ? previous : [...nodes.values()].find(element => !element.hasAttribute('aria-disabled')) || toggle;
            target?.focus();
        }
    };
    const showModal = () => {
        if (!dialog || destroyed || !expanded)
            return;
        if (root.isConnected) {
            connectionObserver?.disconnect();
            connectionObserver = null;
            if (!dialog.open)
                dialog.showModal();
        }
        else if (!connectionObserver) {
            connectionObserver = new MutationObserver(showModal);
            connectionObserver.observe(root.ownerDocument, { childList: true, subtree: true });
        }
    };
    const synchronize = () => {
        root.classList.toggle(cls('--expanded'), expanded);
        toggle?.setAttribute('aria-expanded', String(expanded));
        toggle?.setAttribute('aria-label', (expanded ? options.collapseLabel : options.expandLabel));
        if (toggle)
            setHTML(toggle, (expanded ? options.collapseIcon : options.expandIcon));
        if (dialog) {
            if (expanded)
                showModal();
            else {
                connectionObserver?.disconnect();
                connectionObserver = null;
                if (dialog.open)
                    dialog.close();
            }
        }
        else if (options.hideWhenCollapsed) {
            root.toggleAttribute('inert', !expanded);
            root.setAttribute('aria-hidden', String(!expanded));
        }
    };
    const setExpanded = (value) => {
        if (destroyed || expanded === value)
            return api;
        expanded = value;
        startSwitch();
        synchronize();
        emitter.emit(value ? 'expand' : 'collapse', { expanded: value });
        return api;
    };
    const handleClick = (event) => {
        if (destroyed || event.defaultPrevented)
            return;
        const target = event.target;
        if (dialog && target === root) {
            const rect = root.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
                api.collapse();
            return;
        }
        if (toggle?.contains(target)) {
            api.toggle();
            return;
        }
        const element = target.closest(`.${cls('__item')}`);
        if (!element || !destinations.contains(element))
            return;
        const index = items.findIndex(item => nodes.get(item.id) === element), item = items[index];
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
        moveDestinationFocus(event, nodes, destinations, { next: 'ArrowDown', previous: 'ArrowUp' });
    };
    const modalTab = (event) => {
        if (event.key !== 'Tab' || event.defaultPrevented)
            return;
        const focusable = [...root.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter(element => element.tabIndex >= 0 && !element.matches(':disabled, [aria-disabled="true"]') && element.getClientRects().length > 0);
        const first = focusable[0], last = focusable.at(-1), focused = activeElementOf(root);
        if (!first) {
            event.preventDefault();
            root.focus();
        }
        else if (event.shiftKey && (focused === first || focused === root)) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && (focused === last || focused === root)) {
            event.preventDefault();
            first.focus();
        }
    };
    dialog?.addEventListener('keydown', modalTab);
    const dismiss = (event) => { event.preventDefault(); api.collapse(); };
    dialog?.addEventListener('cancel', dismiss);
    const closed = () => {
        if (!dialog?.open)
            api.collapse();
    };
    dialog?.addEventListener('close', closed);
    root.addEventListener('click', handleClick);
    destinations.addEventListener('keydown', handleKeydown);
    const removeRipple = options.ripple ? mountRailRipple(root, cls) : undefined;
    const originalDestroy = component.lifecycle.destroy.bind(component.lifecycle);
    const destroy = () => {
        if (destroyed)
            return;
        destroyed = true;
        endSwitch();
        connectionObserver?.disconnect();
        connectionObserver = null;
        dialog?.removeEventListener('keydown', modalTab);
        dialog?.removeEventListener('cancel', dismiss);
        dialog?.removeEventListener('close', closed);
        if (dialog?.open)
            dialog.close();
        root.removeEventListener('click', handleClick);
        destinations.removeEventListener('keydown', handleKeydown);
        removeRipple?.();
        nodes.clear();
        emitter.clear();
        originalDestroy();
    };
    component.lifecycle.destroy = destroy;
    const api = {
        element: root, getClass, lifecycle: component.lifecycle, destroy,
        expand: () => setExpanded(true), collapse: () => setExpanded(false), toggle: () => setExpanded(!expanded), isExpanded: () => expanded,
        getValue: () => api.getActive(),
        getActive: () => items.find(item => item.active)?.id || null,
        setActive(id) {
            if (destroyed || (id !== null && !items.some(item => item.id === id && !item.disabled)))
                return api;
            items = items.map(item => ({ ...item, active: item.id === id }));
            updateSelection();
            return api;
        },
        getItems: () => items.map(item => ({ ...item })),
        setItems(value) {
            if (!destroyed) {
                const next = copyItems(value);
                items = next;
                render();
            }
            return api;
        },
        setBadge(id, badge, label) {
            if (destroyed)
                return api;
            const item = items.find(item => item.id === id);
            if (item) {
                item.badge = badge;
                item.badgeLabel = label;
                updateBadge(item, nodes.get(id));
            }
            return api;
        },
        on(event, handler) {
            if (!destroyed)
                emitter.on(event, handler);
            return api;
        },
        off(event, handler) { emitter.off(event, handler); return api; },
    };
    render();
    synchronize();
    if (options.onSelect)
        api.on('select', options.onSelect);
    if (options.onExpand)
        api.on('expand', options.onExpand);
    if (options.onCollapse)
        api.on('collapse', options.onCollapse);
    return api;
}
