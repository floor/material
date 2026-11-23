export function hasLifecycle(component) {
    return 'lifecycle' in component &&
        typeof component.lifecycle === 'object' &&
        component.lifecycle !== null &&
        'destroy' in component.lifecycle &&
        typeof component.lifecycle.destroy === 'function';
}
export function hasEmit(component) {
    return 'emit' in component && typeof component.emit === 'function';
}
