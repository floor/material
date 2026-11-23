export const withAPI = (options) => (component) => {
    const searchComponent = {
        element: component.element,
        setValue(value, triggerEvent = false) {
            options.value.setValue(value, triggerEvent);
            return this;
        },
        getValue() {
            return options.value.getValue();
        },
        setPlaceholder(text) {
            options.value.setPlaceholder(text);
            return this;
        },
        getPlaceholder() {
            return options.value.getPlaceholder();
        },
        expand() {
            options.state.expand();
            return this;
        },
        collapse() {
            options.state.collapse();
            return this;
        },
        getState() {
            return options.state.getState();
        },
        isExpanded() {
            return options.state.isExpanded();
        },
        setViewMode(mode) {
            options.state.setViewMode(mode);
            return this;
        },
        getViewMode() {
            return options.state.getViewMode();
        },
        setVariant(variant) {
            options.state.setVariant(variant);
            return this;
        },
        getVariant() {
            return options.state.getVariant();
        },
        focus() {
            options.value.focus();
            return this;
        },
        blur() {
            options.value.blur();
            return this;
        },
        clear() {
            options.value.clear(false);
            return this;
        },
        submit() {
            options.value.submit();
            return this;
        },
        setLeadingIcon(iconHtml) {
            options.content.setLeadingIcon(iconHtml);
            return this;
        },
        addTrailingItem(item) {
            options.content.addTrailingItem(item);
            return this;
        },
        removeTrailingItem(id) {
            options.content.removeTrailingItem(id);
            return this;
        },
        setTrailingItems(items) {
            options.content.setTrailingItems(items);
            return this;
        },
        setSuggestions(suggestions) {
            options.suggestions.set(suggestions);
            options.suggestions.render();
            return this;
        },
        getSuggestions() {
            return options.suggestions.get();
        },
        clearSuggestions() {
            options.suggestions.clear();
            options.suggestions.render();
            return this;
        },
        enable() {
            options.disabled.enable();
            return this;
        },
        disable() {
            options.disabled.disable();
            return this;
        },
        isDisabled() {
            return options.disabled.isDisabled();
        },
        on(event, handler) {
            options.events.on(event, handler);
            return this;
        },
        off(event, handler) {
            options.events.off(event, handler);
            return this;
        },
        destroy() {
            options.state.collapse();
            if (options.lifecycle?.destroy) {
                options.lifecycle.destroy();
            }
        },
    };
    return searchComponent;
};
