export const withVariant = (config) => (component) => {
    if (config.variant && component.element) {
        const className = `${config.prefix}-${config.componentName}--${config.variant}`;
        component.element.classList.add(className);
    }
    return component;
};
