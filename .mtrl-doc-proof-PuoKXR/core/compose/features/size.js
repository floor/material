export const withSize = (config) => (component) => {
    if (config.size && component.element) {
        const className = `${config.prefix}-${config.componentName}--${config.size}`;
        component.element.classList.add(className);
    }
    return component;
};
