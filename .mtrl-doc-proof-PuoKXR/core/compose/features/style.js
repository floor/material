export const withStyle = (config = {}) => (component) => {
    if (config.variant) {
        component.element.classList.add(`${component.getClass('button')}--${config.variant}`);
    }
    if (config.size) {
        component.element.classList.add(`${component.getClass('button')}--${config.size}`);
    }
    return component;
};
