import { getCleanup } from "../cleanup.js";
import { createEmitter } from "../../state/emitter.js";
function hasEvents(component) {
    return 'events' in component &&
        typeof component.events === 'object' &&
        component.events !== null &&
        'destroy' in component.events &&
        typeof component.events.destroy === 'function';
}
function hasText(component) {
    return 'text' in component &&
        typeof component.text === 'object' &&
        component.text !== null &&
        'getElement' in component.text &&
        typeof component.text.getElement === 'function';
}
function hasIcon(component) {
    return 'icon' in component &&
        typeof component.icon === 'object' &&
        component.icon !== null &&
        'getElement' in component.icon &&
        typeof component.icon.getElement === 'function';
}
export const withLifecycle = () => (component) => {
    const resources = getCleanup(component);
    let mounted = false;
    let destroyed = false;
    const destroyElement = component.destroy?.bind(component);
    const emitter = createEmitter();
    resources.add(() => emitter.clear());
    const unmount = () => {
        if (mounted) {
            mounted = false;
            emitter.emit('unmount');
            emitter.clear();
        }
    };
    const lifecycle = {
        onMount: (handler) => emitter.on('mount', handler),
        onUnmount: (handler) => emitter.on('unmount', handler),
        mount: () => {
            if (!mounted && !destroyed) {
                mounted = true;
                emitter.emit('mount');
            }
        },
        unmount,
        isMounted: () => mounted,
        destroy: () => {
            if (destroyed)
                return;
            destroyed = true;
            unmount();
            emitter.clear();
            resources.destroy();
            if (hasEvents(component)) {
                component.events.destroy();
            }
            if (hasText(component)) {
                const textElement = component.text.getElement();
                if (textElement) {
                    textElement.remove();
                }
            }
            if (hasIcon(component)) {
                const iconElement = component.icon.getElement();
                if (iconElement) {
                    iconElement.remove();
                }
            }
            if (destroyElement)
                destroyElement();
            else
                component.element?.remove();
        }
    };
    return {
        ...component,
        lifecycle
    };
};
