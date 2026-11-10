import { PREFIX } from "../../core/config";
import { pipe } from '../../core/compose/pipe';
import { createBase, withElement } from '../../core/compose/component';
import { withLifecycle } from '../../core/compose/features/lifecycle';
import { createElementConfig } from '../../core/config/component';
import { createEmitter } from '../../core/state/emitter';
import { mountRailRipple } from '../../core/navigation/ripple';
import { createBaseConfig } from './config';
import type { NavigationRailConfig, NavigationRailComponent } from './types';
import { setHTML } from "../../core/dom/html";
import { activeElementOf } from "../../core/dom/focus";
import { moveDestinationFocus } from '../../core/navigation/destinations';
import { createDestinationCollection } from '../../core/navigation/collection';
/**
 * Creates an M3 Expressive navigation rail with stable destinations during expansion.
 * Import its styles separately with `material/styles/navigation-rail`.
 * Links retain native browser navigation; onSelect can preventDefault for a router.
 */
export default function createNavigationRail(config: NavigationRailConfig = {}): NavigationRailComponent {
    const options = createBaseConfig(config);
    const component = pipe(createBase, withElement(createElementConfig(options, { tag: options.layout === 'modal' ? 'dialog' : 'nav', attributes: { 'aria-label': options.ariaLabel || 'Primary navigation' } })), withLifecycle())(options);
    const root: HTMLElement = component.element;
    const getClass: (name: string) => string = component.getClass;
    const cls = (part: string): string => getClass(`navigation-rail${part}`);
    const emitter = createEmitter();
    let expanded = !!options.expanded;
    let destroyed = false;
    // While the rail changes width the label and badge fade out and back in
    // (the swap keyframes); the class lives for the spring's duration.
    let switching: ReturnType<typeof setTimeout> | null = null;
    const SWITCH_DURATION = 450;
    const endSwitch = (): void => {
        if (switching !== null) clearTimeout(switching);
        switching = null;
        root.classList.remove(cls('--switching'));
    };
    const startSwitch = (): void => {
        endSwitch();
        root.classList.add(cls('--switching'));
        switching = setTimeout(endSwitch, SWITCH_DURATION);
    };
    let connectionObserver: MutationObserver | null = null;
    const dialog = options.layout === 'modal' ? root as HTMLDialogElement : null;
    if (dialog)
        root.classList.add(cls('--modal'));
    if (options.hideWhenCollapsed)
        root.classList.add(cls('--hide-collapsed'));
    const collection = createDestinationCollection({
        cls, name: 'NavigationRail', items: options.items || [],
        // With no enabled destination left, the rail falls back to its toggle; the bar has none.
        fallbackFocus: () => toggle,
    });
    const header = document.createElement('div');
    header.className = cls('__header');
    let toggle: HTMLButtonElement | null = null;
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
    const destinations = collection.container;
    root.append(destinations);
    root.style.setProperty(`--${PREFIX}-navigation-rail-expanded-width`, `${options.expandedWidth}px`);
    const showModal = (): void => {
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
    const synchronize = (): void => {
        root.classList.toggle(cls('--expanded'), expanded);
        toggle?.setAttribute('aria-expanded', String(expanded));
        toggle?.setAttribute('aria-label', (expanded ? options.collapseLabel : options.expandLabel)!);
        if (toggle)
            setHTML(toggle, (expanded ? options.collapseIcon : options.expandIcon)!);
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
    const setExpanded = (value: boolean): NavigationRailComponent => {
        if (destroyed || expanded === value)
            return api;
        expanded = value;
        startSwitch();
        synchronize();
        emitter.emit(value ? 'expand' : 'collapse', { expanded: value });
        return api;
    };
    const handleClick = (event: MouseEvent): void => {
        if (destroyed || event.defaultPrevented)
            return;
        const target = event.target as Element;
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
        // `value`: the id, as the <m-navigation-rail> element's `change` carries it.
        const detail = collection.selectDetail(event);
        if (!detail)
            return;
        collection.setActive(detail.id);
        emitter.emit('select', detail);
    };
    const handleKeydown = (event: KeyboardEvent): void => {
        moveDestinationFocus(event, collection.nodes, destinations, { next: 'ArrowDown', previous: 'ArrowUp' });
    };
    const modalTab = (event: KeyboardEvent): void => {
        if (event.key !== 'Tab' || event.defaultPrevented)
            return;
        const focusable = [...root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')].filter(element => element.tabIndex >= 0 && !element.matches(':disabled, [aria-disabled="true"]') && element.getClientRects().length > 0);
        const first = focusable[0], last = focusable.at(-1), focused = activeElementOf(root);
        if (!first) {
            event.preventDefault();
            root.focus();
        }
        else if (event.shiftKey && (focused === first || focused === root)) {
            event.preventDefault();
            last!.focus();
        }
        else if (!event.shiftKey && (focused === last || focused === root)) {
            event.preventDefault();
            first.focus();
        }
    };
    dialog?.addEventListener('keydown', modalTab);
    const dismiss = (event: Event): void => { event.preventDefault(); api.collapse(); };
    dialog?.addEventListener('cancel', dismiss);
    const closed = (): void => { if (!dialog?.open)
        api.collapse(); };
    dialog?.addEventListener('close', closed);
    root.addEventListener('click', handleClick);
    destinations.addEventListener('keydown', handleKeydown);
    const removeRipple = options.ripple ? mountRailRipple(root, cls) : undefined;
    const originalDestroy = component.lifecycle.destroy.bind(component.lifecycle);
    const destroy = (): void => {
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
        collection.destroy();
        emitter.clear();
        originalDestroy();
    };
    component.lifecycle.destroy = destroy;
    const api: NavigationRailComponent = {
        element: root, getClass, lifecycle: component.lifecycle, destroy,
        expand: () => setExpanded(true), collapse: () => setExpanded(false), toggle: () => setExpanded(!expanded), isExpanded: () => expanded,
        getValue: () => api.getActive(),
        getActive: () => collection.activeId(),
        setActive(id) {
            collection.setActive(id);
            return api;
        },
        getItems: () => collection.snapshot(),
        setItems(value) {
            collection.replace(value);
            return api;
        },
        setBadge(id, badge, label) {
            collection.setBadge(id, badge, label);
            return api;
        },
        on(event, handler) { if (!destroyed)
            emitter.on(event, handler); return api; },
        off(event, handler) { emitter.off(event, handler); return api; },
    };
    collection.render();
    synchronize();
    // A config option is the listener registered at creation, ahead of any
    // listener the caller adds afterwards. A listener that destroys the rail
    // during emit no longer skips it: it has already run.
    if (options.onSelect) api.on('select', options.onSelect);
    if (options.onExpand) api.on('expand', options.onExpand);
    if (options.onCollapse) api.on('collapse', options.onCollapse);
    return api;
}
