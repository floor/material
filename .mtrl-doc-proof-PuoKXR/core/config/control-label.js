export function controlLabelConfig(wrapper, controlOnly) {
    if (controlOnly)
        wrapper.ariaLabel = undefined;
    return wrapper;
}
